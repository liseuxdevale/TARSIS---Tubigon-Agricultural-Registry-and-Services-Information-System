<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_comment_ownership_moderation_redaction_and_reporting(): void
    {
        $announcement = Announcement::create(['title' => 'Notice', 'body' => 'Message', 'type' => 'bulletin']);
        $owner = User::factory()->create(['role' => 'farmer', 'status' => 'active']);
        $other = User::factory()->create(['role' => 'farmer', 'status' => 'active']);
        $staff = User::factory()->create(['role' => 'mao_staff', 'status' => 'active']);
        $base = '/api/announcements/'.$announcement->id.'/comments';
        $this->withToken(app(JwtService::class)->issue($owner));
        $id = $this->postJson($base.'/authenticated', ['author_name' => 'Fake staff', 'body' => 'Original'])
            ->assertCreated()->json('id');
        $this->getJson($base.'/manage')->assertOk()->assertJsonPath('data.0.author_name', $owner->name)
            ->assertJsonPath('data.0.official', false)->assertJsonPath('data.0.can_edit', true);
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'edit', 'body' => 'Edited'])->assertOk();
        $this->withToken(app(JwtService::class)->issue($other));
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'delete'])->assertForbidden();
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'hide', 'reason' => 'Spam'])->assertForbidden();
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'report', 'reason' => 'Spam'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'announcement.comment.report']);
        $this->withToken(app(JwtService::class)->issue($staff));
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'hide', 'reason' => 'Verified spam'])->assertOk();
        $this->getJson($base)->assertOk()->assertJsonPath('data.0.body', 'Comment hidden by staff.')
            ->assertJsonMissing(['body' => 'Edited']);
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'restore'])->assertOk();
        $this->getJson($base)->assertJsonPath('data.0.body', 'Edited');
        $this->withToken(app(JwtService::class)->issue($owner));
        $this->postJson($base.'/'.$id.'/manage', ['action' => 'delete'])->assertOk();
        $this->getJson($base)->assertJsonPath('data.0.body', 'Comment deleted by its author.');
    }
}
