<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Barangay;
use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use App\Services\NotificationGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementNotificationTargetingTest extends TestCase
{
    use RefreshDatabase;

    public function test_visible_announcement_notifications_match_registrant_sector_and_barangay(): void
    {
        [$matchingBarangay, $otherBarangay] = $this->barangays();
        $user = User::factory()->create([
            'email' => 'registrant@example.test',
            'role' => 'farmer',
            'status' => 'active',
        ]);

        Registrant::create([
            'registry_number' => '071245001000001',
            'sector' => 'farmer',
            'status' => 'approved',
            'first_name' => 'Target',
            'last_name' => 'Registrant',
            'birthday' => '1990-01-01',
            'email' => $user->email,
            'address' => $matchingBarangay->name.', Tubigon, Bohol',
            'barangay_id' => $matchingBarangay->id,
            'ownership_type' => 'Farm Worker',
        ]);

        $visible = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Matching barangay and sector',
            'body' => 'Visible announcement.',
            'target_sectors' => ['farmer'],
            'target_barangays' => [$matchingBarangay->id],
        ]);

        Announcement::create([
            'type' => 'bulletin',
            'title' => 'Wrong barangay',
            'body' => 'Hidden announcement.',
            'target_sectors' => ['farmer'],
            'target_barangays' => [$otherBarangay->id],
        ]);

        Announcement::create([
            'type' => 'bulletin',
            'title' => 'Wrong sector',
            'body' => 'Hidden announcement.',
            'target_sectors' => ['fisherfolk'],
            'target_barangays' => [$matchingBarangay->id],
        ]);

        $this->withToken(app(JwtService::class)->issue($user))
            ->getJson('/api/announcements/visible?per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible->id)
            ->assertJsonPath('data.0.title', 'Matching barangay and sector');
    }

    public function test_sector_notification_delivery_feed_only_includes_matching_announcement_targets(): void
    {
        [$barangay] = $this->barangays();
        $sectorHead = User::factory()->create([
            'role' => 'crop_head',
            'status' => 'active',
            'permissions' => ['announcements'],
        ]);
        $registrant = Registrant::create([
            'registry_number' => '071245001000001',
            'sector' => 'farmer',
            'status' => 'approved',
            'first_name' => 'Target',
            'last_name' => 'Registrant',
            'birthday' => '1990-01-01',
            'address' => $barangay->name.', Tubigon, Bohol',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
        ]);

        $visible = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Crop notice',
            'body' => 'Visible delivery.',
            'target_sectors' => ['farmer'],
        ]);
        $hidden = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Fishery notice',
            'body' => 'Hidden delivery.',
            'target_sectors' => ['fisherfolk'],
        ]);

        $visible->notificationDeliveries()->create([
            'registrant_id' => $registrant->id,
            'channel' => 'push',
            'recipient' => $registrant->registry_number,
            'status' => 'sent',
            'message' => $visible->title,
        ]);
        $hidden->notificationDeliveries()->create([
            'registrant_id' => $registrant->id,
            'channel' => 'push',
            'recipient' => $registrant->registry_number,
            'status' => 'sent',
            'message' => $hidden->title,
        ]);

        $this->withToken(app(JwtService::class)->issue($sectorHead))
            ->getJson('/api/notification-deliveries?channel=push&per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.announcement.id', $visible->id)
            ->assertJsonPath('data.0.announcement.title', 'Crop notice');
    }

    public function test_near_general_announcement_is_recorded_for_active_user_accounts(): void
    {
        [$barangay] = $this->barangays();
        $account = User::factory()->create([
            'role' => 'pending_staff',
            'status' => 'active',
        ]);
        $registrantUser = User::factory()->create([
            'email' => 'registrant@example.test',
            'role' => 'farmer',
            'status' => 'active',
        ]);
        $registrant = Registrant::create([
            'registry_number' => '071245001000001',
            'sector' => 'farmer',
            'status' => 'approved',
            'first_name' => 'Target',
            'last_name' => 'Registrant',
            'birthday' => '1990-01-01',
            'email' => $registrantUser->email,
            'address' => $barangay->name.', Tubigon, Bohol',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
        ]);

        $announcement = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Near general notice',
            'body' => 'Visible to everyone.',
            'publish_at' => now()->addDays(3),
            'send_push' => true,
        ]);

        app(NotificationGateway::class)->dispatchAnnouncement($announcement);

        $this->assertDatabaseHas('notification_deliveries', [
            'announcement_id' => $announcement->id,
            'user_id' => $account->id,
            'recipient' => $account->email,
        ]);
        $this->assertDatabaseHas('notification_deliveries', [
            'announcement_id' => $announcement->id,
            'registrant_id' => $registrant->id,
            'recipient' => $registrant->registry_number,
        ]);
        $this->assertSame(1, $announcement->notificationDeliveries()->where(function ($query) use ($registrantUser, $registrant) {
            $query->where('user_id', $registrantUser->id)
                ->orWhere('registrant_id', $registrant->id);
        })->count());
    }

    public function test_near_targeted_announcement_only_records_matching_sector_and_barangay_accounts(): void
    {
        [$matchingBarangay, $otherBarangay] = $this->barangays();
        $cropHead = User::factory()->create([
            'role' => 'crop_head',
            'status' => 'active',
        ]);
        $fishHead = User::factory()->create([
            'role' => 'fish_head',
            'status' => 'active',
        ]);
        $matchingBarangayStaff = User::factory()->create([
            'role' => 'barangay_technical_staff',
            'status' => 'active',
        ]);
        $matchingBarangayStaff->barangays()->attach($matchingBarangay->id);
        $otherBarangayStaff = User::factory()->create([
            'role' => 'barangay_technical_staff',
            'status' => 'active',
        ]);
        $otherBarangayStaff->barangays()->attach($otherBarangay->id);

        $barangayAnnouncement = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Matching barangay notice',
            'body' => 'Only matching barangay accounts.',
            'publish_at' => now()->addDays(3),
            'target_barangays' => [$matchingBarangay->id],
            'send_push' => true,
        ]);
        app(NotificationGateway::class)->dispatchAnnouncement($barangayAnnouncement);

        $this->assertDatabaseHas('notification_deliveries', [
            'announcement_id' => $barangayAnnouncement->id,
            'user_id' => $matchingBarangayStaff->id,
        ]);
        $this->assertDatabaseMissing('notification_deliveries', [
            'announcement_id' => $barangayAnnouncement->id,
            'user_id' => $otherBarangayStaff->id,
        ]);

        $sectorAnnouncement = Announcement::create([
            'type' => 'bulletin',
            'title' => 'Crop notice',
            'body' => 'Only crop accounts.',
            'publish_at' => now()->addDays(3),
            'target_sectors' => ['farmer'],
            'send_push' => true,
        ]);
        app(NotificationGateway::class)->dispatchAnnouncement($sectorAnnouncement);

        $this->assertDatabaseHas('notification_deliveries', [
            'announcement_id' => $sectorAnnouncement->id,
            'user_id' => $cropHead->id,
        ]);
        $this->assertDatabaseMissing('notification_deliveries', [
            'announcement_id' => $sectorAnnouncement->id,
            'user_id' => $fishHead->id,
        ]);
        $this->assertDatabaseMissing('notification_deliveries', [
            'announcement_id' => $sectorAnnouncement->id,
            'user_id' => $matchingBarangayStaff->id,
        ]);
    }

    private function barangays(): array
    {
        return collect(['Batasan', 'Cabulihan'])
            ->map(fn (string $name, int $index) => Barangay::create([
                'name' => $name,
                'latitude' => 9.90 + ($index / 100),
                'longitude' => 123.90 + ($index / 100),
            ]))
            ->all();
    }
}
