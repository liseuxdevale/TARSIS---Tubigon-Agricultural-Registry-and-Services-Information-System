<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DashboardUpcomingEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_only_returns_events_scheduled_within_the_next_week(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-12 10:00:00'));

        $user = User::factory()->create([
            'role' => 'mao_staff',
            'status' => 'active',
            'permissions' => ['announcements'],
        ]);

        $nearEvent = Announcement::create([
            'type' => 'distribution_schedule',
            'title' => 'Rice Seed Distribution',
            'body' => 'Distribution details.',
            'publish_at' => now()->addDays(6),
        ]);

        Announcement::create([
            'type' => 'distribution_schedule',
            'title' => 'Past Distribution',
            'body' => 'Old distribution details.',
            'publish_at' => now()->subDay(),
        ]);

        Announcement::create([
            'type' => 'distribution_schedule',
            'title' => 'Later Distribution',
            'body' => 'Future distribution details.',
            'publish_at' => now()->addDays(8),
        ]);

        $token = app(JwtService::class)->issue($user);

        $this->withToken($token)
            ->getJson('/api/reports/dashboard')
            ->assertOk()
            ->assertJsonPath('upcoming_announcements.0.id', $nearEvent->id)
            ->assertJsonCount(1, 'upcoming_announcements');
    }
}
