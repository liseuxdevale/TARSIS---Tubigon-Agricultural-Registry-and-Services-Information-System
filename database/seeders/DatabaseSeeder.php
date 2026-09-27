<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AssistanceApplication;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\InsuranceClaim;
use App\Models\Registrant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $barangayNames = [
            'Bagongbanwa', 'Banlasan', 'Batasan', 'Bilangbilangan', 'Bosongon', 'Buenos Aires',
            'Bunacan', 'Cabulihan', 'Cahayag', 'Cawayanan', 'Centro (Poblacion)', 'Genonocan',
            'Guiwanon', 'Ilihan Norte', 'Ilihan Sur', 'Libertad', 'Maca-as', 'Matabao',
            'Mocaboc Island', 'Panadtaran', 'Panaytayon', 'Pandan', 'Pangapasan',
            'Pinayagan Norte', 'Pinayagan Sur', 'Pooc Occidental (Poblacion)',
            'Pooc Oriental (Poblacion)', 'Potohan', 'Talenceras', 'Tan-awan', 'Tinangnan',
            'Ubay', 'Ubojan', 'Villanueva',
        ];

        $coordinates = [
            'Bagongbanwa' => [10.0556779, 123.9000468], 'Banlasan' => [9.9022502, 123.9431587], 'Batasan' => [10.0158685, 123.9877048],
            'Bilangbilangan' => [9.9877620, 123.8824310], 'Bosongon' => [9.9350820, 123.9979395], 'Buenos Aires' => [9.9024206, 124.0082753],
            'Bunacan' => [9.9261341, 124.0127766], 'Cabulihan' => [9.9581000, 123.9825000], 'Cahayag' => [9.9191773, 123.9268996],
            'Cawayanan' => [9.9196423, 123.9960537], 'Centro (Poblacion)' => [9.9527014, 123.9641958], 'Genonocan' => [9.9297957, 123.9614369],
            'Guiwanon' => [9.9388606, 123.9515103], 'Ilihan Norte' => [9.9193592, 123.9399687], 'Ilihan Sur' => [9.9024045, 123.9569501],
            'Libertad' => [9.8993561, 123.9853404], 'Maca-as' => [9.9488000, 123.9395000], 'Matabao' => [9.9306703, 123.9122066],
            'Mocaboc Island' => [10.0713570, 123.9277520], 'Panadtaran' => [9.9108423, 123.9360046], 'Panaytayon' => [9.9329485, 123.9331967],
            'Pandan' => [9.9305907, 123.9236453], 'Pangapasan' => [9.9981126, 123.9412209], 'Pinayagan Norte' => [9.9386425, 123.9446627],
            'Pinayagan Sur' => [9.9293380, 123.9462900], 'Pooc Occidental (Poblacion)' => [9.9505695, 123.9610147],
            'Pooc Oriental (Poblacion)' => [9.9485009, 123.9635709], 'Potohan' => [9.9438099, 123.9606377],
            'Talenceras' => [9.9365330, 123.9817413], 'Tan-awan' => [9.9152078, 123.9737514], 'Tinangnan' => [9.9528805, 123.9694683],
            'Ubay' => [10.0244062, 123.9662936], 'Ubojan' => [9.9385636, 123.9727905], 'Villanueva' => [9.9078638, 123.9315371],
        ];

        $barangays = collect($barangayNames)->mapWithKeys(function (string $name, int $index) use ($coordinates) {

            $barangay = Barangay::updateOrCreate(
                ['name' => $name],
                [
                    'latitude' => $coordinates[$name][0],
                    'longitude' => $coordinates[$name][1],
                    'enrollment_schedule' => now()->addDays($index + 2)->toDateString(),
                    'enrollment_status' => $index % 5 === 0 ? 'closed' : 'open',
                    'assigned_technical_personnel' => ['Ana Flores', 'Miguel Reyes', 'Leah Cabahug', 'Ramon Tirol'][$index % 4],
                    'mao_office_details' => 'Municipal Agriculture Office, Tubigon Municipal Hall Annex',
                    'registrant_target' => 120 + ($index * 3),
                    'is_underserved' => $index % 6 === 0,
                ],
            );

            return [$name => $barangay];
        });

        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@tarsis.local'],
            [
                'name' => 'TARSIS Super Admin',
                'phone' => '09170000001',
                'password' => Hash::make('password'),
                'role' => 'super_admin',
                'status' => 'active',
                'permissions' => ['*'],
            ],
        );

        $maoStaff = User::updateOrCreate(
            ['email' => 'mao@tarsis.local'],
            [
                'name' => 'MAO Staff',
                'phone' => '09170000002',
                'password' => Hash::make('password'),
                'role' => 'mao_staff',
                'status' => 'active',
                'permissions' => ['registrants', 'assistance', 'insurance', 'announcements'],
            ],
        );

        $barangayStaff = User::updateOrCreate(
            ['email' => 'barangay@tarsis.local'],
            [
                'name' => 'Barangay Technical Staff',
                'phone' => '09170000003',
                'password' => Hash::make('password'),
                'role' => 'barangay_technical_staff',
                'status' => 'active',
                'barangay_id' => $barangays['Centro (Poblacion)']->id,
                'permissions' => ['registrants:view', 'registrants:create'],
            ],
        );
        $barangayStaff->barangays()->sync([
            $barangays['Centro (Poblacion)']->id,
            $barangays['Batasan']->id,
            $barangays['Cabulihan']->id,
        ]);

        foreach ([
            ['crop@tarsis.local', 'Crop Head', 'crop_head', ['registrants:farmer', 'assistance', 'insurance', 'announcements']],
            ['fish@tarsis.local', 'Fishery Head', 'fish_head', ['registrants:fisherfolk', 'assistance', 'insurance', 'announcements']],
            ['livestock@tarsis.local', 'Livestock Head', 'livestock_head', ['registrants:livestock', 'assistance', 'insurance', 'announcements']],
            ['poultry@tarsis.local', 'Poultry Head', 'poultry_head', ['registrants:poultry', 'assistance', 'insurance', 'announcements']],
        ] as [$email, $name, $role, $permissions]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => null,
                    'password' => Hash::make('password'),
                    'role' => $role,
                    'status' => 'active',
                    'barangay_id' => null,
                    'permissions' => $permissions,
                ],
            );
        }

        $samples = [
            ['2026-000001', 'farmer', 'Maria', 'Santos', 'Centro (Poblacion)', 'Owner-Tiller', ['rice' => '45 cavans', 'vegetables' => '300 kg']],
            ['2026-000002', 'fisherfolk', 'Jose', 'Bautista', 'Batasan', 'Owner', ['fish_catch' => '180 kg/month']],
            ['2026-000003', 'livestock', 'Elena', 'Dela Cruz', 'Maca-as', 'Farm Worker', ['hogs' => '18 heads']],
            ['2026-000004', 'poultry', 'Rico', 'Amora', 'Pooc Oriental (Poblacion)', 'Owner', ['native_chicken' => '120 heads']],
            ['2026-000005', 'farmer', 'Nora', 'Villanueva', 'Tinangnan', 'Farm Worker', ['corn' => '1.5 tons']],
            ['2026-000006', 'fisherfolk', 'Pedro', 'Salcedo', 'Mocaboc Island', 'Owner', ['fish_catch' => '140 kg/month']],
            ['2026-000007', 'farmer', 'Liza', 'Mendez', 'Panadtaran', 'Owner-Tiller', ['coconut' => '2,000 nuts']],
            ['2026-000008', 'livestock', 'Carlo', 'Neri', 'Cahayag', 'Owner', ['carabao' => '4 heads']],
        ];

        $registrants = collect($samples)->map(function (array $sample, int $index) use ($barangays, $maoStaff) {
            [$sequence, $sector, $firstName, $lastName, $barangay, $ownership, $production] = $sample;

            return Registrant::updateOrCreate(
                ['registry_number' => "TUB-{$sequence}"],
                [
                    'sector' => $sector,
                    'status' => $index < 6 ? 'approved' : 'pending',
                    'first_name' => $firstName,
                    'middle_name' => $index % 2 === 0 ? 'A.' : null,
                    'last_name' => $lastName,
                    'birthday' => now()->subYears(32 + $index)->subMonths($index)->toDateString(),
                    'sex' => $index % 2 === 0 ? 'Female' : 'Male',
                    'civil_status' => $index % 3 === 0 ? 'Married' : 'Single',
                    'phone' => '0918'.str_pad((string) ($index + 1000001), 7, '0', STR_PAD_LEFT),
                    'email' => strtolower($firstName).'.'.strtolower(str_replace(' ', '', $lastName)).'@example.test',
                    'address' => "{$barangay}, Tubigon, Bohol",
                    'barangay_id' => $barangays[$barangay]->id,
                    'ownership_type' => $ownership,
                    'farm_area' => in_array($sector, ['farmer', 'livestock', 'poultry'], true) ? 1.25 + $index : null,
                    'farm_location' => in_array($sector, ['farmer', 'livestock', 'poultry'], true) ? "{$barangay} production area" : null,
                    'boat_name' => $sector === 'fisherfolk' ? "Banca {$firstName}" : null,
                    'livestock_type' => $sector === 'livestock' ? 'Hog and carabao' : null,
                    'poultry_type' => $sector === 'poultry' ? 'Native chicken' : null,
                    'expected_production' => $production,
                    'rsbsa_payload' => ['source' => 'RSBSA-aligned online registration', 'household_members' => 4 + $index],
                    'approved_at' => $index < 6 ? now()->subDays(10 - $index) : null,
                    'approved_by' => $index < 6 ? $maoStaff->id : null,
                ],
            );
        });

        foreach ($registrants->take(4) as $index => $registrant) {
            AssistanceApplication::updateOrCreate(
                ['registrant_id' => $registrant->id, 'program_name' => ['Certified Seeds', 'Fuel Subsidy', 'Feeds Support', 'Poultry Starter Kit'][$index]],
                [
                    'assistance_type' => ['farm', 'fisheries', 'livestock', 'poultry'][$index],
                    'description' => 'Sample manually encoded assistance request.',
                    'status' => ['released', 'approved', 'pending', 'released'][$index],
                    'applied_at' => now()->subDays(20 - $index)->toDateString(),
                    'approved_at' => $index === 2 ? null : now()->subDays(12 - $index)->toDateString(),
                    'released_at' => in_array($index, [0, 3], true) ? now()->subDays(4)->toDateString() : null,
                    'encoded_by' => $maoStaff->id,
                    'remarks' => 'Seed sample record.',
                ],
            );

            InsuranceClaim::updateOrCreate(
                ['registrant_id' => $registrant->id, 'claim_type' => ['farmer', 'fisherfolk', 'poultry', 'livestock'][$index]],
                [
                    'policy_number' => 'PCIC-2026-'.str_pad((string) ($index + 11), 4, '0', STR_PAD_LEFT),
                    'calamity_event' => $index % 2 === 0 ? 'Heavy rainfall' : 'Rough sea advisory',
                    'incident_date' => now()->subDays(30 - $index)->toDateString(),
                    'estimated_loss' => 4500 + ($index * 1800),
                    'endorsement_status' => ['endorsed', 'endorsed', 'pending', 'endorsed'][$index],
                    'approval_status' => ['approved', 'pending', 'pending', 'approved'][$index],
                    'release_status' => ['released', 'pending', 'pending', 'pending'][$index],
                    'encoded_by' => $maoStaff->id,
                    'remarks' => 'Sample PCIC claim.',
                ],
            );
        }

        Announcement::updateOrCreate(
            ['title' => 'Seed Distribution Schedule'],
            [
                'type' => 'distribution_schedule',
                'body' => 'Certified rice seed release for approved farmer beneficiaries starts next week at the MAO annex.',
                'publish_at' => now(),
                'target_sectors' => ['farmer'],
                'target_barangays' => [$barangays['Centro (Poblacion)']->id, $barangays['Tinangnan']->id],
                'send_push' => true,
                'publish_to_facebook' => false,
                'created_by' => $maoStaff->id,
            ],
        );

        Announcement::updateOrCreate(
            ['title' => 'Pest Advisory: Rice Black Bug Monitoring'],
            [
                'type' => 'pest',
                'body' => 'Report suspected infestations to assigned technical personnel for validation and treatment guidance.',
                'publish_at' => now(),
                'target_sectors' => ['farmer'],
                'send_push' => true,
                'publish_to_facebook' => true,
                'created_by' => $maoStaff->id,
            ],
        );

        AuditLog::updateOrCreate(
            ['action' => 'seeded.sample_data', 'user_id' => $superAdmin->id],
            ['new_values' => ['registrants' => $registrants->count(), 'barangays' => $barangays->count()]],
        );
    }
}
