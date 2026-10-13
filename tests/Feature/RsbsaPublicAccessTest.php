<?php

namespace Tests\Feature;

use App\Models\AssistanceApplication;
use App\Models\Barangay;
use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use App\Services\RegistryNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RsbsaPublicAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profile_only_exposes_approved_records(): void
    {
        $this->withToken(app(JwtService::class)->issue(User::factory()->create(['role' => 'super_admin', 'status' => 'active'])));
        $registrant = $this->registrant(['status' => 'pending']);

        $this->getJson("/api/public/registrants/{$registrant->registry_number}")
            ->assertNotFound();

        $registrant->update(['status' => 'approved']);

        $this->getJson("/api/public/registrants/{$registrant->registry_number}")
            ->assertOk()
            ->assertJsonPath('registry_number', $registrant->registry_number)
            ->assertJsonPath('status', 'approved');
    }

    public function test_rsbsa_preview_reads_the_saved_registration_record(): void
    {
        $this->withToken(app(JwtService::class)->issue(User::factory()->create(['role' => 'super_admin', 'status' => 'active'])));
        $registrant = $this->registrant(['status' => 'pending']);

        $this->getJson("/api/public/registrants/{$registrant->registry_number}/rsbsa-preview")
            ->assertOk()
            ->assertJsonPath('registry_number', $registrant->registry_number)
            ->assertJsonPath('rsbsa_payload.household_members', 4);
    }

    public function test_rsbsa_preview_returns_renderable_response_for_missing_record(): void
    {
        $this->withToken(app(JwtService::class)->issue(User::factory()->create(['role' => 'super_admin', 'status' => 'active'])));
        $this->getJson('/api/public/registrants/071245011000021/rsbsa-preview')
            ->assertOk()
            ->assertJsonPath('found', false)
            ->assertJsonPath('registry_number', '071245011000021');
    }

    public function test_registry_number_uses_original_rsbsa_location_code_format(): void
    {
        $barangay = Barangay::create([
            'name' => 'Centro (Poblacion)',
            'latitude' => 12.3456789,
            'longitude' => 123.4567890,
        ]);

        Registrant::create([
            'registry_number' => '071245011000001',
            'sector' => 'farmer',
            'status' => 'pending',
            'first_name' => 'Ana',
            'last_name' => 'Dela Cruz',
            'birthday' => '1990-01-01',
            'address' => 'Purok 1',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Owner',
        ]);

        $this->assertSame('071245011000002', app(RegistryNumberService::class)->next($barangay->id));
    }

    public function test_public_registration_accepts_payload_after_retired_rsbsa_fields_are_removed(): void
    {
        Storage::fake('public');
        $barangay = Barangay::create([
            'name' => 'Centro (Poblacion)',
            'latitude' => 12.3456789,
            'longitude' => 123.4567890,
        ]);

        $payload = [
            'sector' => 'farmer',
            'first_name' => 'Rosa',
            'last_name' => 'Reyes',
            'birthday' => '1991-04-12',
            'sex' => 'Female',
            'civil_status' => 'Single',
            'phone' => '09171234567',
            'email' => 'rosa@example.test',
            'address' => 'Purok 1, Tubigon, Bohol',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
            'farm_area' => '1.25',
            'farm_location' => 'Centro (Poblacion), Tubigon',
            'expected_production' => [],
            'rsbsa_payload' => [
                'enrollment_type' => 'New',
                'date_administered' => '2026-07-23',
                'address_line' => 'Purok 1',
                'municipality' => 'Tubigon',
                'province' => 'Bohol',
                'region' => 'Region VII',
                'education' => 'College',
                'religion' => 'Christianity',
                'household_head' => 'Yes',
                'household_members' => 1,
                'household_male' => 0,
                'household_female' => 1,
                'four_ps' => 'No',
                'government_id' => 'No',
                'association_member' => 'No',
                'emergency_name' => 'Juan Reyes',
                'emergency_contact' => '09170000000',
                'main_livelihood' => 'Farmer',
                'pwd' => 'No',
                'mother_maiden_name' => 'Legacy Value',
                'indigenous' => 'No',
                'farming_income' => 0,
                'non_farming_income' => 0,
                'parcels' => [[
                    'location_barangay' => 'Centro (Poblacion)',
                    'location_municipality' => 'Tubigon',
                    'total_area' => 1.25,
                    'ancestral_domain' => 'No',
                    'agrarian_reform_beneficiary' => 'No',
                    'ownership_type' => 'Registered Owner',
                    'ownership_document_number' => 'Legacy',
                    'commodities' => [[
                        'commodity' => 'Rice',
                        'size' => 1.25,
                        'farm_type' => '1',
                        'organic' => 'No',
                    ]],
                ]],
            ],
            'photo' => UploadedFile::fake()->createWithContent('photo.jpg', base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QP//Z')),
        ];

        $this->postJson('/api/public/registrants', $payload)
            ->assertCreated()
            ->assertJsonPath('rsbsa_payload.parcels.0.ownership_type', 'Registered Owner')
            ->assertJsonMissingPath('rsbsa_payload.pwd')
            ->assertJsonMissingPath('rsbsa_payload.parcels.0.commodities.0.organic');
    }

    public function test_signed_in_beneficiary_can_track_only_their_email_linked_record(): void
    {
        $registrant = $this->registrant([
            'status' => 'pending',
            'email' => 'ana@example.test',
        ]);

        $owner = User::create([
            'name' => 'Ana Dela Cruz',
            'email' => 'ana@example.test',
            'password' => 'password123',
            'role' => 'farmer',
            'status' => 'active',
            'permissions' => [],
        ]);

        $otherUser = User::create([
            'name' => 'Other Beneficiary',
            'email' => 'other@example.test',
            'password' => 'password123',
            'role' => 'farmer',
            'status' => 'active',
            'permissions' => [],
        ]);

        $this->withToken(app(JwtService::class)->issue($owner))
            ->getJson("/api/tracking/registrants/{$registrant->registry_number}")
            ->assertOk()
            ->assertJsonPath('status', 'pending');

        $this->withToken(app(JwtService::class)->issue($otherUser))
            ->getJson("/api/tracking/registrants/{$registrant->registry_number}")
            ->assertForbidden();
    }

    public function test_my_tracking_profile_includes_assistance_from_all_email_linked_records(): void
    {
        $barangay = Barangay::create([
            'name' => 'Poblacion',
            'latitude' => 12.3456789,
            'longitude' => 123.4567890,
        ]);
        $olderRegistrant = Registrant::create([
            'registry_number' => '071245001000001',
            'sector' => 'farmer',
            'status' => 'approved',
            'first_name' => 'Ana',
            'last_name' => 'Dela Cruz',
            'birthday' => '1990-01-01',
            'email' => 'ana@example.test',
            'address' => 'Purok 1',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
        ]);
        $newerRegistrant = Registrant::create([
            'registry_number' => '071245001000002',
            'sector' => 'farmer',
            'status' => 'approved',
            'first_name' => 'Ana',
            'last_name' => 'Dela Cruz',
            'birthday' => '1990-01-01',
            'email' => 'ana@example.test',
            'address' => 'Purok 1',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
        ]);
        AssistanceApplication::create([
            'registrant_id' => $olderRegistrant->id,
            'assistance_type' => 'farm',
            'program_name' => 'Seeds Support',
            'status' => 'approved',
            'applied_at' => now()->toDateString(),
        ]);
        $owner = User::create([
            'name' => 'Ana Dela Cruz',
            'email' => 'ana@example.test',
            'password' => 'password123',
            'role' => 'farmer',
            'status' => 'active',
            'permissions' => [],
        ]);

        $this->withToken(app(JwtService::class)->issue($owner))
            ->getJson('/api/tracking/me')
            ->assertOk()
            ->assertJsonPath('registrant.id', $newerRegistrant->id)
            ->assertJsonPath('registrant.assistance_applications.0.program_name', 'Seeds Support')
            ->assertJsonPath('registrant.assistance_applications.0.status', 'approved');
    }

    public function test_digital_id_includes_the_uploaded_photo_url(): void
    {
        $registrant = $this->registrant([
            'photo_path' => 'registrant-photos/applicant.png',
        ]);
        $staff = User::create([
            'name' => 'MAO Staff',
            'email' => 'staff@example.test',
            'password' => 'password123',
            'role' => 'mao_staff',
            'status' => 'active',
            'permissions' => [],
        ]);

        $this->withToken(app(JwtService::class)->issue($staff))
            ->getJson("/api/registrants/{$registrant->id}/digital-id")
            ->assertOk()
            ->assertJsonPath('photo_url', asset('storage/registrant-photos/applicant.png'));
    }

    private function registrant(array $overrides = []): Registrant
    {
        $barangay = Barangay::create([
            'name' => 'Test Barangay',
            'latitude' => 12.3456789,
            'longitude' => 123.4567890,
        ]);

        return Registrant::create(array_merge([
            'registry_number' => 'TUB-2026-999999',
            'sector' => 'farmer',
            'status' => 'pending',
            'first_name' => 'Ana',
            'last_name' => 'Dela Cruz',
            'birthday' => '1990-01-01',
            'address' => 'Purok 1',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Owner',
            'rsbsa_payload' => ['household_members' => 4],
        ], $overrides));
    }
}
