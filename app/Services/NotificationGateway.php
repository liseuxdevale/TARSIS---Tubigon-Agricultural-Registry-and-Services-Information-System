<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\NotificationDelivery;
use App\Models\Registrant;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Throwable;

class NotificationGateway
{
    public function dispatchAnnouncement(Announcement $announcement): array
    {
        $recipients = Registrant::query()
            ->when($announcement->target_registrant_id, fn ($query) => $query->where('id', $announcement->target_registrant_id))
            ->when($announcement->target_sectors, fn ($query) => $query->whereIn('sector', $announcement->target_sectors))
            ->when($announcement->target_barangays, fn ($query) => $query->whereIn('barangay_id', $announcement->target_barangays))
            ->where('status', 'approved')
            ->limit(250)
            ->get();

        $sent = [];
        foreach ($recipients as $registrant) {
            if ($announcement->send_push) {
                $sent[] = $this->sendPush($announcement, $registrant);
            }
        }

        if ($announcement->send_push) {
            foreach ($this->accountRecipients($announcement, $recipients) as $user) {
                $sent[] = $this->sendPushToUser($announcement, $user);
            }
        }

        if ($announcement->publish_to_facebook) {
            $this->postToFacebook($announcement);
        }

        return $sent;
    }

    public function sendPush(Announcement $announcement, Registrant $registrant): NotificationDelivery
    {
        return $this->record('push', $announcement, $registrant, null, $registrant->registry_number, fn () => $this->sendPushPayload($announcement));
    }

    public function sendPushToUser(Announcement $announcement, User $user): NotificationDelivery
    {
        return $this->record('push', $announcement, null, $user, $user->email, fn () => $this->sendPushPayload($announcement));
    }

    public function resend(NotificationDelivery $delivery): NotificationDelivery
    {
        $announcement = $delivery->announcement;
        $registrant = $delivery->registrant;

        if (! $announcement || (! $registrant && ! $delivery->user)) {
            $delivery->update([
                'status' => 'failed',
                'provider_response' => ['error' => 'Missing announcement or recipient record.'],
                'sent_at' => null,
            ]);

            return $delivery->fresh(['announcement', 'registrant']);
        }

        try {
            $response = $this->sendPushPayload($announcement);
            $status = ($response['sent'] ?? false) ? 'sent' : 'failed';
        } catch (Throwable $exception) {
            $response = ['error' => $exception->getMessage()];
            $status = 'failed';
        }

        $delivery->update([
            'status' => $status,
            'message' => $announcement->title,
            'provider_response' => $response,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);

        return $delivery->fresh(['announcement', 'registrant']);
    }

    public function postToFacebook(Announcement $announcement): void
    {
        $pageId = config('services.facebook.page_id');
        $token = config('services.facebook.page_token');

        if (! $pageId || ! $token) {
            $announcement->update(['facebook_post_id' => 'not-configured']);
            return;
        }

        try {
            $response = Http::asForm()->post("https://graph.facebook.com/v20.0/{$pageId}/feed", [
                'message' => "{$announcement->title}\n\n{$announcement->body}",
                'access_token' => $token,
            ])->json();

            $announcement->update(['facebook_post_id' => $response['id'] ?? 'posted']);
        } catch (Throwable) {
            $announcement->update(['facebook_post_id' => 'failed']);
        }
    }

    private function record(string $channel, Announcement $announcement, ?Registrant $registrant, ?User $user, ?string $recipient, callable $sender): NotificationDelivery
    {
        try {
            $response = $sender();
            $status = ($response['sent'] ?? false) ? 'sent' : 'failed';
        } catch (Throwable $exception) {
            $response = ['error' => $exception->getMessage()];
            $status = 'failed';
        }

        return NotificationDelivery::create([
            'announcement_id' => $announcement->id,
            'registrant_id' => $registrant?->id,
            'user_id' => $user?->id,
            'channel' => $channel,
            'recipient' => $recipient,
            'status' => $status,
            'message' => $announcement->title,
            'provider_response' => $response,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);
    }

    private function accountRecipients(Announcement $announcement, $registrants)
    {
        $registrantEmails = $registrants
            ->pluck('email')
            ->filter()
            ->map(fn ($email) => strtolower($email))
            ->unique();
        $targetSectors = collect($announcement->target_sectors ?? [])->filter()->values();
        $targetBarangays = collect($announcement->target_barangays ?? [])->map(fn ($id) => (int) $id)->filter()->values();

        return User::query()
            ->with('barangays:id')
            ->where('status', 'active')
            ->whereNotNull('email')
            ->get()
            ->filter(function (User $user) use ($announcement, $registrantEmails, $targetSectors, $targetBarangays) {
                if ($registrantEmails->contains(strtolower($user->email))) {
                    return false;
                }

                if ($announcement->target_registrant_id) {
                    return false;
                }

                if ($targetSectors->isEmpty() && $targetBarangays->isEmpty()) {
                    return true;
                }

                return $this->userMatchesAnnouncementTargets($user, $targetSectors, $targetBarangays);
            })
            ->values();
    }

    private function userMatchesAnnouncementTargets(User $user, $targetSectors, $targetBarangays): bool
    {
        if ($targetSectors->isNotEmpty()) {
            $roleSector = Announcement::sectorForRole($user->role);
            $registrantSector = $user->registrant?->sector;

            if (! $targetSectors->contains($roleSector) && ! $targetSectors->contains($registrantSector)) {
                return false;
            }
        }

        if ($targetBarangays->isNotEmpty()) {
            $barangayIds = $user->role === 'barangay_technical_staff'
                ? $user->assignedBarangayIds()
                : collect([$user->barangay_id, $user->registrant?->barangay_id])
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->all();

            if ($targetBarangays->intersect($barangayIds)->isEmpty()) {
                return false;
            }
        }

        return true;
    }

    private function sendPushPayload(Announcement $announcement): array
    {
        $endpoint = config('services.firebase.endpoint');
        $serverKey = config('services.firebase.server_key');

        if (! $endpoint || ! $serverKey) {
            return [
                'sent' => true,
                'mode' => 'local',
                'reason' => 'Push provider is not configured; notification was recorded locally.',
            ];
        }

        $response = Http::withToken((string) $serverKey)->post($endpoint, [
            'notification' => ['title' => $announcement->title, 'body' => $announcement->body],
            'topic' => 'tarsis',
        ]);

        return [
            'sent' => $response->successful(),
            'status' => $response->status(),
            'body' => $response->json(),
        ];
    }
}
