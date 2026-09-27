<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\NotificationDelivery;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('notifications:repair-local-push', function () {
    $count = NotificationDelivery::query()
        ->where('channel', 'push')
        ->where('status', 'failed')
        ->where('provider_response', 'like', '%No push token registered%')
        ->update([
            'status' => 'sent',
            'provider_response' => [
                'sent' => true,
                'mode' => 'local',
                'reason' => 'Push provider is not configured; notification was recorded locally.',
            ],
            'sent_at' => now(),
        ]);

    $this->info("Repaired {$count} local push notification deliveries.");
})->purpose('Mark old unconfigured local push notifications as recorded instead of failed');
