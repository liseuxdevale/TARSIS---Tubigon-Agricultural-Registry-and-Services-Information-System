<?php

namespace Tests\Feature;

use App\Models\Registrant;
use App\Models\Barangay;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $barangay = Barangay::create(['name' => 'Potohan', 'latitude' => 9.9, 'longitude' => 123.9]);
        Registrant::creating(function ($person) use ($barangay) {
            $person->birthday ??= '1990-01-01';
            $person->address ??= 'Potohan';
            $person->ownership_type ??= 'Farm Worker';
            $person->barangay_id ??= $barangay->id;
        });
    }

    public function test_selected_recipients_only_see_their_own_inbox_including_staff_accounts(): void
    {
        $manager = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $selected = User::factory()->create(['role' => 'mao_staff', 'status' => 'active']);
        $other = User::factory()->create(['role' => 'mao_staff', 'status' => 'active']);
        $person = Registrant::create([
            'registry_number' => '071245001000001', 'first_name' => 'Maria',
            'last_name' => 'Santos', 'email' => $selected->email,
            'sector' => 'farmer', 'status' => 'approved',
        ]);
        $this->withToken(app(JwtService::class)->issue($manager))
            ->postJson('/api/notification-deliveries', [
                'target_registrant_ids' => [$person->id], 'type' => 'other_purpose',
                'title' => 'Private reminder', 'body' => 'For the selected registrant only.',
            ])->assertCreated();
        $this->getJson('/api/notification-deliveries?inbox=1')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/notification-deliveries')->assertOk()->assertJsonCount(1, 'data');
        $this->withToken(app(JwtService::class)->issue($selected))
            ->getJson('/api/notification-deliveries?inbox=1')->assertOk()->assertJsonCount(1, 'data');
        $this->withToken(app(JwtService::class)->issue($other))
            ->getJson('/api/notification-deliveries?inbox=1')->assertOk()->assertJsonCount(0, 'data');
        $other->update(['role' => 'farmer']);
        $this->withToken(app(JwtService::class)->issue($other))
            ->getJson('/api/notification-deliveries')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_multiple_recipients_receive_messages_visible_in_history_and_can_be_edited(): void
    {
        $manager = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $people = collect(['Maria', 'Juan'])->map(fn ($name, $index) => Registrant::create([
            'registry_number' => '07124500100000'.($index + 1), 'first_name' => $name,
            'last_name' => 'Santos', 'sector' => 'farmer', 'status' => 'approved',
        ]));
        $this->withToken(app(JwtService::class)->issue($manager));
        $response = $this->postJson('/api/notification-deliveries', [
            'target_registrant_ids' => $people->pluck('id')->all(), 'type' => 'other_purpose',
            'title' => 'Office reminder', 'body' => 'Please visit tomorrow.',
        ])->assertCreated()->assertJsonCount(2, 'deliveries');
        $this->assertDatabaseCount('notification_deliveries', 2);
        $this->getJson('/api/notification-deliveries')->assertOk()->assertJsonCount(2, 'data');
        $id = $response->json('deliveries.0.id');
        $this->putJson('/api/notification-deliveries/'.$id, [
            'type' => 'other_purpose', 'title' => 'Updated reminder', 'body' => 'Please visit next week.',
        ])->assertOk()->assertJsonPath('provider_response.body', 'Please visit next week.');
    }

    public function test_sector_head_cannot_send_a_batch_to_another_sector(): void
    {
        $manager = User::factory()->create(['role' => 'crop_head', 'status' => 'active']);
        $person = Registrant::create([
            'registry_number' => '071245001000001', 'first_name' => 'Juan', 'last_name' => 'Santos',
            'sector' => 'fisherfolk', 'status' => 'approved',
        ]);
        $this->withToken(app(JwtService::class)->issue($manager))
            ->postJson('/api/notification-deliveries', [
                'target_registrant_ids' => [$person->id], 'type' => 'other_purpose', 'title' => 'Reminder', 'body' => 'Visit.',
            ])->assertForbidden();
        $this->assertDatabaseCount('notification_deliveries', 0);
    }
}
