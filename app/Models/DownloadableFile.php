<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DownloadableFile extends Model
{
    use SoftDeletes;
    protected $fillable = ['title', 'category', 'description', 'path', 'uploaded_by', 'builtin_key'];
}
