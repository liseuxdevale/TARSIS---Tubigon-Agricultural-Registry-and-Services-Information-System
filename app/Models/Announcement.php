<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = [
        'type',
        'title',
        'body',
        'image_path',
        'publish_at',
        'expires_at',
        'target_sectors',
        'target_barangays',
        'target_registrant_id',
        'send_push',
        'publish_to_facebook',
        'facebook_post_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'publish_at' => 'datetime',
            'expires_at' => 'datetime',
            'target_sectors' => 'array',
            'target_barangays' => 'array',
            'send_push' => 'boolean',
            'publish_to_facebook' => 'boolean',
        ];
    }

    public function notificationDeliveries()
    {
        return $this->hasMany(NotificationDelivery::class);
    }

    public function comments()
    {
        return $this->hasMany(AnnouncementComment::class);
    }

    protected $appends = [
        'image_url',
    ];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path ? asset('storage/'.$this->image_path) : null;
    }

    public function scopeVisibleToUser(Builder $query, User $user): Builder
    {
        if (in_array($user->role, ['super_admin', 'mao_staff'], true)) {
            return $query;
        }

        $registrant = null;
        $registrantId = null;
        $sector = self::sectorForRole($user->role);
        $barangayIds = $user->role === 'barangay_technical_staff'
            ? $user->assignedBarangayIds()
            : ($user->barangay_id ? [(int) $user->barangay_id] : []);

        if ($user->role === 'farmer') {
            $registrant = Registrant::query()
                ->whereNotNull('email')
                ->whereRaw('LOWER(email) = ?', [strtolower($user->email)])
                ->latest('id')
                ->first();

            $registrantId = $registrant?->id;
            $sector = $registrant?->sector;
            $barangayIds = $registrant?->barangay_id ? [(int) $registrant->barangay_id] : [];
        }

        return $query
            ->where(function (Builder $query) use ($registrantId, $user) {
                $query->whereNull('target_registrant_id')
                    ->when($user->role === 'farmer', fn (Builder $query) => $query->orWhere('target_registrant_id', $registrantId));
            })
            ->where(function (Builder $query) use ($sector) {
                $query->whereNull('target_sectors')
                    ->orWhereJsonLength('target_sectors', 0)
                    ->when($sector, fn (Builder $query) => $query->orWhereJsonContains('target_sectors', $sector));
            })
            ->where(function (Builder $query) use ($barangayIds) {
                $query->whereNull('target_barangays')
                    ->orWhereJsonLength('target_barangays', 0);

                foreach ($barangayIds as $barangayId) {
                    $query->orWhereJsonContains('target_barangays', (int) $barangayId);
                }
            });
    }

    public static function sectorForRole(?string $role): ?string
    {
        return match ($role) {
            'crop_head' => 'farmer',
            'fish_head' => 'fisherfolk',
            'livestock_head' => 'livestock',
            'poultry_head' => 'poultry',
            default => null,
        };
    }
}
