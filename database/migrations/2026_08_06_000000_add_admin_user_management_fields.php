<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('name');
            }
            if (! Schema::hasColumn('users', 'middle_name')) {
                $table->string('middle_name')->nullable()->after('username');
            }
            if (! Schema::hasColumn('users', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->index()->after('status');
            }
            if (! Schema::hasColumn('users', 'archived_by')) {
                $table->foreignId('archived_by')->nullable()->after('archived_at')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'archive_reason')) {
                $table->string('archive_reason')->nullable()->after('archived_by');
            }
            if (! Schema::hasColumn('users', 'archive_reason_details')) {
                $table->text('archive_reason_details')->nullable()->after('archive_reason');
            }
            if (! Schema::hasColumn('users', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('archive_reason_details')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['archive_reason_details', 'archive_reason']);
            $table->dropConstrainedForeignId('archived_by');
            $table->dropColumn(['archived_at', 'middle_name', 'username']);
        });
    }
};
