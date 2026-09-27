<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNotNull('phone')
            ->orderBy('id')
            ->select(['id', 'phone'])
            ->chunkById(100, function ($users) {
                foreach ($users as $user) {
                    $normalized = $this->normalizePhone($user->phone);
                    DB::table('users')->where('id', $user->id)->update(['phone' => $normalized]);
                }
            });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
        });
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '639') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits ?: null;
    }
};
