<?php

namespace App\Services;

use App\Models\Barangay;
use App\Models\Registrant;

class RegistryNumberService
{
    private const TUBIGON_REGION_CODE = '07';
    private const TUBIGON_PROVINCE_CODE = '12';
    private const TUBIGON_CITY_MUNICIPALITY_CODE = '45';

    private const TUBIGON_BARANGAY_CODES = [
        'bagongbanwa' => '001',
        'bunacan' => '002',
        'banlasan' => '003',
        'batasan' => '004',
        'bilangbilangan' => '005',
        'bosongon' => '006',
        'buenos aires' => '007',
        'cabulihan' => '008',
        'cahayag' => '009',
        'cawayanan' => '010',
        'centro' => '011',
        'centro poblacion' => '011',
        'genonocan' => '012',
        'guiwanon' => '013',
        'ilihan norte' => '014',
        'ilijan norte' => '014',
        'ilihan sur' => '015',
        'ilijan sur' => '015',
        'libertad' => '016',
        'maca-as' => '017',
        'macaas' => '017',
        'mocaboc island' => '018',
        'matabao' => '019',
        'panadtaran' => '020',
        'panaytayon' => '021',
        'pandan' => '022',
        'pangapasan' => '023',
        'pinayagan norte' => '024',
        'pinayagan sur' => '025',
        'pooc occidental' => '026',
        'pooc occidental poblacion' => '026',
        'pooc oriental' => '027',
        'pooc oriental poblacion' => '027',
        'potohan' => '028',
        'talenceras' => '029',
        'tan-awan' => '030',
        'tinangnan' => '031',
        'ubay' => '032',
        'ubay island' => '032',
        'ubojan' => '033',
        'villanueva' => '034',
    ];

    public function next(?int $barangayId = null): string
    {
        $prefix = $this->locationPrefix($barangayId);
        $last = Registrant::withTrashed()
            ->where('registry_number', 'like', $prefix.'%')
            ->orderByDesc('registry_number')
            ->value('registry_number');

        $sequence = $last ? ((int) substr(preg_replace('/\D/', '', $last), -6)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
    }

    private function locationPrefix(?int $barangayId): string
    {
        return self::TUBIGON_REGION_CODE
            .self::TUBIGON_PROVINCE_CODE
            .self::TUBIGON_CITY_MUNICIPALITY_CODE
            .$this->barangayCode($barangayId);
    }

    private function barangayCode(?int $barangayId): string
    {
        $barangay = $barangayId ? Barangay::find($barangayId) : null;
        $name = $this->normalizeBarangayName($barangay?->name);

        return self::TUBIGON_BARANGAY_CODES[$name] ?? '000';
    }

    private function normalizeBarangayName(?string $name): string
    {
        return trim(preg_replace('/\s+/', ' ', str_replace(['(', ')'], '', strtolower($name ?? ''))));
    }
}
