<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assistance_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('assistance_applications', 'evidence_path')) {
                $table->string('evidence_path')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('assistance_applications', function (Blueprint $table) {
            if (Schema::hasColumn('assistance_applications', 'evidence_path')) {
                $table->dropColumn('evidence_path');
            }
        });
    }
};
