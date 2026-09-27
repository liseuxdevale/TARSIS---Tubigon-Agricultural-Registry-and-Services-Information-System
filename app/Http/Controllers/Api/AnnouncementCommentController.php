<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementComment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementCommentController extends Controller
{
    public function index(Announcement $announcement)
    {
        $comments = $announcement->comments()
            ->whereNull('parent_id')
            ->with('replies')
            ->latest()
            ->get();

        return response()->json(['data' => $comments]);
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

        return response()->json($comment->load('replies'), 201);
    }

    public function react(Request $request, Announcement $announcement, AnnouncementComment $comment)
    {
        abort_unless($comment->announcement_id === $announcement->id, 404);

        $data = $request->validate([
            'reaction' => ['required', 'in:like,dislike'],
        ]);

        $column = $data['reaction'] === 'like' ? 'likes_count' : 'dislikes_count';
        $comment->increment($column);

        return response()->json($comment->fresh('replies'));
    }
}
