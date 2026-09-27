<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assistance_applications', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('released_at')->index();
            $table->string('archive_reason')->nullable()->after('archived_at');
            $table->json('backup_payload')->nullable()->after('archive_reason');
        });
    }

    public function down(): void
    {
        Schema::table('assistance_applications', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'archive_reason', 'backup_payload']);
        });
    }
};
