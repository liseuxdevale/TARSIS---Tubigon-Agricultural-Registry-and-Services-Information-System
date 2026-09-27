<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangay_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('barangay_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'barangay_id']);
        });

        DB::table('users')
            ->whereNotNull('barangay_id')
            ->orderBy('id')
            ->each(function ($user) {
                DB::table('barangay_user')->insertOrIgnore([
                    'user_id' => $user->id,
                    'barangay_id' => $user->barangay_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangay_user');
    }
};
