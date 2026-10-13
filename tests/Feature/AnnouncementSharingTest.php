<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Services\NotificationGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnnouncementSharingTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_announcement_has_server_rendered_escaped_share_metadata(): void
    {
        $announcement = Announcement::create(['title' => 'Rice & Seeds', 'body' => '<script>alert(1)</script>Information', 'image_path' => 'announcements/test.jpg']);
        $this->get('/announcements/'.$announcement->id)->assertOk()
            ->assertSee('property="og:title" content="Rice &amp; Seeds"', false)
            ->assertSee('property="og:image"', false)
            ->assertDontSee('<script>alert(1)</script>', false);
        $this->get('/announcements/999999')->assertNotFound();
    }

    public function test_legacy_page_publishing_requires_a_successful_graph_response_with_post_id(): void
    {
        config(['services.facebook.page_id' => '123', 'services.facebook.page_token' => 'test-token']);
        Http::fake(['graph.facebook.com/*' => Http::sequence()
            ->push(['error' => ['message' => 'Permission denied']], 403)
            ->push(['id' => '123_456'], 200)]);
        $announcement = Announcement::create(['title' => 'Test', 'body' => 'Message']);
        app(NotificationGateway::class)->postToFacebook($announcement);
        $this->assertSame('failed', $announcement->fresh()->facebook_post_id);
        app(NotificationGateway::class)->postToFacebook($announcement);
        $this->assertSame('123_456', $announcement->fresh()->facebook_post_id);
    }
}
