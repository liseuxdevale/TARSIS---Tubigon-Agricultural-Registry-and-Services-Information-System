<?php

use App\Models\Registrant;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Registrant::withTrashed()
            ->whereNotNull('rsbsa_payload')
            ->chunkById(100, function ($registrants) {
                foreach ($registrants as $registrant) {
                    $payload = $registrant->rsbsa_payload ?? [];
                    unset(
                        $payload['pwd'],
                        $payload['mother_maiden_name'],
                        $payload['indigenous'],
                        $payload['indigenous_group'],
                        $payload['farming_income'],
                        $payload['non_farming_income'],
                    );

                    $payload['parcels'] = collect($payload['parcels'] ?? [])
                        ->map(function (array $parcel) {
                            unset($parcel['ownership_document_number'], $parcel['owner_name']);
                            $parcel['ownership_type'] = 'Others';
                            $parcel['commodities'] = collect($parcel['commodities'] ?? [])
                                ->map(function (array $commodity) {
                                    unset($commodity['farm_type'], $commodity['organic']);

                                    return $commodity;
                                })
                                ->values()
                                ->all();

                            return $parcel;
                        })
                        ->values()
                        ->all();

                    $registrant->forceFill(['rsbsa_payload' => $payload])->save();
                }
            });
    }

    public function down(): void
    {
        //
    }
};
