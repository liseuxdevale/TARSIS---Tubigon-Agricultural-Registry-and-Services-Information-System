<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssistanceApplication extends Model
{
    protected $fillable = [
        'registrant_id',
        'assistance_type',
        'program_name',
        'description',
        'evidence_path',
        'status',
        'applied_at',
        'approved_at',
        'released_at',
        'archived_at',
        'archived_by',
        'archive_reason',
        'previous_status',
        'backup_payload',
        'encoded_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'applied_at' => 'date',
            'approved_at' => 'date',
            'released_at' => 'date',
            'archived_at' => 'datetime',
            'backup_payload' => 'array',
        ];
    }

    protected $appends = [
        'evidence_url',
    ];

    public function getEvidenceUrlAttribute(): ?string
    {
        return $this->evidence_path ? asset('storage/'.$this->evidence_path) : null;
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
