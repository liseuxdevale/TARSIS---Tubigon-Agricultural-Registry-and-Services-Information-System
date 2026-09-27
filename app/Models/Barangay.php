<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barangay extends Model
{
    protected $fillable = [
        'name',
        'latitude',
        'longitude',
        'enrollment_schedule',
        'enrollment_status',
        'open_time',
        'close_time',
        'assigned_technical_personnel',
        'mao_office_details',
        'registrant_target',
        'is_underserved',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'enrollment_schedule' => 'date',
            'open_time' => 'datetime:H:i',
            'close_time' => 'datetime:H:i',
            'is_underserved' => 'boolean',
        ];
    }

    public function getCurrentEnrollmentStatusAttribute(): string
    {
        if (! $this->open_time || ! $this->close_time) {
            return $this->enrollment_status;
        }

        $now = now()->format('H:i:s');
        $open = $this->open_time instanceof \Carbon\CarbonInterface ? $this->open_time->format('H:i:s') : (string) $this->open_time;
        $close = $this->close_time instanceof \Carbon\CarbonInterface ? $this->close_time->format('H:i:s') : (string) $this->close_time;

        if ($open <= $close) {
            return ($now >= $open && $now <= $close) ? 'open' : 'closed';
        }

        return ($now >= $open || $now <= $close) ? 'open' : 'closed';
    }

    public function registrants()
    {
        return $this->hasMany(Registrant::class);
    }
}
