<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Registrant;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiBarangayScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_barangay_staff_can_access_every_assigned_barangay_but_not_others(): void
    {
        [$first, $second, $unassigned] = $this->barangays();
        $staff = $this->staff($first, [$first, $second]);
        $firstRegistrant = $this->registrant($first, '071245001000001');
        $secondRegistrant = $this->registrant($second, '071245002000001');
        $unassignedRegistrant = $this->registrant($unassigned, '071245003000001');
        $token = app(JwtService::class)->issue($staff);

        $this->withToken($token)
            ->getJson('/api/registrants?per_page=50')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['registry_number' => $firstRegistrant->registry_number])
            ->assertJsonFragment(['registry_number' => $secondRegistrant->registry_number])
            ->assertJsonMissing(['registry_number' => $unassignedRegistrant->registry_number]);

        $this->withToken($token)
            ->getJson("/api/registrants/{$secondRegistrant->id}")
            ->assertOk();

        $this->withToken($token)
            ->getJson("/api/registrants/{$unassignedRegistrant->id}")
            ->assertForbidden();
    }

    public function test_auth_and_dashboard_return_all_assigned_barangays(): void
    {
        [$first, $second, $unassigned] = $this->barangays();
        $staff = $this->staff($first, [$first, $second]);
        $this->registrant($first, '071245001000001');
        $this->registrant($second, '071245002000001');
        $this->registrant($unassigned, '071245003000001');
        $token = app(JwtService::class)->issue($staff);

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonCount(2, 'barangays');

        $this->withToken($token)
            ->getJson('/api/reports/dashboard')
            ->assertOk()
            ->assertJsonPath('totals.registrants', 2)
            ->assertJsonCount(2, 'by_barangay');
    }

    public function test_super_admin_can_assign_multiple_barangays_to_an_account(): void
    {
        [$first, $second] = $this->barangays();
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.test',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
            'permissions' => ['*'],
        ]);
        $account = User::create([
            'name' => 'Barangay Account',
            'email' => 'barangay@example.test',
            'password' => 'password123',
            'role' => 'pending_staff',
            'status' => 'pending',
            'permissions' => [],
        ]);

        $this->withToken(app(JwtService::class)->issue($admin))
            ->postJson("/api/users/{$account->id}/grant-role", [
                'role' => 'barangay_technical_staff',
                'barangay_ids' => [$first->id, $second->id],
            ])
            ->assertOk()
            ->assertJsonPath('barangay_id', $first->id)
            ->assertJsonCount(2, 'barangays');

        $this->assertDatabaseHas('barangay_user', [
            'user_id' => $account->id,
            'barangay_id' => $first->id,
        ]);
        $this->assertDatabaseHas('barangay_user', [
            'user_id' => $account->id,
            'barangay_id' => $second->id,
        ]);
    }

    public function test_managing_barangay_access_does_not_change_the_account_role(): void
    {
        [$first, $second, $third] = $this->barangays();
        $staff = $this->staff($first, [$first]);
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.test',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
            'permissions' => ['*'],
        ]);

        $this->withToken(app(JwtService::class)->issue($admin))
            ->postJson("/api/users/{$staff->id}/barangays", [
                'barangay_ids' => [$second->id, $third->id],
            ])
            ->assertOk()
            ->assertJsonPath('role', 'barangay_technical_staff')
            ->assertJsonPath('barangay_id', $second->id)
            ->assertJsonCount(2, 'barangays');

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'role' => 'barangay_technical_staff',
        ]);
    }

    private function barangays(): array
    {
        return collect(['Batasan', 'Cabulihan', 'Centro'])
            ->map(fn ($name, $index) => Barangay::create([
                'name' => $name,
                'latitude' => 9.90 + ($index / 100),
                'longitude' => 123.90 + ($index / 100),
            ]))
            ->all();
    }

    private function staff(Barangay $primary, array $barangays): User
    {
        $staff = User::create([
            'name' => 'Barangay Staff',
            'email' => 'staff@example.test',
            'password' => 'password123',
            'role' => 'barangay_technical_staff',
            'status' => 'active',
            'permissions' => ['registrants:view', 'registrants:create'],
            'barangay_id' => $primary->id,
        ]);
        $staff->barangays()->sync(collect($barangays)->pluck('id')->all());

        return $staff->fresh();
    }

    private function registrant(Barangay $barangay, string $registryNumber): Registrant
    {
        return Registrant::create([
            'registry_number' => $registryNumber,
            'sector' => 'farmer',
            'status' => 'pending',
            'first_name' => 'Test',
            'last_name' => $barangay->name,
            'birthday' => '1990-01-01',
            'address' => $barangay->name.', Tubigon, Bohol',
            'barangay_id' => $barangay->id,
            'ownership_type' => 'Farm Worker',
        ]);
    }
}
