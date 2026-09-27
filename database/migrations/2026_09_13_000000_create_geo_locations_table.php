<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geo_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_id')->constrained('registrants')->cascadeOnDelete();
            $table->string('plot_name')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source_file')->nullable();
            $table->string('point_type')->default('waypoint')->index();
            $table->unsignedInteger('sequence_order')->nullable();
            $table->string('barangay')->nullable()->index();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('elevation', 10, 2)->nullable();
            $table->timestamp('date_recorded')->nullable();
            $table->timestamp('date_uploaded')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['farmer_id', 'date_recorded']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geo_locations');
    }
};
