<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Registrant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'registry_number',
        'sector',
        'status',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'birthday',
        'sex',
        'civil_status',
        'phone',
        'email',
        'photo_path',
        'address',
        'barangay_id',
        'ownership_type',
        'farm_area',
        'farm_location',
        'boat_name',
        'livestock_type',
        'poultry_type',
        'expected_production',
        'rsbsa_payload',
        'approved_at',
        'approved_by',
        'deactivated_at',
        'archived_at',
        'archived_by',
        'archive_reason',
        'previous_status',
    ];

    protected $appends = ['full_name', 'photo_url'];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'farm_area' => 'decimal:2',
            'expected_production' => 'array',
            'rsbsa_payload' => 'array',
            'approved_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim(collect([$this->first_name, $this->middle_name, $this->last_name, $this->suffix])->filter()->implode(' '));
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? asset('storage/'.$this->photo_path) : null;
    }

    public function barangay()
    {
        return $this->belongsTo(Barangay::class);
    }

    public function assistanceApplications()
    {
        return $this->hasMany(AssistanceApplication::class);
    }

    public function insuranceClaims()
    {
        return $this->hasMany(InsuranceClaim::class);
    }

    public function geoLocations()
    {
        return $this->hasMany(GeoLocation::class, 'farmer_id');
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }
}
