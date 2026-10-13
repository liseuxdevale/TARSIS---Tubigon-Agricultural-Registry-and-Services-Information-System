<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_signup_creates_and_authenticates_a_beneficiary_account(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Maria Santos',
            'email' => 'maria@example.test',
            'phone' => '09171234567',
            'password' => 'password123!',
            'password_confirmation' => 'password123!',
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', 'farmer')
            ->assertJsonPath('user.status', 'active')
            ->assertJsonPath('user.requested_role', null)
            ->assertJsonPath('user.barangay_id', null)
            ->assertJsonStructure(['access_token', 'user']);
    }

    public function test_public_signup_requires_a_valid_unique_mobile_number(): void
    {
        User::factory()->create(['phone' => '09171234567']);

        $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'another@example.test',
            'phone' => '+63 917 123 4567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');

        $this->postJson('/api/auth/register', [
            'name' => 'No Phone User',
            'email' => 'no-phone@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');
    }

    public function test_super_admin_can_grant_role_to_user_account(): void
    {
        $barangay = Barangay::create([
            'name' => 'Test Barangay',
            'latitude' => 12.3456789,
            'longitude' => 123.4567890,
        ]);

        $pending = User::create([
            'name' => 'Pending User',
            'email' => 'pending@example.test',
            'password' => 'password123',
            'role' => 'pending_staff',
            'status' => 'active',
            'permissions' => [],
        ]);

        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.test',
            'password' => 'password123',
            'role' => 'super_admin',
            'status' => 'active',
            'permissions' => ['*'],
        ]);

        $token = app(JwtService::class)->issue($admin);

        $this->withToken($token)
            ->postJson("/api/users/{$pending->id}/grant-role", [
                'role' => 'barangay_technical_staff',
                'barangay_id' => $barangay->id,
            ])
            ->assertOk()
            ->assertJsonPath('role', 'barangay_technical_staff')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('requested_role', null)
            ->assertJsonPath('barangay_id', $barangay->id);
    }
}
