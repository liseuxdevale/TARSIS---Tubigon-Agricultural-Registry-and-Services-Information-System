<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->date('enrollment_schedule')->nullable();
            $table->string('enrollment_status')->default('open');
            $table->string('assigned_technical_personnel')->nullable();
            $table->text('mao_office_details')->nullable();
            $table->unsignedInteger('registrant_target')->default(0);
            $table->boolean('is_underserved')->default(false);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('barangay_technical_staff')->after('password');
            $table->string('status')->default('active')->after('role');
            $table->string('phone')->nullable()->after('email');
            $table->json('permissions')->nullable()->after('status');
            $table->foreignId('barangay_id')->nullable()->after('permissions')->constrained()->nullOnDelete();
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
        });

        Schema::create('registrants', function (Blueprint $table) {
            $table->id();
            $table->string('registry_number')->unique();
            $table->string('sector')->index();
            $table->string('status')->default('pending')->index();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();
            $table->date('birthday');
            $table->string('sex')->nullable();
            $table->string('civil_status')->nullable();
            $table->string('phone')->nullable()->index();
            $table->string('email')->nullable();
            $table->text('address');
            $table->foreignId('barangay_id')->constrained()->cascadeOnDelete();
            $table->string('ownership_type');
            $table->decimal('farm_area', 10, 2)->nullable();
            $table->string('farm_location')->nullable();
            $table->string('boat_name')->nullable();
            $table->string('livestock_type')->nullable();
            $table->string('poultry_type')->nullable();
            $table->json('expected_production')->nullable();
            $table->json('rsbsa_payload')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deactivated_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['last_name', 'first_name', 'birthday']);
        });

        Schema::create('assistance_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registrant_id')->constrained()->cascadeOnDelete();
            $table->string('assistance_type');
            $table->string('program_name');
            $table->text('description')->nullable();
            $table->string('status')->default('pending')->index();
            $table->date('applied_at');
            $table->date('approved_at')->nullable();
            $table->date('released_at')->nullable();
            $table->foreignId('encoded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registrant_id')->constrained()->cascadeOnDelete();
            $table->string('claim_type');
            $table->string('policy_number')->nullable();
            $table->string('calamity_event')->nullable();
            $table->date('incident_date')->nullable();
            $table->decimal('estimated_loss', 12, 2)->nullable();
            $table->string('endorsement_status')->default('pending')->index();
            $table->string('approval_status')->default('pending')->index();
            $table->string('release_status')->default('pending')->index();
            $table->foreignId('encoded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('bulletin')->index();
            $table->string('title');
            $table->text('body');
            $table->dateTime('publish_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->json('target_sectors')->nullable();
            $table->json('target_barangays')->nullable();
            $table->boolean('send_sms')->default(false);
            $table->boolean('send_push')->default(false);
            $table->boolean('publish_to_facebook')->default(false);
            $table->string('facebook_post_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('registrant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel');
            $table->string('recipient')->nullable();
            $table->string('status')->default('queued');
            $table->text('message')->nullable();
            $table->json('provider_response')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action')->index();
            $table->string('auditable_type')->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('notification_deliveries');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('insurance_claims');
        Schema::dropIfExists('assistance_applications');
        Schema::dropIfExists('registrants');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('barangay_id');
            $table->dropColumn(['role', 'status', 'phone', 'permissions', 'last_login_at']);
        });

        Schema::dropIfExists('barangays');
    }
};
