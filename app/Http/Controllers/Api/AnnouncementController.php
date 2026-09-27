<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Services\AuditLogger;
use App\Services\NotificationGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = Announcement::query()
            ->when($request->user(), fn ($query, $user) => $query->visibleToUser($user))
            ->when($request->type, fn ($query, $type) => $query->where('type', $type))
            ->when($request->search, fn ($query, $search) => $query->where('title', 'like', "%{$search}%"))
            ->latest();

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request, NotificationGateway $gateway, AuditLogger $audit)
    {
        $data = $this->validated($request);
        if ($request->hasFile('photo')) {
            $data['image_path'] = $request->file('photo')->store('announcements', 'public');
        }
        $data['created_by'] = $request->user()->id;
        $announcement = Announcement::create($data);
        $deliveries = $gateway->dispatchAnnouncement($announcement);
        $audit->log($request, 'announcement.created', $announcement);

        return response()->json(['announcement' => $announcement->fresh(), 'deliveries' => $deliveries], 201);
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }

    public function update(Request $request, Announcement $announcement, NotificationGateway $gateway, AuditLogger $audit)
    {
        $old = $announcement->toArray();
        $data = $this->validated($request, true);
        if ($request->hasFile('photo')) {
            if ($announcement->image_path) {
                Storage::disk('public')->delete($announcement->image_path);
            }
            $data['image_path'] = $request->file('photo')->store('announcements', 'public');
        }
        $announcement->update($data);
        $deliveries = ($announcement->send_push || $announcement->publish_to_facebook)
            ? $gateway->dispatchAnnouncement($announcement)
            : [];
        $audit->log($request, 'announcement.updated', $announcement, $old, $announcement->fresh()->toArray());

        return response()->json(['announcement' => $announcement->fresh(), 'deliveries' => $deliveries]);
    }

    public function destroy(Request $request, Announcement $announcement, AuditLogger $audit)
    {
        if ($announcement->image_path) {
            Storage::disk('public')->delete($announcement->image_path);
        }
        $announcement->delete();
        $audit->log($request, 'announcement.deleted', $announcement);

        return response()->json(['message' => 'Announcement deleted.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'type' => ['sometimes', 'in:bulletin,advisory,distribution_schedule,assistance_update,insurance_update,pest,disease,calamity,compliance_requirements,other_purpose'],
            'title' => [$required, 'string', 'max:180'],
            'body' => [$required, 'string'],
            'photo' => ['nullable', 'image', 'max:4096'],
            'publish_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'target_sectors' => ['nullable', 'array'],
            'target_barangays' => ['nullable', 'array'],
            'target_registrant_id' => ['nullable', 'exists:registrants,id'],
            'send_push' => ['sometimes', 'boolean'],
            'publish_to_facebook' => ['sometimes', 'boolean'],
        ]);
    }

}
