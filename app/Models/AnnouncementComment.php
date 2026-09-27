<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementComment extends Model
{
    protected $fillable = [
        'announcement_id',
        'parent_id',
        'author_name',
        'body',
        'likes_count',
        'dislikes_count',
    ];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }

    public function replies()
    {
        return $this->hasMany(self::class, 'parent_id')->oldest();
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }
}
