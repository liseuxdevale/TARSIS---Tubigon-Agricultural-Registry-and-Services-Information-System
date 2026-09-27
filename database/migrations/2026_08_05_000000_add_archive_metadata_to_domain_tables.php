<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registrants', function (Blueprint $table) {
            if (! Schema::hasColumn('registrants', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('deactivated_at')->index();
            }
            if (! Schema::hasColumn('registrants', 'archived_by')) {
                $table->foreignId('archived_by')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('registrants', 'archive_reason')) {
                $table->string('archive_reason')->nullable()->after('archived_by');
            }
            if (! Schema::hasColumn('registrants', 'previous_status')) {
                $table->string('previous_status')->nullable()->after('archive_reason');
            }
        });

        Schema::table('assistance_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('assistance_applications', 'archived_by')) {
                $table->foreignId('archived_by')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('assistance_applications', 'previous_status')) {
                $table->string('previous_status')->nullable()->after('archive_reason');
            }
        });

        Schema::table('insurance_claims', function (Blueprint $table) {
            if (! Schema::hasColumn('insurance_claims', 'archived_by')) {
                $table->foreignId('archived_by')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('insurance_claims', 'archive_reason')) {
                $table->string('archive_reason')->nullable()->after('archived_by');
            }
            if (! Schema::hasColumn('insurance_claims', 'previous_status')) {
                $table->string('previous_status')->nullable()->after('archive_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('insurance_claims', function (Blueprint $table) {
            $table->dropConstrainedForeignId('archived_by');
            $table->dropColumn(['archive_reason', 'previous_status']);
        });

        Schema::table('assistance_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('archived_by');
            $table->dropColumn('previous_status');
        });

        Schema::table('registrants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('archived_by');
            $table->dropColumn(['archived_at', 'archive_reason', 'previous_status']);
        });
    }
};
