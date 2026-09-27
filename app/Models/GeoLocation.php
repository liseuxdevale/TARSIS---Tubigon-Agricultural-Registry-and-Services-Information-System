<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeoLocation extends Model
{
    protected $fillable = [
        'farmer_id',
        'plot_name',
        'uploaded_by',
        'source_file',
        'point_type',
        'sequence_order',
        'barangay',
        'latitude',
        'longitude',
        'elevation',
        'date_recorded',
        'date_uploaded',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'elevation' => 'decimal:2',
            'date_recorded' => 'datetime',
            'date_uploaded' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function farmer()
    {
        return $this->belongsTo(Registrant::class, 'farmer_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
