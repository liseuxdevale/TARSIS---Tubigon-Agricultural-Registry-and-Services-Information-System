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

class ReportTrackersTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrators_receive_filtered_trackers_but_other_roles_do_not(): void
    {
        $barangay = Barangay::create(['name' => 'Potohan', 'latitude' => 9.9, 'longitude' => 123.9]);
        $registrant = Registrant::create([
            'registry_number' => '071245028000001', 'first_name' => 'Maria', 'last_name' => 'Santos',
            'birthday' => '1990-01-01', 'sector' => 'farmer', 'barangay_id' => $barangay->id, 'address' => 'Potohan', 'ownership_type' => 'Farm Worker',
        ]);
        AssistanceApplication::create([
            'registrant_id' => $registrant->id, 'assistance_type' => 'crop',
            'program_name' => 'Seeds', 'applied_at' => '2026-10-12', 'status' => 'released',
        ]);
        InsuranceClaim::create([
            'registrant_id' => $registrant->id, 'claim_type' => 'crop_damage',
            'approval_status' => 'approved', 'release_status' => 'pending',
        ]);
        foreach (['super_admin', 'mao_staff'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->withToken(app(JwtService::class)->issue($user))
                ->getJson('/api/reports/dashboard?sector=farmer&barangay_id='.$barangay->id)
                ->assertOk()->assertJsonCount(1, 'assistance_report')->assertJsonCount(1, 'insurance_report')
                ->assertJsonPath('insurance_report.0.insurance_type', 'crop_damage');
            $this->getJson('/api/reports/dashboard?sector=fisherfolk')
                ->assertOk()->assertJsonCount(0, 'assistance_report')->assertJsonCount(0, 'insurance_report');
            $this->getJson('/api/reports/dashboard?assistance_from=2026-10-13&assistance_to=2026-10-14')
                ->assertOk()->assertJsonCount(0, 'assistance_report');
            $this->get('/api/reports/export?dataset=assistance&date_from=2026-10-12&date_to=2026-10-12')
                ->assertOk()->assertSee('Maria Santos')->assertSee('071245028000001');
            $this->get('/api/reports/export?dataset=assistance&date_from=2026-10-13')
                ->assertOk()->assertDontSee('Maria Santos');
            $this->get('/api/reports/export?dataset=insurance')
                ->assertOk()->assertSee('crop_damage')->assertSee('Maria Santos');
            $this->getJson('/api/reports/export?dataset=insurance&date_from=2026-10-13&date_to=2026-10-12')
                ->assertUnprocessable();
            $registrant->forceFill(['created_at' => '2025-12-31 12:00:00'])->save();
            $this->getJson('/api/reports/dashboard?month_from=2025-12&month_to=2026-01')
                ->assertOk()->assertJsonPath('totals.registrants', 1)
                ->assertJsonCount(2, 'monthly_registrants')
                ->assertJsonPath('monthly_registrants.0.month', 'Dec 2025')
                ->assertJsonPath('monthly_registrants.0.total', 1)
                ->assertJsonPath('by_barangay.0.registrants_count', 1);
            $this->getJson('/api/reports/dashboard?month_from=2026-01&month_to=2026-02')
                ->assertOk()->assertJsonPath('totals.registrants', 0);
            $this->get('/api/reports/export?month_from=2026-01&month_to=2026-02')
                ->assertOk()->assertDontSee('Maria');
            $this->getJson('/api/reports/dashboard?month_from=2026-02&month_to=2026-01')->assertUnprocessable();
        }
        $user = User::factory()->create(['role' => 'crop_head', 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user))->getJson('/api/reports/dashboard')
            ->assertOk()->assertJsonCount(0, 'assistance_report')->assertJsonCount(0, 'insurance_report');
        $this->getJson('/api/reports/export?dataset=insurance')->assertForbidden();
    }
}
