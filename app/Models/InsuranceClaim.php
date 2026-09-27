<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InsuranceClaim extends Model
{
    protected $fillable = [
        'registrant_id',
        'claim_type',
        'policy_number',
        'calamity_event',
        'incident_date',
        'estimated_loss',
        'endorsement_status',
        'approval_status',
        'release_status',
        'archived_at',
        'archived_by',
        'archive_reason',
        'previous_status',
        'encoded_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'estimated_loss' => 'decimal:2',
            'archived_at' => 'datetime',
        ];
    }

    public function registrant()
    {
        return $this->belongsTo(Registrant::class);
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }
}
