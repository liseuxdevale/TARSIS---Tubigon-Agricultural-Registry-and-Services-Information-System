<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $coordinates = [
            'Bagongbanwa' => [10.0556779, 123.9000468], 'Banlasan' => [9.9022502, 123.9431587],
            'Batasan' => [10.0158685, 123.9877048], 'Bilangbilangan' => [9.9877620, 123.8824310],
            'Bosongon' => [9.9350820, 123.9979395], 'Buenos Aires' => [9.9024206, 124.0082753],
            'Bunacan' => [9.9261341, 124.0127766], 'Cabulihan' => [9.9581000, 123.9825000],
            'Cahayag' => [9.9191773, 123.9268996], 'Cawayanan' => [9.9196423, 123.9960537],
            'Centro (Poblacion)' => [9.9527014, 123.9641958], 'Genonocan' => [9.9297957, 123.9614369],
            'Guiwanon' => [9.9388606, 123.9515103], 'Ilihan Norte' => [9.9193592, 123.9399687],
            'Ilihan Sur' => [9.9024045, 123.9569501], 'Libertad' => [9.8993561, 123.9853404],
            'Maca-as' => [9.9488000, 123.9395000], 'Matabao' => [9.9306703, 123.9122066],
            'Mocaboc Island' => [10.0713570, 123.9277520], 'Panadtaran' => [9.9108423, 123.9360046],
            'Panaytayon' => [9.9329485, 123.9331967], 'Pandan' => [9.9305907, 123.9236453],
            'Pangapasan' => [9.9981126, 123.9412209], 'Pinayagan Norte' => [9.9386425, 123.9446627],
            'Pinayagan Sur' => [9.9293380, 123.9462900], 'Pooc Occidental (Poblacion)' => [9.9505695, 123.9610147],
            'Pooc Oriental (Poblacion)' => [9.9485009, 123.9635709], 'Potohan' => [9.9438099, 123.9606377],
            'Talenceras' => [9.9365330, 123.9817413], 'Tan-awan' => [9.9152078, 123.9737514],
            'Tinangnan' => [9.9528805, 123.9694683], 'Ubay' => [10.0244062, 123.9662936],
            'Ubojan' => [9.9385636, 123.9727905], 'Villanueva' => [9.9078638, 123.9315371],
        ];

        foreach ($coordinates as $name => [$latitude, $longitude]) {
            DB::table('barangays')->where('name', $name)->update(compact('latitude', 'longitude'));
        }
    }

    public function down(): void
    {
        // Coordinate corrections are intentionally retained.
    }
};
