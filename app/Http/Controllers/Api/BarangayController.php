<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barangay;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class BarangayController extends Controller
{
    public function index(Request $request)
    {
        $sector = $this->sectorForRole($request->user()?->role);
        $barangayIds = $request->user()?->role === 'barangay_technical_staff'
            ? $request->user()->assignedBarangayIds()
            : [];

        $query = Barangay::query()
            ->withCount(['registrants' => fn ($query) => $query->when($sector, fn ($query) => $query->where('sector', $sector))])
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereIn('id', $barangayIds))
            ->when($request->search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->enrollment_status, fn ($query, $status) => $query->where('enrollment_status', $status))
            ->when($sector, fn ($query) => $query->orderByDesc('registrants_count'))
            ->orderBy('name');

        $decorate = fn ($rows) => $rows->each(fn ($barangay) => $barangay->setAttribute('enrollment_status', $barangay->current_enrollment_status));

        if ($request->boolean('all')) {
            return response()->json($decorate($query->get()));
        }

        $page = $query->paginate($request->integer('per_page', 20));
        $decorate($page->getCollection());

        return response()->json($page);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $barangay = Barangay::create($this->validated($request));
        $audit->log($request, 'barangay.created', $barangay);

        return response()->json($barangay, 201);
    }

    public function show(Barangay $barangay)
    {
        return response()->json($barangay->loadCount('registrants'));
    }

    public function update(Request $request, Barangay $barangay, AuditLogger $audit)
    {
        if ($request->user()?->role === 'barangay_technical_staff') {
            abort_unless(
                $request->user()->hasBarangayAccess((int) $barangay->id),
                403,
                'This barangay is not assigned to your account.',
            );
        }

        $old = $barangay->toArray();
        $barangay->update($this->validated($request, true));
        $audit->log($request, 'barangay.updated', $barangay, $old, $barangay->fresh()->toArray());

        return response()->json($barangay->fresh()->loadCount('registrants'));
    }

    public function destroy(Request $request, Barangay $barangay, AuditLogger $audit)
    {
        $barangay->delete();
        $audit->log($request, 'barangay.deleted', $barangay);

        return response()->json(['message' => 'Barangay deleted.']);
    }

    public function export()
    {
        $rows = Barangay::withCount('registrants')->orderBy('name')->get();
        $csv = "barangay,registrants,target,enrollment_status,technical_personnel,underserved\n";

        foreach ($rows as $row) {
            $csv .= implode(',', [
                $row->name,
                $row->registrants_count,
                $row->registrant_target,
                $row->enrollment_status,
                $row->assigned_technical_personnel,
                $row->is_underserved ? 'yes' : 'no',
            ])."\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=tarsis-barangays.csv',
        ]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:120'],
            'latitude' => [$required, 'numeric'],
            'longitude' => [$required, 'numeric'],
            'enrollment_schedule' => ['nullable', 'date'],
            'enrollment_status' => ['sometimes', 'in:open,closed'],
            'open_time' => ['nullable', 'date_format:H:i:s'],
            'close_time' => ['nullable', 'date_format:H:i:s', 'after:open_time'],
            'assigned_technical_personnel' => ['nullable', 'string'],
            'mao_office_details' => ['nullable', 'string'],
            'registrant_target' => ['sometimes', 'integer', 'min:0'],
            'is_underserved' => ['sometimes', 'boolean'],
        ]);
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
