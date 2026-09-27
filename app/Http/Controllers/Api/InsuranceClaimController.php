<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InsuranceClaim;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class InsuranceClaimController extends Controller
{
    public function index(Request $request)
    {
        $barangayIds = $request->user()?->role === 'barangay_technical_staff'
            ? $request->user()->assignedBarangayIds()
            : [];

        $query = InsuranceClaim::with('registrant.barangay')
            ->whereNull('archived_at')
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->whereIn('barangay_id', $barangayIds)))
            ->when($this->sectorForRole($request->user()?->role), fn ($query, $sector) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
            ->when($request->registrant_id, fn ($query, $id) => $query->where('registrant_id', $id))
            ->when($request->claim_type, fn ($query, $type) => $query->where('claim_type', $type))
            ->when($request->approval_status, fn ($query, $status) => $query->where('approval_status', $status))
            ->latest();

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $this->validated($request);
        $data['encoded_by'] = $request->user()->id;
        $claim = InsuranceClaim::create($data)->load('registrant.barangay');
        $audit->log($request, 'insurance.created', $claim);

        return response()->json($claim, 201);
    }

    public function show(InsuranceClaim $insuranceClaim)
    {
        return response()->json($insuranceClaim->load('registrant.barangay'));
    }

    public function update(Request $request, InsuranceClaim $insuranceClaim, AuditLogger $audit)
    {
        $old = $insuranceClaim->toArray();
        $data = $this->validated($request, true);

        if (($data['release_status'] ?? null) !== null && $data['release_status'] !== 'released') {
            $data['archived_at'] = null;
        }

        $insuranceClaim->update($data);
        $audit->log($request, 'insurance.updated', $insuranceClaim, $old, $insuranceClaim->fresh()->toArray());

        return response()->json($insuranceClaim->fresh()->load('registrant.barangay'));
    }

    public function destroy(Request $request, InsuranceClaim $insuranceClaim, AuditLogger $audit)
    {
        $data = $request->validate([
            'archive_reason' => ['required', 'string', 'max:180'],
        ]);
        $old = $insuranceClaim->toArray();
        $insuranceClaim->forceFill([
            'archived_at' => now(),
            'archived_by' => $request->user()->id,
            'archive_reason' => $data['archive_reason'],
            'previous_status' => $insuranceClaim->release_status === 'released' ? 'released' : $insuranceClaim->approval_status,
        ])->save();
        $audit->log($request, 'insurance.archived', $insuranceClaim, $old, $insuranceClaim->fresh()->toArray());

        return response()->json(['message' => 'Insurance claim archived.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'registrant_id' => [$required, 'exists:registrants,id'],
            'claim_type' => [$required, 'string', 'max:120'],
            'policy_number' => ['nullable', 'string', 'max:120'],
            'calamity_event' => ['nullable', 'string', 'max:180'],
            'incident_date' => ['nullable', 'date'],
            'estimated_loss' => ['nullable', 'numeric'],
            'endorsement_status' => ['sometimes', 'in:pending,endorsed,returned,claim_submitted,documents_verified,forwarded_to_pcic'],
            'approval_status' => ['sometimes', 'in:pending,under_processing,approved,rejected,denied'],
            'release_status' => ['sometimes', 'in:pending,released'],
            'remarks' => ['nullable', 'string'],
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
