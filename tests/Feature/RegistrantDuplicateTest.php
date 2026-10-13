<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use App\Services\RegistryNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class RegistrantDuplicateTest extends TestCase
{
    use RefreshDatabase;

    private Barangay $barangay;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->barangay = Barangay::create(['name' => 'Potohan', 'latitude' => 9.9, 'longitude' => 123.9]);
        $this->login('super_admin');
    }

    private function login(string $role): User
    {
        $user = User::factory()->create(['role' => $role, 'status' => 'active']);
        $this->withToken(app(JwtService::class)->issue($user));

        return $user;
    }

    private function record(array $overrides = []): Registrant
    {
        return Registrant::create(array_merge([
            'registry_number' => '071245028000001', 'sector' => 'farmer', 'status' => 'pending',
            'first_name' => 'Maria', 'middle_name' => 'Ana', 'last_name' => 'Santos', 'suffix' => 'III',
            'birthday' => '1990-01-01', 'address' => 'Potohan, Tubigon', 'barangay_id' => $this->barangay->id,
            'ownership_type' => 'Farm Worker', 'email' => 'maria@example.test',
        ], $overrides));
    }

    public function test_archiving_selected_duplicate_leaves_other_record_active(): void
    {
        $selected = $this->record();
        $other = $this->record(['registry_number' => '071245028000002']);

        $this->deleteJson('/api/registrants/'.$selected->id, ['archive_reason' => 'Duplicate Record'])
            ->assertOk();

        $this->assertSoftDeleted('registrants', ['id' => $selected->id]);
        $this->assertDatabaseHas('registrants', [
            'id' => $other->id, 'deleted_at' => null, 'archived_at' => null, 'status' => 'pending',
        ]);
        $this->getJson('/api/registrants/'.$other->id)->assertOk();
    }

    public function test_different_person_review_dismisses_only_the_reviewed_pair(): void
    {
        $first = $this->record();
        $second = $this->record(['registry_number' => '071245028000002']);
        $data = ['first_id' => $first->id, 'second_id' => $second->id, 'reason' => 'Verified separate identity documents.'];
        $this->postJson('/api/registrants/duplicates/different-persons', array_replace($data, ['reason' => ' ']))->assertStatus(422);
        $this->postJson('/api/registrants/duplicates/different-persons', $data)->assertOk();
        $this->getJson('/api/registrants/duplicates')->assertOk()->assertExactJson([]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'registrant.different_persons']);
        $this->assertDatabaseHas('registrants', ['id' => $first->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('registrants', ['id' => $second->id, 'deleted_at' => null]);
        $third = $this->record(['registry_number' => '071245028000003']);
        $pairs = $this->getJson('/api/registrants/duplicates')->assertOk()->json('0.pairs');
        $this->assertCount(2, $pairs);
        $this->assertContains([$first->id, $third->id], $pairs);
        $this->assertContains([$second->id, $third->id], $pairs);
        $this->login('farmer');
        $this->postJson('/api/registrants/duplicates/different-persons', $data)->assertForbidden();
    }

    private function payload(array $overrides = []): array
    {
        return array_replace_recursive([
            'sector' => 'farmer', 'first_name' => 'Maria', 'middle_name' => 'Ana', 'last_name' => 'Santos', 'suffix' => 'III',
            'birthday' => '1990-01-01', 'address' => 'Potohan, Tubigon', 'barangay_id' => $this->barangay->id,
            'ownership_type' => 'Farm Worker', 'phone' => '09171234567', 'email' => 'maria@example.test',
            'photo' => UploadedFile::fake()->createWithContent('photo.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoQAAAAASUVORK5CYII=')),
            'rsbsa_payload' => [
                'enrollment_type' => 'New', 'date_administered' => '2026-10-12', 'address_line' => 'Potohan', 'landline' => 'N/A',
                'municipality' => 'Tubigon', 'province' => 'Bohol', 'region' => 'VII', 'education' => 'College', 'religion' => 'Christianity',
                'household_head' => 'Yes', 'household_members' => 1, 'household_male' => 0, 'household_female' => 1,
                'government_id' => 'No', 'association_member' => 'No', 'emergency_name' => 'Contact', 'emergency_contact' => '09170000000',
                'main_livelihood' => ['Farmer'], 'rotation_farmers' => ['N/A', 'N/A', 'N/A'],
                'parcels' => [['location_barangay' => 'Potohan', 'location_municipality' => 'Tubigon', 'total_area' => 1,
                    'ancestral_domain' => 'No', 'agrarian_reform_beneficiary' => 'No', 'ownership_type' => 'Registered Owner',
                    'commodities' => [['commodity' => 'Rice', 'size' => 1, 'heads' => 0, 'farm_type' => '1', 'remarks' => 'N/A']],
                ]],
            ],
        ], $overrides);
    }

    public function test_unique_number_and_identity_save_through_existing_approval_flow(): void
    {
        $this->postJson('/api/registrants', $this->payload(['registry_number' => ' 07-12-45-028-000012 ']))
            ->assertCreated()->assertJsonPath('registry_number', '071245028000012')->assertJsonPath('status', 'pending');
    }

    public function test_number_reuse_is_blocked_even_with_different_identity_and_dash_format(): void
    {
        $record = $this->record();
        $this->postJson('/api/registrants', $this->payload(['registry_number' => ' 07-12-45-028-000001 ', 'first_name' => 'Other']))
            ->assertUnprocessable()->assertJsonPath('code', 'duplicate_registry_number')->assertJsonPath('existing_record.id', $record->id);
        $this->assertDatabaseCount('registrants', 1);
    }

    public function test_conflicting_reference_fields_cannot_hide_a_reused_number(): void
    {
        $record = $this->record();
        $this->postJson('/api/registrants', $this->payload([
            'registry_number' => '071245028000099', 'rsbsa_payload' => ['reference_id' => $record->registry_number],
        ]))->assertUnprocessable()->assertJsonValidationErrors('registry_number');
        $this->assertDatabaseCount('registrants', 1);
    }

    public function test_identity_match_warns_before_saving_and_signed_review_allows_distinct_person(): void
    {
        $this->record();
        $warning = $this->postJson('/api/registrants', $this->payload())->assertStatus(409)
            ->assertJsonPath('code', 'possible_duplicate')->assertJsonPath('matches.0.birthday', '1990-01-01');
        $this->assertDatabaseCount('registrants', 1);
        $this->postJson('/api/registrants', $this->payload(['duplicate_review_token' => $warning->json('duplicate_review_token')]))
            ->assertCreated()->assertJsonPath('status', 'pending');
        $this->assertDatabaseCount('registrants', 2);
    }

    public function test_same_name_with_different_birthday_does_not_warn(): void
    {
        $this->record();
        $this->postJson('/api/registrants', $this->payload(['birthday' => '1991-01-01']))->assertCreated();
    }

    public function test_names_are_normalized_but_middle_names_and_suffixes_are_not_ignored(): void
    {
        $this->record(['first_name' => ' Maria ', 'middle_name' => '  Ana  ', 'last_name' => 'Santos']);
        $this->postJson('/api/registrants', $this->payload(['first_name' => 'MARIA', 'last_name' => '  santos ']))->assertStatus(409);
        $this->postJson('/api/registrants', $this->payload(['middle_name' => 'Different']))->assertCreated();
    }

    public function test_own_record_update_keeps_its_number_without_self_warning(): void
    {
        $record = $this->record();
        $this->putJson('/api/registrants/'.$record->id, ['registry_number' => '07-12-45-028-000001', 'first_name' => ' Maria '])
            ->assertOk()->assertJsonPath('registry_number', '071245028000001');
    }

    public function test_update_cannot_take_another_records_number(): void
    {
        $record = $this->record();
        $this->record(['registry_number' => '071245028000002', 'first_name' => 'Other']);
        $this->putJson('/api/registrants/'.$record->id, ['registry_number' => '07-12-45-028-000002'])->assertUnprocessable();
        $this->assertSame('071245028000001', $record->fresh()->registry_number);
    }

    public function test_optional_number_uses_existing_tarsis_allocation_and_empty_update_keeps_reference(): void
    {
        $response = $this->postJson('/api/registrants', $this->payload(['registry_number' => '']))->assertCreated();
        $this->putJson('/api/registrants/'.$response->json('id'), ['registry_number' => null])
            ->assertOk()->assertJsonPath('registry_number', $response->json('registry_number'));
    }

    public function test_applicant_gets_no_match_personal_details_and_cannot_browse_other_records(): void
    {
        $record = $this->record();
        $this->login('farmer');
        $this->postJson('/api/registrants', $this->payload(['status' => 'approved']))->assertStatus(409)->assertJsonCount(0, 'matches')->assertDontSee('maria@example.test');
        $this->postJson('/api/registrants', $this->payload(['registry_number' => $record->registry_number]))->assertUnprocessable()->assertJsonMissingPath('existing_record');
        $this->getJson('/api/registrants/'.$record->id)->assertForbidden();
        $this->getJson('/api/public/registrants/'.$record->registry_number.'/rsbsa-preview')->assertForbidden();
        $record->update(['status' => 'approved']);
        $this->getJson('/api/public/registrants/'.$record->registry_number)->assertForbidden();
        $this->getJson('/api/registrants')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/registrants/duplicates')->assertForbidden();
    }

    public function test_applicant_cannot_update_another_record_using_the_reference_workflow(): void
    {
        $record = $this->record();
        $this->login('farmer');
        $this->postJson('/api/registrants', $this->payload(['rsbsa_payload' => ['enrollment_type' => 'Updating', 'reference_id' => $record->registry_number]]))->assertForbidden();
    }

    public function test_review_cannot_be_bypassed_with_a_boolean_forged_token_or_changed_identity(): void
    {
        $this->record();
        $this->postJson('/api/registrants', $this->payload(['duplicate_confirmed' => true, 'duplicate_review_token' => 'forged']))->assertStatus(409);
        $warning = $this->postJson('/api/registrants', $this->payload())->assertStatus(409);
        $this->record(['registry_number' => '071245028000002']);
        $this->postJson('/api/registrants', $this->payload(['duplicate_review_token' => $warning->json('duplicate_review_token')]))->assertStatus(409);
    }

    public function test_archived_numbers_remain_reserved_and_archived_identity_is_only_a_warning(): void
    {
        $record = $this->record();
        $record->delete();
        $this->postJson('/api/registrants', $this->payload(['registry_number' => $record->registry_number]))->assertUnprocessable();
        $this->postJson('/api/registrants', $this->payload())->assertStatus(409)->assertJsonPath('matches.0.status', 'archived');
    }

    public function test_sector_head_only_receives_match_details_in_their_scope(): void
    {
        $this->record(['sector' => 'fisherfolk']);
        $this->login('crop_head');
        $this->postJson('/api/registrants', $this->payload())->assertStatus(409)->assertJsonCount(0, 'matches');
    }

    public function test_multiple_livelihoods_are_saved_and_do_not_count_as_multiple_applicants(): void
    {
        $this->postJson('/api/registrants', $this->payload(['rsbsa_payload' => ['main_livelihood' => ['Farmer', 'Fisherfolk']]]))
            ->assertCreated()->assertJsonPath('rsbsa_payload.main_livelihood', ['Farmer', 'Fisherfolk']);
        $this->assertDatabaseCount('registrants', 1);
    }

    public function test_unique_index_guards_a_stale_number_allocator(): void
    {
        $this->record();
        $this->mock(RegistryNumberService::class, fn ($mock) => $mock->shouldReceive('next')->once()->andReturn('071245028000001'));
        $this->postJson('/api/registrants', $this->payload(['first_name' => 'Different']))->assertUnprocessable()->assertJsonValidationErrors('registry_number');
        $this->assertDatabaseCount('registrants', 1);
    }

    public function test_read_only_audit_flags_legacy_normalized_collisions_without_changing_them(): void
    {
        $this->record();
        $other = $this->record(['registry_number' => '071245028000002']);
        // Simulate legacy data written before canonicalization without invoking the model mutator.
        DB::table('registrants')->where('id', $other->id)->update(['registry_number' => '07-12-45-028-000001']);
        $this->artisan('registrants:audit-duplicates')->expectsOutput('Normalized number collision groups: 1')->assertExitCode(1);
        $this->assertSame('07-12-45-028-000001', $other->fresh()->registry_number);
    }

    public function test_duplicate_results_use_full_identity_and_return_no_contact_or_payload_details(): void
    {
        $this->record();
        $this->record(['registry_number' => '071245028000002', 'first_name' => ' MARIA ']);
        $this->record(['registry_number' => '071245028000003', 'middle_name' => 'Different']);
        $this->getJson('/api/registrants/duplicates')->assertOk()->assertJsonCount(1)->assertJsonPath('0.total', 2)
            ->assertJsonPath('0.label', 'Possible Duplicate')->assertJsonMissingPath('0.records.0.email')->assertJsonMissingPath('0.records.0.rsbsa_payload');
    }

    public function test_full_rsbsa_reads_require_login_and_allow_only_owner_or_scoped_staff(): void
    {
        $record = $this->record(['status' => 'approved']);
        $this->withHeaders(['Authorization' => '']);
        $this->getJson('/api/public/registrants/'.$record->registry_number)->assertUnauthorized();
        $this->getJson('/api/public/registrants/'.$record->registry_number.'/rsbsa-preview')->assertUnauthorized();
        $owner = $this->login('farmer');
        $record->update(['email' => $owner->email]);
        $this->getJson('/api/public/registrants/'.$record->registry_number)->assertOk();
        $this->getJson('/api/public/registrants/'.$record->registry_number.'/rsbsa-preview')->assertOk();
    }

    public function test_parallel_database_writes_cannot_insert_the_same_reference_twice(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'rsbsa-unique-');
        try {
            $database = new \PDO('sqlite:'.$file);
            $database->exec('CREATE TABLE registrants (id INTEGER PRIMARY KEY, registry_number TEXT NOT NULL UNIQUE)');
            $database = null;
            $code = <<<'PHP'
            $db = new PDO('sqlite:'.$argv[1]);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db->exec('PRAGMA busy_timeout=5000');
            try {
                $db->beginTransaction();
                $db->exec("INSERT INTO registrants (registry_number) VALUES ('071245028000001')");
                usleep(50000);
                $db->commit();
                echo 'saved';
            } catch (PDOException $error) {
                if ($db->inTransaction()) $db->rollBack();
                echo str_contains($error->getMessage(), 'UNIQUE') ? 'duplicate' : 'unexpected-error';
            }
            PHP;
            $first = new Process([PHP_BINARY, '-r', $code, $file], base_path());
            $second = new Process([PHP_BINARY, '-r', $code, $file], base_path());
            $first->start();
            $second->start();
            $first->wait();
            $second->wait();
            $results = [$first->getOutput(), $second->getOutput()];
            sort($results);
            $this->assertSame(['duplicate', 'saved'], $results);
            $database = new \PDO('sqlite:'.$file);
            $this->assertSame(1, (int) $database->query('SELECT COUNT(*) FROM registrants')->fetchColumn());
            $database = null;
        } finally {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
}
