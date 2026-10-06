<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'username', 'middle_name', 'email', 'password', 'phone', 'office_department', 'avatar_path', 'role', 'requested_role', 'status', 'rejection_reason', 'permissions', 'barangay_id', 'archived_at', 'archived_by', 'archive_reason', 'archive_reason_details', 'created_by', 'password_changed_at', 'must_change_password', 'two_factor_enabled'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $appends = ['avatar_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
            'last_login_at' => 'datetime',
            'archived_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'must_change_password' => 'boolean',
            'two_factor_enabled' => 'boolean',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? asset('storage/'.$this->avatar_path) : null;
    }

    public function barangay()
    {
        return $this->belongsTo(Barangay::class);
    }

    public function barangays()
    {
        return $this->belongsToMany(Barangay::class)->withTimestamps();
    }

    public function registrant()
    {
        return $this->hasOne(Registrant::class, 'email', 'email');
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function assignedBarangayIds(): array
    {
        $ids = $this->relationLoaded('barangays')
            ? $this->barangays->modelKeys()
            : $this->barangays()->pluck('barangays.id')->all();

        if (! $ids && $this->barangay_id) {
            $ids = [$this->barangay_id];
        }

        return collect($ids)->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    public function hasBarangayAccess(int $barangayId): bool
    {
        return in_array($barangayId, $this->assignedBarangayIds(), true);
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles, true);
    }
}
