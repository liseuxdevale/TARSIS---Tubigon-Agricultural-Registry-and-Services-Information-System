<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('geo_locations', function (Blueprint $table) {
            $table->string('commodity_type')->nullable()->after('plot_name')->index();
        });
    }

    public function down(): void
    {
        Schema::table('geo_locations', function (Blueprint $table) {
            $table->dropColumn('commodity_type');
        });
    }
};
