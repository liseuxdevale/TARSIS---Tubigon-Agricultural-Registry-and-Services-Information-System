<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDelivery extends Model
{
    protected $fillable = [
        'announcement_id',
        'registrant_id',
        'user_id',
        'channel',
        'recipient',
        'status',
        'message',
        'provider_response',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'provider_response' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }

    public function registrant()
    {
        return $this->belongsTo(Registrant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
