<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssistanceApplication;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AssistanceApplicationController extends Controller
{
    public function index(Request $request)
    {
        $this->archiveExpiredReleasedApplications();

        $barangayIds = $request->user()?->role === 'barangay_technical_staff'
            ? $request->user()->assignedBarangayIds()
            : [];

        $query = AssistanceApplication::with('registrant.barangay')
            ->when(! $request->boolean('include_archived'), fn ($query) => $query->whereNull('archived_at'))
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->whereIn('barangay_id', $barangayIds)))
            ->when($this->sectorForRole($request->user()?->role), fn ($query, $sector) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
            ->when($request->registrant_id, fn ($query, $id) => $query->where('registrant_id', $id))
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->search, fn ($query, $search) => $query->where('program_name', 'like', "%{$search}%"))
            ->latest();

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $this->validated($request);
        $data['encoded_by'] = $request->user()->id;
        $application = AssistanceApplication::create($data)->load('registrant.barangay');
        $audit->log($request, 'assistance.created', $application);

        return response()->json($application, 201);
    }

    public function show(AssistanceApplication $assistanceApplication)
    {
        return response()->json($assistanceApplication->load('registrant.barangay'));
    }

    public function update(Request $request, AssistanceApplication $assistanceApplication, AuditLogger $audit)
    {
        $old = $assistanceApplication->toArray();
        $data = $this->validated($request, true);
        $assistanceApplication->update($data);
        $audit->log($request, 'assistance.updated', $assistanceApplication, $old, $assistanceApplication->fresh()->toArray());

        return response()->json($assistanceApplication->fresh()->load('registrant.barangay'));
    }

    public function destroy(Request $request, AssistanceApplication $assistanceApplication, AuditLogger $audit)
    {
        $data = $request->validate([
            'archive_reason' => ['required', 'string', 'max:180'],
        ]);
        $old = $assistanceApplication->toArray();
        $this->archiveApplication($assistanceApplication, $data['archive_reason'], $request->user()->id);
        $audit->log($request, 'assistance.archived', $assistanceApplication, $old, $assistanceApplication->fresh()->toArray());

        return response()->json(['message' => 'Assistance application archived and backed up.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'registrant_id' => [$required, 'exists:registrants,id'],
            'assistance_type' => [$required, 'string', 'max:120'],
            'program_name' => [$required, 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:pending,application_submitted,received_by_mao,forwarded_to_mswdo,under_review,approved,rejected,released'],
            'applied_at' => [$required, 'date'],
            'approved_at' => ['nullable', 'date'],
            'released_at' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);
    }

    private function archiveExpiredReleasedApplications(): void
    {
        AssistanceApplication::query()
            ->where('status', 'released')
            ->whereNull('archived_at')
            ->whereDate('released_at', '<=', now()->subWeek()->toDateString())
            ->get()
            ->each(fn (AssistanceApplication $application) => $this->archiveApplication($application, 'released_retention_elapsed'));
    }

    private function archiveApplication(AssistanceApplication $application, string $reason, ?int $userId = null): void
    {
        $application->forceFill([
            'archived_at' => now(),
            'archived_by' => $userId,
            'archive_reason' => $reason,
            'previous_status' => $application->status,
            'backup_payload' => $application->fresh()->load('registrant.barangay')->toArray(),
        ])->save();
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
