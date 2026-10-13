<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementComment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\AuditLogger;

class AnnouncementCommentController extends Controller
{
    public function index(Request $request, Announcement $announcement)
    {
        $comments = $announcement->comments()
            ->whereNull('parent_id')
            ->with('replies')
            ->latest()
            ->get();

        $serialize = function ($comment) use ($request, &$serialize) {
            $staff = $request->user()?->hasRole(['super_admin', 'mao_staff']) ?? false;
            $blocked = $comment->hidden_at || $comment->removed_at;
            return [
                'id' => $comment->id, 'author_name' => $comment->author_name,
                'body' => $blocked ? ($comment->removed_at ? 'Comment deleted by its author.' : 'Comment hidden by staff.') : $comment->body,
                'created_at' => $comment->created_at, 'likes_count' => $comment->likes_count,
                'dislikes_count' => $comment->dislikes_count,
                'official' => in_array($comment->author_role, ['super_admin', 'mao_staff'], true),
                'hidden' => (bool) $comment->hidden_at, 'removed' => (bool) $comment->removed_at,
                'can_edit' => ! $blocked && $request->user() && $comment->user_id === $request->user()->id,
                'can_moderate' => $staff && ! $comment->removed_at,
                'replies' => $comment->replies->map($serialize)->values(),
            ];
        };
        return response()->json(['data' => $comments->map($serialize)]);
    }

    public function store(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'author_name' => ['required', 'string', 'max:80'],
            'body' => ['required', 'string', 'max:1000'],
            'parent_id' => [
                'nullable',
                Rule::exists('announcement_comments', 'id')->where('announcement_id', $announcement->id),
            ],
        ]);

        if (! empty($data['parent_id'])) {
            $parent = AnnouncementComment::query()
                ->where('announcement_id', $announcement->id)
                ->findOrFail($data['parent_id']);

            $data['parent_id'] = $parent->parent_id ?: $parent->id;
        }

        $comment = $announcement->comments()->create($data);
        if ($request->user()) {
            $comment->forceFill(['user_id' => $request->user()->id, 'author_role' => $request->user()->role,
                'author_name' => $request->user()->name])->save();
        }

        return response()->json(['id' => $comment->id, 'message' => 'Comment posted.'], 201);
    }

    public function react(Request $request, Announcement $announcement, AnnouncementComment $comment)
    {
        abort_unless($comment->announcement_id === $announcement->id, 404);
        abort_if($comment->hidden_at || $comment->removed_at, 422, 'This comment is unavailable.');

        $data = $request->validate([
            'reaction' => ['required', 'in:like,dislike'],
        ]);

        $column = $data['reaction'] === 'like' ? 'likes_count' : 'dislikes_count';
        $comment->increment($column);

        return response()->json(['message' => 'Reaction recorded.']);
    }

    public function manage(Request $request, Announcement $announcement, AnnouncementComment $comment, AuditLogger $audit)
    {
        abort_unless($comment->announcement_id === $announcement->id, 404);
        $data = $request->validate([
            'action' => ['required', 'in:edit,delete,hide,restore,report'],
            'body' => ['required_if:action,edit', 'nullable', 'string', 'max:1000'],
            'reason' => ['required_if:action,hide,report', 'nullable', 'string', 'max:1000'],
        ]);
        $action = $data['action'];
        if (in_array($action, ['edit', 'delete'])) {
            abort_unless($comment->user_id === $request->user()->id, 403);
            abort_if($comment->hidden_at || $comment->removed_at, 422, 'This comment is unavailable.');
            if ($action === 'edit') abort_if(trim($data['body']) === '', 422, 'Comment cannot be blank.');
            $comment->forceFill($action === 'edit' ? ['body' => trim($data['body'])] : ['removed_at' => now()])->save();
        } elseif (in_array($action, ['hide', 'restore'])) {
            abort_unless($request->user()->hasRole(['super_admin', 'mao_staff']), 403);
            abort_if($comment->removed_at, 422);
            if ($action === 'hide') abort_if(trim($data['reason']) === '', 422, 'A reason is required.');
            $comment->forceFill(['hidden_at' => $action === 'hide' ? now() : null])->save();
        } else {
            abort_if(trim($data['reason']) === '', 422, 'A reason is required.');
        }
        $audit->log($request, 'announcement.comment.'.$action, $comment, [], ['reason' => $data['reason'] ?? null]);
        return response()->json(['message' => $action === 'report' ? 'Report recorded for staff review.' : 'Comment updated.']);
    }
}
