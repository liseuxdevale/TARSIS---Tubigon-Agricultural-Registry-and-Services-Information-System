<?php

use Illuminate\Support\Facades\Route;
use App\Models\Announcement;

Route::get('/announcements/{announcement}', function (Announcement $announcement) {
    return view('welcome', ['sharedAnnouncement' => $announcement]);
})->whereNumber('announcement');

Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');
