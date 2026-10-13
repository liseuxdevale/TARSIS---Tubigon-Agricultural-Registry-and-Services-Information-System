<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssistanceApplication;
use App\Models\InsuranceClaim;
use App\Models\Registrant;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ArchivedRecordController extends Controller
{
    public function registrants(Request $request)
    {
        $sector = $this->sectorForRole($request->user()?->role);
        $query = Registrant::onlyTrashed()
            ->with(['barangay', 'archivedBy:id,name'])
            ->when($sector, fn (Builder $query, string $sector) => $query->where('sector', $sector))
            ->when($request->search, function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('registry_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->sector, fn (Builder $query, string $sector) => $query->where('sector', $sector))
            ->when($request->barangay_id, fn (Builder $query, string $barangayId) => $query->where('barangay_id', $barangayId))
            ->when($request->archived_date, fn (Builder $query, string $date) => $query->whereDate('archived_at', $date))
            ->when($request->archived_by, fn (Builder $query, string $userId) => $query->where('archived_by', $userId))
            ->latest('archived_at');

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function assistance(Request $request)
    {
        $sector = $this->sectorForRole($request->user()?->role);
        $query = AssistanceApplication::query()
            ->with(['registrant' => fn ($query) => $query->withTrashed()->with('barangay'), 'archivedBy:id,name'])
            ->whereNotNull('archived_at')
            ->when($sector, fn (Builder $query, string $sector) => $query->whereHas('registrant', fn (Builder $registrant) => $registrant->withTrashed()->where('sector', $sector)))
            ->when($request->search, function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('id', $search)
                        ->orWhere('assistance_type', 'like', "%{$search}%")
                        ->orWhereHas('registrant', fn (Builder $registrant) => $registrant
                            ->withTrashed()
                            ->where(function ($query) use ($search) { $query
                            ->where('registry_number', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%"); }));
                });
            })
            ->when($request->assistance_type, fn (Builder $query, string $type) => $query->where('assistance_type', $type))
            ->when($request->barangay_id, fn (Builder $query, string $barangayId) => $query->whereHas('registrant', fn (Builder $registrant) => $registrant->withTrashed()->where('barangay_id', $barangayId)))
            ->when($request->archived_date, fn (Builder $query, string $date) => $query->whereDate('archived_at', $date))
            ->latest('archived_at');

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function insurance(Request $request)
    {
        $sector = $this->sectorForRole($request->user()?->role);
        $query = InsuranceClaim::query()
            ->with(['registrant' => fn ($query) => $query->withTrashed()->with('barangay'), 'archivedBy:id,name'])
            ->whereNotNull('archived_at')
            ->when($sector, fn (Builder $query, string $sector) => $query->whereHas('registrant', fn (Builder $registrant) => $registrant->withTrashed()->where('sector', $sector)))
            ->when($request->search, function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('id', $search)
                        ->orWhere('claim_type', 'like', "%{$search}%")
                        ->orWhereHas('registrant', fn (Builder $registrant) => $registrant
                            ->withTrashed()
                            ->where(function ($query) use ($search) { $query
                            ->where('registry_number', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%"); }));
                });
            })
            ->when($request->claim_type, fn (Builder $query, string $type) => $query->where('claim_type', $type))
            ->when($request->claim_status, fn (Builder $query, string $status) => $query->where('previous_status', $status))
            ->when($request->barangay_id, fn (Builder $query, string $barangayId) => $query->whereHas('registrant', fn (Builder $registrant) => $registrant->withTrashed()->where('barangay_id', $barangayId)))
            ->when($request->archived_date, fn (Builder $query, string $date) => $query->whereDate('archived_at', $date))
            ->latest('archived_at');

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function restoreRegistrant(Request $request, string $id, AuditLogger $audit)
    {
        $registrant = Registrant::onlyTrashed()->findOrFail($id);
        $this->authorizeRegistrantSectorScope($request, $registrant);
        $old = $registrant->toArray();
        $registrant->restore();
        $registrant->forceFill([
            'status' => $registrant->previous_status ?: 'pending',
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
            'previous_status' => null,
        ])->save();
        $audit->log($request, 'registrant.restored', $registrant, $old, $registrant->fresh()->toArray());

        return response()->json($registrant->fresh()->load('barangay'));
    }

    public function deleteRegistrant(Request $request, string $id, AuditLogger $audit)
    {
        $registrant = Registrant::onlyTrashed()->findOrFail($id);
        $this->authorizeRegistrantSectorScope($request, $registrant);
        $old = $registrant->toArray();
        $audit->log($request, 'registrant.force_deleted', $registrant, $old);
        $registrant->forceDelete();

        return response()->json(['message' => 'Registrant permanently deleted.']);
    }

    public function restoreAssistance(Request $request, AssistanceApplication $assistanceApplication, AuditLogger $audit)
    {
        $this->authorizeRelatedRegistrantSectorScope($request, $assistanceApplication);
        $old = $assistanceApplication->toArray();
        $assistanceApplication->forceFill([
            'status' => $assistanceApplication->previous_status ?: $assistanceApplication->status,
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
            'previous_status' => null,
            'backup_payload' => null,
        ])->save();
        $audit->log($request, 'assistance.restored', $assistanceApplication, $old, $assistanceApplication->fresh()->toArray());

        return response()->json($assistanceApplication->fresh()->load('registrant.barangay'));
    }

    public function deleteAssistance(Request $request, AssistanceApplication $assistanceApplication, AuditLogger $audit)
    {
        abort_unless($assistanceApplication->archived_at, 404);
        $this->authorizeRelatedRegistrantSectorScope($request, $assistanceApplication);
        $old = $assistanceApplication->toArray();
        $audit->log($request, 'assistance.force_deleted', $assistanceApplication, $old);
        $assistanceApplication->delete();

        return response()->json(['message' => 'Assistance application permanently deleted.']);
    }

    public function restoreInsurance(Request $request, InsuranceClaim $insuranceClaim, AuditLogger $audit)
    {
        $this->authorizeRelatedRegistrantSectorScope($request, $insuranceClaim);
        $old = $insuranceClaim->toArray();
        $insuranceClaim->forceFill([
            'approval_status' => $insuranceClaim->previous_status ?: $insuranceClaim->approval_status,
            'release_status' => $insuranceClaim->previous_status === 'released' ? 'released' : 'pending',
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
            'previous_status' => null,
        ])->save();
        $audit->log($request, 'insurance.restored', $insuranceClaim, $old, $insuranceClaim->fresh()->toArray());

        return response()->json($insuranceClaim->fresh()->load('registrant.barangay'));
    }

    public function deleteInsurance(Request $request, InsuranceClaim $insuranceClaim, AuditLogger $audit)
    {
        abort_unless($insuranceClaim->archived_at, 404);
        $this->authorizeRelatedRegistrantSectorScope($request, $insuranceClaim);
        $old = $insuranceClaim->toArray();
        $audit->log($request, 'insurance.force_deleted', $insuranceClaim, $old);
        $insuranceClaim->delete();

        return response()->json(['message' => 'Insurance application permanently deleted.']);
    }

    private function authorizeRegistrantSectorScope(Request $request, Registrant $registrant): void
    {
        $sector = $this->sectorForRole($request->user()?->role);
        if (! $sector) {
            return;
        }

        abort_unless($registrant->sector === $sector, 403, 'Forbidden.');
    }

    private function authorizeRelatedRegistrantSectorScope(Request $request, AssistanceApplication|InsuranceClaim $record): void
    {
        $sector = $this->sectorForRole($request->user()?->role);
        if (! $sector) {
            return;
        }

        abort_unless($record->registrant()->where('sector', $sector)->exists(), 403, 'Forbidden.');
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
