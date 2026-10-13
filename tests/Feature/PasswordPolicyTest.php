<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_signup_rejects_passwords_missing_any_required_character_type(): void
    {
        foreach (['password123', 'password!!!', '12345678!', 'pass1!', 'password1 '] as $password) {
            $this->postJson('/api/auth/register', [
                'name' => 'Test User', 'email' => 'policy@example.test', 'phone' => '09171234567',
                'password' => $password, 'password_confirmation' => $password,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
    }

    public function test_password_changes_and_admin_resets_enforce_the_policy(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin', 'status' => 'active', 'password' => 'oldpassword']);
        $this->withToken(app(JwtService::class)->issue($admin));
        $this->putJson('/api/auth/password', [
            'current_password' => 'oldpassword', 'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->postJson("/api/users/{$admin->id}/reset-password", ['password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->putJson('/api/auth/password', [
            'current_password' => 'oldpassword', 'password' => 'newpassword1!', 'password_confirmation' => 'newpassword1!',
        ])->assertOk();
    }
}
