<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClearNotificationHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_selected_deliveries_are_deleted(): void
    {
        $user = User::factory()->create(['role' => 'mao_staff', 'status' => 'active']);
        $attributes = ['channel' => 'push', 'recipient' => 'recipient', 'status' => 'sent', 'message' => 'Message'];
        $selected = NotificationDelivery::create($attributes);
        $retained = NotificationDelivery::create($attributes);
        $this->withToken(app(JwtService::class)->issue($user));
        $this->deleteJson('/api/notification-deliveries/clear-history', ['confirm' => true, 'ids' => []])->assertUnprocessable();
        $this->assertDatabaseCount('notification_deliveries', 2);
        $this->deleteJson('/api/notification-deliveries/clear-history', ['confirm' => true, 'ids' => [$selected->id]])
            ->assertOk()->assertJsonPath('deleted_count', 1);
        $this->assertDatabaseMissing('notification_deliveries', ['id' => $selected->id]);
        $this->assertDatabaseHas('notification_deliveries', ['id' => $retained->id]);
    }

    public function test_clear_requires_confirmation_and_preserves_announcements(): void
    {
        $announcement = Announcement::create(['title' => 'Notice', 'body' => 'Message', 'type' => 'bulletin']);
        NotificationDelivery::create(['announcement_id' => $announcement->id, 'channel' => 'push', 'recipient' => 'recipient', 'status' => 'sent', 'message' => 'Message']);
        $user = User::factory()->create(['role' => 'mao_staff', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user));
        $this->deleteJson('/api/notification-deliveries/clear-history')->assertUnprocessable();
        $this->assertDatabaseCount('notification_deliveries', 1);
        $this->deleteJson('/api/notification-deliveries/clear-history', ['confirm' => true])->assertOk()->assertJsonPath('deleted_count', 1);
        $this->assertDatabaseCount('notification_deliveries', 0);
        $this->assertDatabaseHas('announcements', ['id' => $announcement->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'notification.deleted']);
        $user = User::factory()->create(['role' => 'farmer', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user));
        $this->deleteJson('/api/notification-deliveries/clear-history', ['confirm' => true])->assertForbidden();
    }
}
