<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\NotificationDelivery;
use App\Models\Registrant;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class NotificationDeliveryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $sector = $this->sectorForRole($request->user()?->role);
        $isNotificationManager = $user?->hasRole(['super_admin', 'mao_staff', 'crop_head', 'fish_head', 'livestock_head', 'poultry_head']);
        // The personal bell is an inbox, not the staff delivery-management history.
        $personalInbox = $request->boolean('inbox') || ! $isNotificationManager;
        $query = NotificationDelivery::query()
            ->with(['announcement:id,type,title,body,target_registrant_id', 'registrant:id,registry_number,first_name,middle_name,last_name,suffix', 'user:id,name,email,role'])
            ->when(! $personalInbox && $sector, fn ($query) => $query->where(function ($query) use ($sector, $user) {
                $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector))
                    ->orWhere('user_id', $user?->id);
            }))
            ->when(! $personalInbox && $sector, fn ($query) => $query->where(fn ($query) => $query->whereNull('announcement_id')->orWhereHas('announcement', fn ($announcement) => $announcement->visibleToUser($user))))
            ->when($personalInbox, fn ($query) => $query->where(function ($query) use ($user) {
                $query->where('user_id', $user?->id)
                    ->orWhere(fn ($unlinked) => $unlinked->whereNull('user_id')->whereHas('registrant', fn ($registrant) => $registrant
                        ->whereNotNull('email')
                        ->whereRaw('LOWER(email) = ?', [strtolower($user?->email ?? '')])));
            }))
            ->when($request->channel, fn ($query, $channel) => $query->where('channel', $channel))
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->latest();

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['distribution_schedule', 'compliance_requirements', 'insurance_update', 'assistance_update', 'other_purpose'])],
            'target_registrant_id' => ['required_without:target_registrant_ids', 'integer', 'exists:registrants,id'],
            'target_registrant_ids' => ['required_without:target_registrant_id', 'array', 'min:1', 'max:250'],
            'target_registrant_ids.*' => ['required', 'integer', 'distinct', 'exists:registrants,id'],
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string'],
        ]);

        $ids = $data['target_registrant_ids'] ?? [$data['target_registrant_id']];
        $registrants = Registrant::whereIn('id', $ids)->get();
        $sector = $this->sectorForRole($request->user()?->role);
        if ($sector) {
            abort_if($registrants->contains(fn ($registrant) => $registrant->sector !== $sector), 403, 'Forbidden.');
        }
        abort_if($registrants->contains(fn ($registrant) => $registrant->status !== 'approved'), 422, 'Select approved registrants only.');

        $deliveries = DB::transaction(function () use ($registrants, $data, $request, $audit) {
            return $registrants->map(function ($registrant) use ($data, $request, $audit) {
                $delivery = NotificationDelivery::create([
                    'registrant_id' => $registrant->id,
                    'user_id' => $this->userIdForRegistrant($registrant),
                    'channel' => 'push',
                    'recipient' => $registrant->registry_number,
                    'status' => 'sent',
                    'message' => $data['title'],
                    'provider_response' => [
                        'sent' => true,
                        'mode' => 'local',
                        'type' => $data['type'],
                        'body' => $data['body'],
                        'reason' => 'Direct beneficiary notification recorded locally.',
                    ],
                    'sent_at' => now(),
                ]);

                $audit->log($request, 'notification.created', $delivery);

                return $delivery->fresh(['announcement', 'registrant', 'user']);
            });
        });

        return response()->json(['message' => 'Notification sent.', 'delivery' => $deliveries->first(), 'deliveries' => $deliveries], 201);
    }

    public function update(Request $request, NotificationDelivery $notificationDelivery, AuditLogger $audit)
    {
        $this->authorizeSectorScope($request, $notificationDelivery);
        $data = $request->validate([
            'type' => ['required', 'in:distribution_schedule,compliance_requirements,insurance_update,assistance_update,other_purpose'],
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string'],
        ]);

        $announcement = $notificationDelivery->announcement;
        if (! $announcement) {
            $old = $notificationDelivery->toArray();
            $notificationDelivery->update([
                'message' => $data['title'],
                'provider_response' => array_merge($notificationDelivery->provider_response ?? [], ['type' => $data['type'], 'body' => $data['body']]),
            ]);
            $audit->log($request, 'notification.updated', $notificationDelivery, $old, $notificationDelivery->fresh()->toArray());

            return response()->json($notificationDelivery->fresh(['registrant', 'user']));
        }
        abort_unless($announcement, 404, 'Notification announcement not found.');

        $old = $announcement->toArray();
        $announcement->update($data);
        $notificationDelivery->update([
            'message' => $announcement->title,
        ]);

        $audit->log($request, 'notification.updated', $notificationDelivery, $old, $announcement->fresh()->toArray());

        return response()->json($notificationDelivery->fresh('announcement'));
    }

    public function clearHistory(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'confirm' => ['required', 'accepted'],
            'ids' => ['sometimes', 'required', 'array', 'min:1', 'max:250'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:notification_deliveries,id'],
        ]);
        $sector = $this->sectorForRole($request->user()?->role);
        $count = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $audit, $sector, $data) {
            if (isset($data['ids'])) {
                foreach (NotificationDelivery::whereIn('id', $data['ids'])->get() as $delivery) {
                    $this->authorizeSectorScope($request, $delivery);
                }
            }
            $query = NotificationDelivery::query()
                ->when(isset($data['ids']), fn ($query) => $query->whereIn('id', $data['ids']))
                ->when($sector, fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
                ->when($sector, fn ($query) => $query->where(fn ($query) => $query->whereNull('announcement_id')
                    ->orWhereHas('announcement', fn ($announcement) => $announcement->visibleToUser($request->user()))));
            $count = 0;
            $query->chunkById(200, function ($deliveries) use ($request, $audit, &$count) {
                foreach ($deliveries as $delivery) {
                    $this->authorizeSectorScope($request, $delivery);
                    $old = $delivery->toArray();
                    $delivery->delete();
                    $audit->log($request, 'notification.deleted', $delivery, $old, []);
                    $count++;
                }
            });
            return $count;
        });
        return response()->json(['message' => "Cleared {$count} delivery records.", 'deleted_count' => $count]);
    }

    public function destroy(Request $request, NotificationDelivery $notificationDelivery, AuditLogger $audit)
    {
        $this->authorizeSectorScope($request, $notificationDelivery);
        $announcement = $notificationDelivery->announcement;
        $old = $notificationDelivery->toArray();

        $notificationDelivery->delete();

        if ($announcement instanceof Announcement && ! $announcement->notificationDeliveries()->exists()) {
            $announcement->delete();
        }

        $audit->log($request, 'notification.deleted', $notificationDelivery, $old, []);

        return response()->json(['message' => 'Notification deleted.']);
    }

    public function resend(Request $request, NotificationDelivery $notificationDelivery, NotificationGateway $gateway, AuditLogger $audit)
    {
        $this->authorizeSectorScope($request, $notificationDelivery);
        abort_unless($notificationDelivery->status === 'failed', 422, 'Only failed notifications can be resent.');

        $old = $notificationDelivery->toArray();
        $delivery = $gateway->resend($notificationDelivery);
        $audit->log($request, 'notification.resent', $delivery, $old, $delivery->toArray());

        return response()->json(['message' => 'Notification resent.', 'delivery' => $delivery]);
    }

    public function resendBulk(Request $request, NotificationGateway $gateway, AuditLogger $audit)
    {
        $data = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:notification_deliveries,id'],
        ]);

        $deliveries = NotificationDelivery::query()
            ->whereIn('id', $data['ids'])
            ->where('status', 'failed')
            ->whereHas('announcement', fn ($announcement) => $announcement->visibleToUser($request->user()))
            ->when($this->sectorForRole($request->user()?->role), fn ($query, $sector) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
            ->get();

        $resent = $deliveries->map(function (NotificationDelivery $delivery) use ($request, $gateway, $audit) {
            $old = $delivery->toArray();
            $updated = $gateway->resend($delivery);
            $audit->log($request, 'notification.resent', $updated, $old, $updated->toArray());

            return $updated;
        });

        return response()->json(['message' => 'Selected notifications resent.', 'deliveries' => $resent]);
    }

    private function authorizeSectorScope(Request $request, NotificationDelivery $delivery): void
    {
        $sector = $this->sectorForRole($request->user()?->role);
        if (! $sector) {
            return;
        }

        abort_unless($delivery->registrant()->where('sector', $sector)->exists(), 403, 'Forbidden.');

        if ($delivery->announcement_id) {
            abort_unless($delivery->announcement()->visibleToUser($request->user())->exists(), 403, 'Forbidden.');
        }
    }

    private function sectorForRole(?string $role): ?string
    {
        return match ($role) {
            'crop_head' => 'farmer',
            'fish_head' => 'fisherfolk',
            'livestock_head' => 'livestock',
            'poultry_head' => 'poultry',
            default => null,
        };
    }

    private function userIdForRegistrant(Registrant $registrant): ?int
    {
        if (! $registrant->email) {
            return null;
        }

        return User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($registrant->email)])
            ->value('id');
    }
}
