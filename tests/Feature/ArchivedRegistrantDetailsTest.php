<?php

namespace Tests\Feature;

use App\Models\AssistanceApplication;
use App\Models\Barangay;
use App\Models\InsuranceClaim;
use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArchivedRegistrantDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_archived_applications_keep_registrant_details_and_sector_scope(): void
    {
        $barangay = Barangay::create(['name' => 'Potohan', 'latitude' => 9.9, 'longitude' => 123.9]);
        $person = Registrant::create(['registry_number' => '071245028000001', 'first_name' => 'Maria', 'last_name' => 'Santos',
            'birthday' => '1990-01-01', 'address' => 'Potohan', 'ownership_type' => 'Farm Worker', 'sector' => 'farmer', 'barangay_id' => $barangay->id]);
        AssistanceApplication::create(['registrant_id' => $person->id, 'assistance_type' => 'crop', 'program_name' => 'Seeds', 'applied_at' => now(), 'archived_at' => now()]);
        InsuranceClaim::create(['registrant_id' => $person->id, 'claim_type' => 'crop', 'archived_at' => now()]);
        $person->delete();
        foreach (['super_admin', 'mao_staff', 'crop_head', 'fish_head'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->withToken(app(JwtService::class)->issue($user));
            foreach (['assistance-applications', 'insurance-claims'] as $module) {
                $response = $this->getJson('/api/archived/'.$module.'?search=Maria&barangay_id='.$barangay->id)->assertOk();
                if ($role === 'fish_head') { $response->assertJsonCount(0, 'data'); }
                else { $response->assertJsonPath('data.0.registrant.full_name', 'Maria Santos')->assertJsonPath('data.0.registrant.barangay.name', 'Potohan'); }
            }
        }
        $this->assertSoftDeleted('registrants', ['id' => $person->id]);
    }
}
