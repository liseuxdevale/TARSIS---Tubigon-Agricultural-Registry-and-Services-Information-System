<?php

namespace Tests\Feature;

use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InsuranceEvidenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_photo_is_required_for_new_insurance_but_not_assistance_and_survives_updates(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['role' => 'super_admin', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user));
        $barangay = \App\Models\Barangay::create(['name' => 'Potohan', 'latitude' => 9.9, 'longitude' => 123.9]);
        $person = Registrant::create(['barangay_id' => $barangay->id, 'registry_number' => '071245028000001', 'first_name' => 'Maria', 'last_name' => 'Santos', 'sector' => 'farmer', 'birthday' => '1990-01-01', 'address' => 'Potohan', 'ownership_type' => 'Farm Worker']);
        $data = ['registrant_id' => $person->id, 'claim_type' => 'crop_damage'];
        $this->postJson('/api/insurance-claims', $data)->assertUnprocessable();
        $photo = UploadedFile::fake()->createWithContent('evidence.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoQAAAAASUVORK5CYII='));
        $response = $this->post('/api/insurance-claims', [...$data, 'photo' => $photo])->assertCreated();
        $path = $response->json('evidence_path');
        Storage::disk('public')->assertExists($path);
        $this->putJson('/api/insurance-claims/'.$response->json('id'), ['remarks' => 'Updated'])->assertOk()->assertJsonPath('evidence_path', $path);
        $this->postJson('/api/assistance-applications', ['registrant_id' => $person->id, 'assistance_type' => 'crop', 'program_name' => 'Seeds', 'applied_at' => '2026-10-13'])->assertCreated();
    }
}
