<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MaoAdministratorSeeder extends Seeder
{
    public function run(): void
    {
        $email = 'mao.admin@tarsis.local';

        if (User::where('email', $email)->exists()) {
            $this->command?->info('MAO Administrator account already exists; credentials were not changed.');
            return;
        }

        $password = Str::random(20);
        $user = User::create([
            'name' => 'MAO Administrator',
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'mao_staff',
            'status' => 'active',
            'permissions' => ['registrants', 'assistance', 'insurance', 'announcements'],
            'must_change_password' => true,
        ]);

        $this->command?->info("Created MAO Administrator account (ID: {$user->id}).");
        $this->command?->info("Email: {$email}");
        $this->command?->info("Temporary password: {$password}");
        $this->command?->info('A password change is required at first login.');
    }
}
