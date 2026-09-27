<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    private const STAFF_ROLES = ['super_admin', 'mao_staff', 'barangay_technical_staff', 'crop_head', 'fish_head', 'livestock_head', 'poultry_head'];

    public function index(Request $request)
    {
        $sort = in_array($request->input('sort'), ['name', 'email', 'phone', 'role', 'status', 'last_login_at', 'created_at'], true)
            ? $request->input('sort')
            : 'name';
        $hasArchiveColumns = Schema::hasColumn('users', 'archived_at');

        $query = User::with(['barangay', 'barangays', 'createdBy:id,name', 'archivedBy:id,name', 'registrant:id,email,sector,registry_number'])
            ->when($hasArchiveColumns && ! $request->boolean('archived'), fn ($query) => $query->whereNull('archived_at'))
            ->when($hasArchiveColumns && $request->boolean('archived'), fn ($query) => $query->whereNotNull('archived_at'))
            ->when(! $hasArchiveColumns && $request->boolean('archived'), fn ($query) => $query->whereRaw('1 = 0'))
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%");
                });
            })
            ->when($request->role, function ($query, $role) {
                if (str_starts_with($role, 'sector:')) {
                    $sector = str($role)->after('sector:')->toString();

                    return $query->where('role', 'farmer')
                        ->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector));
                }

                return $query->where('role', $role);
            })
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->barangay, function ($query, $barangay) {
                if ($barangay === 'municipal') {
                    $query->whereDoesntHave('barangays')->whereNull('barangay_id');
                } else {
                    $query->where(function ($query) use ($barangay) {
                        $query->where('barangay_id', $barangay)
                            ->orWhereHas('barangays', fn ($barangays) => $barangays->where('barangays.id', $barangay));
                    });
                }
            })
            ->orderBy($sort, $request->input('direction') === 'desc' ? 'desc' : 'asc');

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    public function stats()
    {
        if (! Schema::hasColumn('users', 'archived_at')) {
            return response()->json([
                'total' => User::count(),
                'active' => User::where('status', 'active')->count(),
                'inactive' => User::where('status', 'inactive')->count(),
                'archived' => 0,
            ]);
        }

        return response()->json([
            'total' => User::whereNull('archived_at')->count(),
            'active' => User::whereNull('archived_at')->where('status', 'active')->count(),
            'inactive' => User::whereNull('archived_at')->where('status', 'inactive')->count(),
            'archived' => User::whereNotNull('archived_at')->count(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $this->validated($request);
        $barangayIds = $this->barangayIdsForRole($data['role'], $data['barangay_ids'] ?? []);
        unset($data['barangay_ids']);
        $data['barangay_id'] = $barangayIds[0] ?? null;
        $data['password'] = Hash::make($data['password']);
        $data['created_by'] = $request->user()?->id;
        $data['username'] ??= str($data['email'])->before('@')->lower()->toString();
        $user = User::create($data);
        $user->barangays()->sync($barangayIds);
        $user->load(['barangay', 'barangays']);
        $audit->log($request, 'user.created', $user);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user, AuditLogger $audit)
    {
        $old = $user->toArray();
        $data = $this->validated($request, true, $user);
        $shouldSyncBarangays = array_key_exists('barangay_ids', $data) || array_key_exists('role', $data);
        $role = $data['role'] ?? $user->role;
        $barangayIds = $this->barangayIdsForRole(
            $role,
            $data['barangay_ids'] ?? $user->assignedBarangayIds(),
        );
        unset($data['barangay_ids']);
        if ($shouldSyncBarangays) {
            $data['barangay_id'] = $barangayIds[0] ?? null;
        }
        unset($data['password']);
        $user->update($data);
        if ($shouldSyncBarangays) {
            $user->barangays()->sync($barangayIds);
        }
        $audit->log($request, 'user.updated', $user, $old, $user->fresh()->toArray());

        return response()->json($user->fresh()->load(['barangay', 'barangays']));
    }

    public function activate(Request $request, User $user, AuditLogger $audit)
    {
        $user->update(['status' => 'active']);
        $audit->log($request, 'user.activated', $user);

        return response()->json($user->fresh());
    }

    public function deactivate(Request $request, User $user, AuditLogger $audit)
    {
        $user->update(['status' => 'inactive']);
        $audit->log($request, 'user.deactivated', $user);

        return response()->json($user->fresh());
    }

    public function archive(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate([
            'reason' => ['required', 'in:Inactive Employee,Transferred,Duplicate Account,Resigned,Other'],
            'reason_details' => ['nullable', 'required_if:reason,Other', 'string', 'max:1000'],
        ]);

        $user->update([
            'status' => 'archived',
            'archived_at' => now(),
            'archived_by' => $request->user()?->id,
            'archive_reason' => $data['reason'],
            'archive_reason_details' => $data['reason_details'] ?? null,
        ]);
        $audit->log($request, 'user.archived', $user, [], $data);

        return response()->json($user->fresh());
    }

    public function restore(Request $request, User $user, AuditLogger $audit)
    {
        $user->update([
            'status' => 'inactive',
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
            'archive_reason_details' => null,
        ]);
        $audit->log($request, 'user.restored', $user);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user, AuditLogger $audit)
    {
        $old = $user->toArray();
        $audit->log($request, 'user.deleted', $user, $old);
        $user->barangays()->detach();
        $user->delete();

        return response()->json(['message' => 'User permanently deleted.']);
    }

    public function grantRole(Request $request, User $user, AuditLogger $audit)
    {
        if (
            $request->input('role') === 'barangay_technical_staff'
            && ! $request->has('barangay_ids')
            && $request->filled('barangay_id')
        ) {
            $request->merge(['barangay_ids' => [(int) $request->input('barangay_id')]]);
        }

        $data = $request->validate([
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'barangay_ids' => [
                Rule::requiredIf(fn () => $request->input('role') === 'barangay_technical_staff'),
                'array',
                'min:1',
            ],
            'barangay_ids.*' => [
                'integer',
                'distinct',
                'exists:barangays,id',
            ],
        ]);

        $old = $user->toArray();
        $role = $data['role'];
        $barangayIds = $this->barangayIdsForRole($role, $data['barangay_ids'] ?? []);

        $user->update([
            'role' => $role,
            'requested_role' => null,
            'status' => 'active',
            'rejection_reason' => null,
            'barangay_id' => $barangayIds[0] ?? null,
            'permissions' => $this->defaultPermissions($role),
        ]);
        $user->barangays()->sync($barangayIds);

        $audit->log($request, 'user.role_granted', $user, $old, $user->fresh()->toArray());
        $this->notifyAccountRequest($user->fresh(), 'role_granted', 'Your TARSIS account role has been updated.');

        return response()->json($user->fresh()->load(['barangay', 'barangays']));
    }

    public function updateBarangays(Request $request, User $user, AuditLogger $audit)
    {
        abort_unless(
            $user->role === 'barangay_technical_staff',
            422,
            'Barangay assignments are only available for barangay technical staff.',
        );

        $data = $request->validate([
            'barangay_ids' => ['required', 'array', 'min:1'],
            'barangay_ids.*' => ['integer', 'distinct', 'exists:barangays,id'],
        ]);
        $barangayIds = $this->barangayIdsForRole($user->role, $data['barangay_ids']);
        $old = $user->load('barangays')->toArray();

        $user->update(['barangay_id' => $barangayIds[0]]);
        $user->barangays()->sync($barangayIds);
        $fresh = $user->fresh()->load(['barangay', 'barangays']);
        $audit->log($request, 'user.barangays_updated', $user, $old, $fresh->toArray());

        return response()->json($fresh);
    }

    public function resetPassword(Request $request, User $user, AuditLogger $audit)
    {
        $data = $request->validate(['password' => ['required', 'string', 'min:8']]);
        $user->update(['password' => Hash::make($data['password'])]);
        $audit->log($request, 'user.password_reset', $user);

        return response()->json(['message' => 'Password reset.']);
    }

    private function validated(Request $request, bool $partial = false, ?User $user = null): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $role = $request->input('role', $user?->role);

        if (
            $role === 'barangay_technical_staff'
            && ! $request->has('barangay_ids')
            && $request->filled('barangay_id')
        ) {
            $request->merge(['barangay_ids' => [(int) $request->input('barangay_id')]]);
        }

        if ($request->filled('phone')) {
            $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);
        }

        return $request->validate([
            'name' => [$required, 'string', 'max:120'],
            'username' => [$partial ? 'sometimes' : 'nullable', 'nullable', 'string', 'max:80', Rule::unique('users')->ignore($user)],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'email' => [$required, 'email', Rule::unique('users')->ignore($user)],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/', Rule::unique('users')->ignore($user)],
            'office_department' => ['nullable', 'string', 'max:180'],
            'password' => [$partial ? 'sometimes' : 'required', 'string', 'min:8'],
            'role' => [$required, Rule::in(self::STAFF_ROLES)],
            'requested_role' => ['nullable', Rule::in(self::STAFF_ROLES)],
            'status' => ['sometimes', 'in:active,inactive,pending,rejected,archived'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['nullable', 'array'],
            'barangay_id' => ['nullable', 'exists:barangays,id'],
            'barangay_ids' => [
                Rule::requiredIf(fn () => $role === 'barangay_technical_staff' && (! $partial || $request->has('role'))),
                'array',
                'min:1',
            ],
            'barangay_ids.*' => ['integer', 'distinct', 'exists:barangays,id'],
        ]);
    }

    private function barangayIdsForRole(string $role, array $barangayIds): array
    {
        if ($role !== 'barangay_technical_staff') {
            return [];
        }

        return collect($barangayIds)->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        return str_starts_with($digits, '639') && strlen($digits) === 12
            ? '0'.substr($digits, 2)
            : $digits;
    }

    private function defaultPermissions(string $role): array
    {
        return match ($role) {
            'super_admin' => ['*'],
            'mao_staff' => ['registrants', 'assistance', 'insurance', 'announcements'],
            'barangay_technical_staff' => ['registrants:view', 'registrants:create'],
            'crop_head' => ['registrants:farmer', 'assistance', 'insurance', 'announcements'],
            'fish_head' => ['registrants:fisherfolk', 'assistance', 'insurance', 'announcements'],
            'livestock_head' => ['registrants:livestock', 'assistance', 'insurance', 'announcements'],
            'poultry_head' => ['registrants:poultry', 'assistance', 'insurance', 'announcements'],
            default => [],
        };
    }

    private function notifyAccountRequest(User $user, string $status, string $message): void
    {
        NotificationDelivery::create([
            'channel' => 'account',
            'recipient' => $user->email,
            'status' => 'sent',
            'message' => $message,
            'provider_response' => ['user_id' => $user->id, 'account_status' => $status],
            'sent_at' => now(),
        ]);
    }
}
