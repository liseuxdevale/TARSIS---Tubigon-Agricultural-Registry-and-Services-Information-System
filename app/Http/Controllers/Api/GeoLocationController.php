<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeoLocation;
use App\Models\Registrant;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GeoLocationController extends Controller
{
    private const TUBIGON_BOUNDS = [
        'min_latitude' => 9.86,
        'max_latitude' => 10.08,
        'min_longitude' => 123.88,
        'max_longitude' => 124.05,
    ];

    public function index(Request $request)
    {
        $query = GeoLocation::query()
            ->with(['farmer:id,registry_number,first_name,middle_name,last_name,suffix,barangay_id,sector,farm_location,email', 'farmer.barangay:id,name'])
            ->when($request->farmer_id ?: $request->registrant_id, fn ($query, $id) => $query->where('farmer_id', $id))
            ->when($request->barangay, fn ($query, $barangay) => $query->where('barangay', $barangay))
            ->when($request->barangay_id, fn ($query, $id) => $query->whereHas('farmer', fn ($subquery) => $subquery->where('barangay_id', $id)))
            ->latest('date_recorded')
            ->latest('id');

        $this->applyRoleScope($request, $query);
        $locations = $request->boolean('all') ? $query->limit(1000)->get() : $query->paginate($request->integer('per_page', 50));

        if ($request->boolean('geojson')) {
            $items = $locations instanceof \Illuminate\Contracts\Pagination\Paginator ? $locations->items() : $locations;

            return response()->json($this->toGeoJson(collect($items)));
        }

        return response()->json($locations);
    }

    public function preview(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:gpx,xml,csv,txt', 'max:10240'],
        ]);

        $file = $data['file'];
        $points = $this->parseUploadedFile($file);
        $this->abortIfInvalidPoints($points);

        return response()->json([
            'source_file' => $file->getClientOriginalName(),
            'count' => count($points),
            'points' => $points,
        ]);
    }

    public function upload(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'farmer_id' => ['required_without:registrant_id', 'exists:registrants,id'],
            'registrant_id' => ['required_without:farmer_id', 'exists:registrants,id'],
            'source_file' => ['nullable', 'string', 'max:255'],
            'commodity_type' => ['required', 'string', 'max:255'],
            'points' => ['required', 'array', 'min:1', 'max:5000'],
            'points.*.plot_name' => ['nullable', 'string', 'max:255'],
            'points.*.point_type' => ['required', Rule::in(['waypoint', 'track_point'])],
            'points.*.sequence_order' => ['nullable', 'integer', 'min:0'],
            'points.*.latitude' => ['required', 'numeric'],
            'points.*.longitude' => ['required', 'numeric'],
            'points.*.elevation' => ['nullable', 'numeric'],
            'points.*.date_recorded' => ['nullable', 'date'],
            'points.*.metadata' => ['nullable', 'array'],
        ]);

        $registrant = Registrant::with('barangay')->findOrFail($data['farmer_id'] ?? $data['registrant_id']);
        $this->authorizeRegistrantScope($request, $registrant);
        $this->abortIfInvalidPoints($data['points']);

        $created = DB::transaction(function () use ($data, $registrant, $request) {
            return collect($data['points'])->values()->map(function (array $point, int $index) use ($data, $registrant, $request) {
                return GeoLocation::create([
                    ...$point,
                    'farmer_id' => $registrant->id,
                    'commodity_type' => $data['commodity_type'],
                    'barangay' => $registrant->barangay?->name,
                    'uploaded_by' => $request->user()?->id,
                    'source_file' => $data['source_file'] ?? null,
                    'sequence_order' => $point['sequence_order'] ?? $index + 1,
                    'date_uploaded' => now(),
                ]);
            });
        });

        $audit->log($request, 'geo_locations.uploaded', $registrant, [], [
            'farmer_id' => $registrant->id,
            'source_file' => $data['source_file'] ?? null,
            'points' => $created->count(),
        ]);

        return response()->json([
            'message' => "Imported {$created->count()} GPS point(s).",
            'count' => $created->count(),
            'data' => $created->values(),
        ], 201);
    }

    private function parseUploadedFile(\Illuminate\Http\UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return $extension === 'csv'
            ? $this->parseCsv($file->getRealPath())
            : $this->parseGpx($file->getRealPath());
    }

    private function parseGpx(string $path): array
    {
        libxml_use_internal_errors(true);
        $xml = simplexml_load_file($path);
        abort_if(! $xml, 422, 'The GPX file could not be read.');

        $points = [];
        foreach ($xml->wpt ?? [] as $node) {
            $points[] = $this->pointFromXml($node, 'waypoint', null);
        }
        foreach ($xml->rte ?? [] as $route) {
            $sequenceOrder = 1;
            foreach ($route->rtept ?? [] as $node) {
                $points[] = $this->pointFromXml($node, 'track_point', $sequenceOrder++);
            }
        }
        foreach ($xml->trk ?? [] as $track) {
            foreach ($track->trkseg ?? [] as $segment) {
                $sequenceOrder = 1;
                foreach ($segment->trkpt ?? [] as $node) {
                    $points[] = $this->pointFromXml($node, 'track_point', $sequenceOrder++);
                }
            }
        }

        return array_values(array_filter($points));
    }

    private function pointFromXml(\SimpleXMLElement $node, string $type, ?int $sequenceOrder): ?array
    {
        $latitude = (float) $node['lat'];
        $longitude = (float) $node['lon'];

        return [
            'point_type' => $type,
            'plot_name' => $this->nullableString($node->name ?? null),
            'sequence_order' => $sequenceOrder,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'elevation' => isset($node->ele) ? (float) $node->ele : null,
            'date_recorded' => $this->parseDate($this->nullableString($node->time ?? null))?->toISOString(),
            'metadata' => [
                'description' => $this->nullableString($node->desc ?? null),
                'symbol' => $this->nullableString($node->sym ?? null),
            ],
        ];
    }

    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        abort_if(! $handle, 422, 'The CSV file could not be read.');

        $headers = fgetcsv($handle);
        abort_if(! $headers, 422, 'The CSV file is empty.');
        $headers = array_map(fn ($header) => strtolower(trim($header)), $headers);
        $points = [];

        while (($row = fgetcsv($handle)) !== false) {
            $record = array_combine($headers, array_slice(array_pad($row, count($headers), null), 0, count($headers)));
            $latitude = (float) ($record['latitude'] ?? $record['lat'] ?? 0);
            $longitude = (float) ($record['longitude'] ?? $record['lon'] ?? $record['lng'] ?? 0);
            if (! $this->validCoordinate($latitude, $longitude)) continue;

            $points[] = [
                'point_type' => $this->normalizePointType($record['point_type'] ?? $record['type'] ?? 'waypoint'),
                'plot_name' => $record['plot_name'] ?? $record['plot_code'] ?? $record['name'] ?? $record['label'] ?? null,
                'sequence_order' => isset($record['sequence_order']) ? (int) $record['sequence_order'] : null,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'elevation' => isset($record['elevation']) ? (float) $record['elevation'] : null,
                'date_recorded' => $this->parseDate($record['date_recorded'] ?? $record['recorded_at'] ?? $record['time'] ?? $record['timestamp'] ?? null)?->toISOString(),
                'metadata' => ['source' => 'csv'],
            ];
        }
        fclose($handle);

        return $points;
    }

    private function validCoordinate(float $latitude, float $longitude): bool
    {
        return $latitude >= -90 && $latitude <= 90 && $longitude >= -180 && $longitude <= 180 && ($latitude || $longitude);
    }

    private function normalizePointType(?string $type): string
    {
        return in_array($type, ['track_point', 'track', 'route', 'boundary', 'plot_boundary'], true) ? 'track_point' : 'waypoint';
    }

    private function inTubigonBounds(float $latitude, float $longitude): bool
    {
        return $latitude >= self::TUBIGON_BOUNDS['min_latitude']
            && $latitude <= self::TUBIGON_BOUNDS['max_latitude']
            && $longitude >= self::TUBIGON_BOUNDS['min_longitude']
            && $longitude <= self::TUBIGON_BOUNDS['max_longitude'];
    }

    private function abortIfInvalidPoints(array $points): void
    {
        $invalid = collect($points)->first(function (array $point) {
            $latitude = (float) ($point['latitude'] ?? 0);
            $longitude = (float) ($point['longitude'] ?? 0);

            return ! $this->validCoordinate($latitude, $longitude) || ! $this->inTubigonBounds($latitude, $longitude);
        });

        abort_if($invalid, 422, 'GPS coordinates must be valid and within Tubigon, Bohol bounds.');
    }

    private function toGeoJson($locations): array
    {
        return [
            'type' => 'FeatureCollection',
            'features' => $locations->map(fn (GeoLocation $location) => [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $location->longitude, (float) $location->latitude, $location->elevation ? (float) $location->elevation : null],
                ],
                'properties' => [
                    'id' => $location->id,
                    'farmer_id' => $location->farmer_id,
                    'registry_number' => $location->farmer?->registry_number,
                    'farmer_name' => $location->farmer?->full_name,
                    'plot_name' => $location->plot_name,
                    'commodity_type' => $location->commodity_type,
                    'point_type' => $location->point_type,
                    'sequence_order' => $location->sequence_order,
                    'barangay' => $location->barangay,
                    'date_recorded' => $location->date_recorded?->toISOString(),
                    'source_file' => $location->source_file,
                ],
            ])->values(),
        ];
    }

    private function parseDate(?string $value): ?Carbon
    {
        if (! $value) return null;
        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function nullableString(mixed $value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }

    private function applyRoleScope(Request $request, $query): void
    {
        $user = $request->user();
        if ($user?->role === 'farmer') {
            $query->whereHas('farmer', fn ($subquery) => $subquery->whereRaw('LOWER(email) = ?', [strtolower($user->email)]));
            return;
        }
        if ($user?->role === 'barangay_technical_staff') {
            $query->whereHas('farmer', fn ($subquery) => $subquery->whereIn('barangay_id', $user->assignedBarangayIds()));
        }
        $sector = $this->sectorForRole($user?->role);
        if ($sector) {
            $query->whereHas('farmer', fn ($subquery) => $subquery->where('sector', $sector));
        }
    }

    private function authorizeRegistrantScope(Request $request, Registrant $registrant): void
    {
        $user = $request->user();
        if ($user?->role === 'barangay_technical_staff') {
            abort_unless($user->hasBarangayAccess((int) $registrant->barangay_id), 403, 'This barangay is not assigned to your account.');
        }
        $sector = $this->sectorForRole($user?->role);
        abort_if($sector && $registrant->sector !== $sector, 403, 'Forbidden.');
    }

    private function sectorForRole(?string $role): ?string
    {
        return match ($role) {
            'crop_head' => 'farmer',
            'fish_head' => 'fisherfolk',
            'livestock_head' => 'livestock',
            'poultry_head' => 'poultry',
            default => null,
        };
    }
}
