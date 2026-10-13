<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class DownloadableFilesTest extends TestCase
{
    use RefreshDatabase;

    public function test_file_deletion_requires_superadmin_confirmation_and_only_removes_selected_card(): void
    {
        $user = User::factory()->create(['role' => 'farmer', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user))
            ->deleteJson('/api/downloadable-files/pcic-claim', ['confirm' => true])->assertForbidden();
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($admin));
        $this->deleteJson('/api/downloadable-files/pcic-claim')->assertUnprocessable();
        $this->getJson('/api/downloadable-files')->assertJsonCount(4);
        $this->deleteJson('/api/downloadable-files/pcic-claim', ['confirm' => true])->assertOk();
        $this->getJson('/api/downloadable-files')->assertJsonCount(3);
        $this->getJson('/api/downloadable-files/pcic-claim')->assertNotFound();
        $this->get('/api/downloadable-files/pcic-application')->assertOk();
        $this->assertSoftDeleted('downloadable_files', ['builtin_key' => 'pcic-claim']);
    }

    public function test_only_superadmin_can_upload_valid_pdfs_and_users_can_access_them(): void
    {
        Storage::fake('local');
        $user = User::factory()->create(['role' => 'farmer', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user))->postJson('/api/downloadable-files', [])->assertForbidden();
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($admin));
        $this->postJson('/api/downloadable-files', ['title' => 'Notice', 'category' => 'General', 'pdf' => UploadedFile::fake()->create('notes.txt', 1, 'text/plain')])->assertUnprocessable();
        $response = $this->post('/api/downloadable-files', [
            'title' => 'New Form', 'category' => 'Others',
            'pdf' => UploadedFile::fake()->createWithContent('form.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"),
        ])->assertCreated();
        $id = $response->json('file.id');
        $this->assertDatabaseCount('downloadable_files', 1);
        $this->withToken(app(JwtService::class)->issue($user));
        $this->getJson('/api/downloadable-files')->assertOk()->assertJsonCount(5);
        $this->get('/api/downloadable-files/'.$id)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->get('/api/downloadable-files/'.$id.'?download=1')->assertOk()->assertDownload('new-form.pdf');
        $this->withToken(app(JwtService::class)->issue($admin))
            ->deleteJson('/api/downloadable-files/'.$id, ['confirm' => true])->assertOk();
        $this->getJson('/api/downloadable-files/'.$id)->assertNotFound();
        $this->getJson('/api/downloadable-files')->assertJsonCount(4);
        $this->assertSoftDeleted('downloadable_files', ['title' => 'New Form']);
    }

    public function test_forms_are_available_to_staff_users_and_barangay_accounts(): void
    {
        $this->getJson('/api/downloadable-files')->assertUnauthorized();
        foreach (['super_admin', 'mao_staff', 'farmer', 'barangay_technical_staff'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->withToken(app(JwtService::class)->issue($user));
            $files = $this->getJson('/api/downloadable-files')->assertOk()->assertJsonCount(4)->json();
            foreach ($files as $file) {
                $this->get('/api/downloadable-files/'.$file['id'])->assertOk()->assertHeader('Content-Type', 'application/pdf');
                $this->get('/api/downloadable-files/'.$file['id'].'?download=1')->assertOk()->assertDownload($file['filename']);
            }
            $this->getJson('/api/downloadable-files/not-allowed')->assertNotFound();
            $this->getJson('/api/downloadable-files/rsbsa-enrollment')->assertNotFound();
        }
        $user = User::factory()->create(['role' => 'crop_head', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user));
        $this->getJson('/api/downloadable-files')->assertForbidden();
        $this->getJson('/api/downloadable-files/pcic-claim')->assertForbidden();
    }
}
