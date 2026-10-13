<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InsuranceClaim extends Model
{
    protected $appends = ['evidence_url'];

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? asset('storage/'.$this->evidence_path) : null;
    }

    protected $fillable = [
        'registrant_id',
        'evidence_path',
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
