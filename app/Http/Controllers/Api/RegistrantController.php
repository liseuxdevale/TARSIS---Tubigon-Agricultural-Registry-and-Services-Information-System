<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registrant;
use App\Services\AuditLogger;
use App\Services\QrCodeService;
use App\Services\RegistryNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RegistrantController extends Controller
{
    public function index(Request $request)
    {
        $barangayIds = $request->user()?->role === 'barangay_technical_staff'
            ? $request->user()->assignedBarangayIds()
            : [];

        $query = Registrant::query()
            ->with('barangay')
            ->withCount(['assistanceApplications', 'insuranceClaims'])
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereIn('barangay_id', $barangayIds))
            ->when($this->sectorForRole($request->user()?->role), fn ($query, $sector) => $query->where('sector', $sector))
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('registry_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->sector, fn ($query, $sector) => $query->where('sector', $sector))
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->barangay_id, fn ($query, $barangayId) => $query->where('barangay_id', $barangayId));

        $request->input('sort') === 'recently_edited'
            ? $query->orderByDesc('updated_at')->orderByDesc('id')
            : $query->latest();

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function rsbsaBulk(Request $request)
    {
        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'search' => ['nullable', 'string'],
            'sector' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'barangay_id' => ['nullable', 'integer'],
        ]);

        $barangayIds = $request->user()?->role === 'barangay_technical_staff'
            ? $request->user()->assignedBarangayIds()
            : [];

        $query = Registrant::query()
            ->with('barangay')
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereIn('barangay_id', $barangayIds))
            ->when($this->sectorForRole($request->user()?->role), fn ($query, $sector) => $query->where('sector', $sector))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('registry_number', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($data['sector'] ?? null, fn ($query, $sector) => $query->where('sector', $sector))
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['barangay_id'] ?? null, fn ($query, $barangayId) => $query->where('barangay_id', $barangayId))
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(rsbsa_payload, '$.date_administered')) >= ?", [$data['date_from']])
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(rsbsa_payload, '$.date_administered')) <= ?", [$data['date_to']])
            ->orderByRaw("JSON_UNQUOTE(JSON_EXTRACT(rsbsa_payload, '$.date_administered')) desc")
            ->orderByDesc('id')
            ->limit(100);

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request, RegistryNumberService $registry, AuditLogger $audit)
    {
        $this->normalizeStructuredPayloads($request);
        $data = $this->validated($request);
        if ($request->user()?->role === 'barangay_technical_staff') {
            abort_unless(
                $request->user()->hasBarangayAccess((int) $data['barangay_id']),
                403,
                'This barangay is not assigned to your account.',
            );
        }
        $referenceId = $data['rsbsa_payload']['reference_id'] ?? null;
        if ($request->user() && ($data['rsbsa_payload']['enrollment_type'] ?? null) === 'Updating' && $referenceId) {
            $registrant = Registrant::query()
                ->where('registry_number', $referenceId)
                ->first();

            if ($registrant) {
                $this->authorizeBarangayScope($request, $registrant);
                $old = $registrant->toArray();
                if ($request->hasFile('photo')) {
                    $data['photo_path'] = $request->file('photo')->store('registrant-photos', 'public');
                }
                unset($data['photo'], $data['registry_number']);

                $registrant->update($data);
                $audit->log($request, 'registrant.updated', $registrant, $old, $registrant->fresh()->toArray());

                return response()->json($registrant->fresh()->load('barangay'));
            }
        }
        $data['registry_number'] = $registry->next((int) $data['barangay_id']);
        $data['status'] = $data['status'] ?? 'pending';
        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('registrant-photos', 'public');
        } elseif (($data['rsbsa_payload']['enrollment_type'] ?? null) === 'Updating') {
            $referenceRegistrant = Registrant::query()
                ->where('registry_number', $data['rsbsa_payload']['reference_id'] ?? null)
                ->first();

            if ($referenceRegistrant?->photo_path) {
                $data['photo_path'] = $referenceRegistrant->photo_path;
            }
        }
        unset($data['photo']);

        $registrant = Registrant::create($data)->load('barangay');
        $audit->log($request, 'registrant.created', $registrant, [], $registrant->toArray());

        return response()->json($registrant, 201);
    }

    public function show(Request $request, Registrant $registrant)
    {
        $this->authorizeBarangayScope($request, $registrant);

        return response()->json($registrant->load(['barangay', 'assistanceApplications', 'insuranceClaims']));
    }

    public function publicProfile(string $registryNumber)
    {
        $registrant = Registrant::with(['barangay', 'assistanceApplications', 'insuranceClaims'])
            ->where('registry_number', $registryNumber)
            ->where('status', 'approved')
            ->firstOrFail();

        return response()->json($registrant);
    }

    public function trackingProfile(Request $request, string $registryNumber)
    {
        $registrant = Registrant::with(['barangay', 'assistanceApplications', 'insuranceClaims'])
            ->where('registry_number', $registryNumber)
            ->firstOrFail();

        $staffRoles = ['super_admin', 'mao_staff', 'barangay_technical_staff', 'crop_head', 'fish_head', 'livestock_head', 'poultry_head'];
        $isStaff = in_array($request->user()->role, $staffRoles, true);
        $ownsRecord = $registrant->email
            && strcasecmp($registrant->email, $request->user()->email) === 0;

        abort_unless($isStaff || $ownsRecord, 403, 'This registry record is not linked to your account email.');

        $this->authorizeBarangayScope($request, $registrant);

        return response()->json($registrant);
    }

    public function myTrackingProfile(Request $request)
    {
        $registrants = Registrant::with(['barangay', 'assistanceApplications', 'insuranceClaims'])
            ->whereNotNull('email')
            ->whereRaw('LOWER(email) = ?', [strtolower($request->user()->email)])
            ->latest('id')
            ->get();

        $registrant = $registrants->first();

        if ($registrant && $registrants->count() > 1) {
            $registrant->setRelation('assistanceApplications', $registrants->flatMap->assistanceApplications->sortByDesc('applied_at')->values());
            $registrant->setRelation('insuranceClaims', $registrants->flatMap->insuranceClaims->sortByDesc('incident_date')->values());
        }

        return response()->json(['registrant' => $registrant]);
    }

    public function rsbsaPreview(string $registryNumber, QrCodeService $qr)
    {
        $registrant = Registrant::with('barangay')
            ->where('registry_number', $registryNumber)
            ->first();

        if (! $registrant) {
            return response()->json([
                'found' => false,
                'registry_number' => $registryNumber,
                'message' => 'No registration record was found for this registry number.',
            ]);
        }

        $payload = url("/profile/{$registrant->registry_number}");
        $registrant->setAttribute('qr_payload', $payload);
        $registrant->setAttribute('qr_image_url', 'https://api.qrserver.com/v1/create-qr-code/?size=900x900&qzone=0&data='.urlencode($payload));
        $registrant->setAttribute('qr_svg', $qr->svg($payload, 900));
        $registrant->setAttribute('found', true);

        return response()->json($registrant);
    }

    public function update(Request $request, Registrant $registrant, AuditLogger $audit)
    {
        $this->authorizeBarangayScope($request, $registrant);
        abort_unless(
            $this->isStaffUser($request) || $this->ownsRegistrantRecord($request, $registrant),
            403,
            'This registry record is not linked to your account email.',
        );

        $old = $registrant->toArray();
        $this->normalizeStructuredPayloads($request);
        $data = $this->validated($request, partial: true);
        if ($request->user()?->role === 'barangay_technical_staff') {
            unset($data['status']);
            $targetBarangayId = (int) ($data['barangay_id'] ?? $registrant->barangay_id);
            abort_unless(
                $request->user()->hasBarangayAccess($targetBarangayId),
                403,
                'This barangay is not assigned to your account.',
            );
        }
        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('registrant-photos', 'public');
        }
        unset($data['photo']);
        $registrant->update($data);
        $audit->log($request, 'registrant.updated', $registrant, $old, $registrant->fresh()->toArray());

        return response()->json($registrant->fresh()->load('barangay'));
    }

    private function normalizeStructuredPayloads(Request $request): void
    {
        if (is_string($request->input('rsbsa_payload'))) {
            $request->merge(['rsbsa_payload' => json_decode($request->input('rsbsa_payload'), true)]);
        }
        if (is_array($request->input('rsbsa_payload'))) {
            $request->merge(['rsbsa_payload' => $this->sanitizeRsbsaPayload($request->input('rsbsa_payload'))]);
        }
        if (is_string($request->input('expected_production'))) {
            $request->merge(['expected_production' => json_decode($request->input('expected_production'), true)]);
        }
    }

    public function destroy(Request $request, Registrant $registrant, AuditLogger $audit)
    {
        abort_unless($request->user()?->hasRole(['super_admin', 'mao_staff']), 403, 'Forbidden.');
        $data = $request->validate([
            'archive_reason' => ['required', 'string', 'max:180'],
        ]);
        $old = $registrant->toArray();
        $registrant->forceFill([
            'archived_at' => now(),
            'archived_by' => $request->user()->id,
            'archive_reason' => $data['archive_reason'],
            'previous_status' => $registrant->status,
        ])->save();
        $registrant->delete();
        $audit->log($request, 'registrant.archived', $registrant, $old, $registrant->toArray());

        return response()->json(['message' => 'Registrant archived.']);
    }

    public function approve(Request $request, Registrant $registrant, AuditLogger $audit)
    {
        $this->authorizeBarangayScope($request, $registrant);
        $registrant->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ]);
        $audit->log($request, 'registrant.approved', $registrant);

        return response()->json($registrant->fresh()->load('barangay'));
    }

    public function deactivate(Request $request, Registrant $registrant, AuditLogger $audit)
    {
        $this->authorizeBarangayScope($request, $registrant);
        $registrant->update(['status' => 'deactivated', 'deactivated_at' => now()]);
        $audit->log($request, 'registrant.deactivated', $registrant);

        return response()->json($registrant->fresh());
    }

    public function duplicates(Request $request)
    {
        $sector = $this->sectorForRole($request->user()?->role);
        $dupeKeys = Registrant::query()
            ->when($sector, fn ($query) => $query->where('sector', $sector))
            ->select('first_name', 'last_name', 'birthday', DB::raw('count(*) as total'))
            ->groupBy('first_name', 'last_name', 'birthday')
            ->having('total', '>', 1)
            ->get();

        $records = $dupeKeys->map(fn ($key) => [
            'match' => "{$key->first_name} {$key->last_name} / {$key->birthday}",
            'total' => $key->total,
            'records' => Registrant::with('barangay')
                ->where('first_name', $key->first_name)
                ->where('last_name', $key->last_name)
                ->whereDate('birthday', $key->birthday)
                ->when($sector, fn ($query) => $query->where('sector', $sector))
                ->get(),
        ])->values();

        return response()->json($records);
    }

    public function digitalId(Registrant $registrant, QrCodeService $qr)
    {
        if (request()->user()?->role === 'farmer') {
            abort_unless($this->ownsRegistrantRecord(request(), $registrant), 403, 'This registry record is not linked to your account email.');
        }

        $this->authorizeBarangayScope(request(), $registrant);
        $registrant->load(['barangay', 'assistanceApplications', 'insuranceClaims']);
        $payload = url("/profile/{$registrant->registry_number}");

        return response()->json([
            'registry_number' => $registrant->registry_number,
            'name' => $registrant->full_name,
            'address' => $registrant->address,
            'barangay' => $registrant->barangay?->name,
            'birthday' => $registrant->birthday?->toDateString(),
            'ownership_type' => $registrant->ownership_type,
            'sector' => $registrant->sector,
            'photo_url' => $registrant->photo_url,
            'created_at' => $registrant->created_at,
            'qr_payload' => $payload,
            'qr_image_url' => 'https://api.qrserver.com/v1/create-qr-code/?size=900x900&qzone=0&data='.urlencode($payload),
            'qr_svg' => $qr->svg($payload, 900),
        ]);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $rsbsaRequired = $partial ? 'sometimes' : 'required';
        $photoRequired = (! $partial && $request->input('rsbsa_payload.enrollment_type') !== 'Updating') ? 'required' : 'sometimes';

        return $request->validate([
            'sector' => [$required, Rule::in(['farmer', 'fisherfolk', 'livestock', 'poultry'])],
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'archived', 'deactivated'])],
            'first_name' => [$required, 'string', 'max:120'],
            'middle_name' => ['nullable', 'string', 'max:120'],
            'last_name' => [$required, 'string', 'max:120'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'birthday' => [$required, 'date'],
            'sex' => ['nullable', 'string', 'max:40'],
            'civil_status' => ['nullable', 'string', 'max:40'],
            'phone' => [$required, 'string', 'max:40'],
            'email' => [$required, 'email'],
            'photo' => [$photoRequired, 'image', 'mimes:jpeg,jpg,png', 'max:5120'],
            'address' => [$required, 'string'],
            'barangay_id' => [$required, 'exists:barangays,id'],
            'ownership_type' => [$required, Rule::in(['Farm Worker'])],
            'farm_area' => ['nullable', 'numeric'],
            'farm_location' => ['nullable', 'string'],
            'boat_name' => ['nullable', 'string'],
            'livestock_type' => ['nullable', 'string'],
            'poultry_type' => ['nullable', 'string'],
            'expected_production' => ['nullable', 'array'],
            'rsbsa_payload' => ['nullable', 'array'],
            'rsbsa_payload.enrollment_type' => [$rsbsaRequired, Rule::in(['New', 'Updating'])],
            'rsbsa_payload.date_administered' => [$rsbsaRequired, 'date'],
            'rsbsa_payload.address_line' => [$rsbsaRequired, 'string', 'max:255'],
            'rsbsa_payload.street' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.landline' => [$rsbsaRequired, 'string', 'max:40'],
            'rsbsa_payload.municipality' => [$rsbsaRequired, 'string', 'max:120'],
            'rsbsa_payload.province' => [$rsbsaRequired, 'string', 'max:120'],
            'rsbsa_payload.region' => [$rsbsaRequired, 'string', 'max:120'],
            'rsbsa_payload.birth_municipality' => ['nullable', 'string', 'max:120'],
            'rsbsa_payload.birth_province' => ['nullable', 'string', 'max:120'],
            'rsbsa_payload.birth_country' => ['nullable', 'string', 'max:120'],
            'rsbsa_payload.education' => [$rsbsaRequired, 'string'],
            'rsbsa_payload.religion' => [$rsbsaRequired, 'string'],
            'rsbsa_payload.religion_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.mother_maiden_name' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.spouse_name' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.pwd' => ['nullable', Rule::in(['Yes', 'No'])],
            'rsbsa_payload.household_head' => [$rsbsaRequired, Rule::in(['Yes', 'No'])],
            'rsbsa_payload.household_head_name' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.household_relationship' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.household_members' => [$rsbsaRequired, 'integer', 'min:1'],
            'rsbsa_payload.household_male' => [$rsbsaRequired, 'integer', 'min:0'],
            'rsbsa_payload.household_female' => [$rsbsaRequired, 'integer', 'min:0'],
            'rsbsa_payload.four_ps' => ['nullable', Rule::in(['Yes', 'No'])],
            'rsbsa_payload.indigenous_group' => ['nullable', Rule::in(['Yes', 'No'])],
            'rsbsa_payload.indigenous_specify' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.government_id' => [$rsbsaRequired, Rule::in(['Yes', 'No'])],
            'rsbsa_payload.government_id_type' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.government_id_number' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.association_member' => [$rsbsaRequired, Rule::in(['Yes', 'No'])],
            'rsbsa_payload.association_name' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.emergency_name' => [$rsbsaRequired, 'string', 'max:255'],
            'rsbsa_payload.emergency_contact' => [$rsbsaRequired, 'string', 'max:40'],
            'rsbsa_payload.main_livelihood' => [$rsbsaRequired, function (string $attribute, mixed $value, \Closure $fail) {
                $allowed = ['Farmer', 'Farmworker/Laborer', 'Fisherfolk', 'Agri Youth'];
                $values = is_array($value) ? $value : [$value];
                if (! count($values) || collect($values)->contains(fn ($item) => ! in_array($item, $allowed, true))) {
                    $fail('The main livelihood selection is invalid.');
                }
            }],
            'rsbsa_payload.main_livelihood.*' => [Rule::in(['Farmer', 'Farmworker/Laborer', 'Fisherfolk', 'Agri Youth'])],
            'rsbsa_payload.farmer_activities' => ['nullable', 'array'],
            'rsbsa_payload.farmer_activities.*' => ['string'],
            'rsbsa_payload.farmworker_activities' => ['nullable', 'array'],
            'rsbsa_payload.farmworker_activities.*' => ['string'],
            'rsbsa_payload.fishing_activities' => ['nullable', 'array'],
            'rsbsa_payload.fishing_activities.*' => ['string'],
            'rsbsa_payload.youth_activities' => ['nullable', 'array'],
            'rsbsa_payload.youth_activities.*' => ['string'],
            'rsbsa_payload.farmer_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.farmer_livestock' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.farmer_poultry' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.farmworker_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.fishing_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.youth_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.rotation_farmers' => [$rsbsaRequired, 'array', 'size:3'],
            'rsbsa_payload.rotation_farmers.*' => [$rsbsaRequired, 'string', 'max:255'],
            'rsbsa_payload.gross_farming_income' => ['nullable', 'string', 'max:80'],
            'rsbsa_payload.gross_non_farming_income' => ['nullable', 'string', 'max:80'],
            'rsbsa_payload.parcels' => [$rsbsaRequired, 'array', 'min:1', 'max:3'],
            'rsbsa_payload.parcels.*.location_barangay' => [$rsbsaRequired, 'string'],
            'rsbsa_payload.parcels.*.location_municipality' => [$rsbsaRequired, 'string'],
            'rsbsa_payload.parcels.*.total_area' => [$rsbsaRequired, 'numeric', 'gt:0'],
            'rsbsa_payload.parcels.*.ownership_document_number' => ['nullable', 'string', 'max:80'],
            'rsbsa_payload.parcels.*.ancestral_domain' => [$rsbsaRequired, Rule::in(['Yes', 'No'])],
            'rsbsa_payload.parcels.*.agrarian_reform_beneficiary' => [$rsbsaRequired, Rule::in(['Yes', 'No'])],
            'rsbsa_payload.parcels.*.ownership_type' => [$rsbsaRequired, Rule::in(['Registered Owner', 'Tenant', 'Lessee', 'Others'])],
            'rsbsa_payload.parcels.*.owner_name' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.parcels.*.ownership_other' => ['nullable', 'string', 'max:255'],
            'rsbsa_payload.parcels.*.commodities' => [$rsbsaRequired, 'array', 'min:1', 'max:5'],
            'rsbsa_payload.parcels.*.commodities.*.commodity' => [$rsbsaRequired, 'string'],
            'rsbsa_payload.parcels.*.commodities.*.size' => [$rsbsaRequired, 'numeric', 'gt:0'],
            'rsbsa_payload.parcels.*.commodities.*.heads' => [$rsbsaRequired, 'numeric', 'min:0'],
            'rsbsa_payload.parcels.*.commodities.*.farm_type' => [$rsbsaRequired, Rule::in(['1', '2', '3'])],
            'rsbsa_payload.parcels.*.commodities.*.organic_practitioner' => ['nullable', Rule::in(['Yes', 'No'])],
            'rsbsa_payload.parcels.*.commodities.*.remarks' => [$rsbsaRequired, 'string', 'max:255'],
        ]);
    }

    private function sanitizeRsbsaPayload(array $payload): array
    {
        $payload['parcels'] = collect($payload['parcels'] ?? [])
            ->map(function (array $parcel) {
                $parcel['commodities'] = collect($parcel['commodities'] ?? [])->values()->all();

                return $parcel;
            })
            ->values()
            ->all();

        return $payload;
    }

    private function authorizeBarangayScope(Request $request, Registrant $registrant): void
    {
        if ($request->user()?->role === 'barangay_technical_staff') {
            abort_unless(
                $request->user()->hasBarangayAccess((int) $registrant->barangay_id),
                403,
                'This barangay is not assigned to your account.',
            );
        }
        $sector = $this->sectorForRole($request->user()?->role);
        if ($sector) {
            abort_unless($registrant->sector === $sector, 403, 'Forbidden.');
        }
    }

    private function ownsRegistrantRecord(Request $request, Registrant $registrant): bool
    {
        return $registrant->email
            && strcasecmp($registrant->email, $request->user()->email) === 0;
    }

    private function isStaffUser(Request $request): bool
    {
        return in_array($request->user()?->role, [
            'super_admin',
            'mao_staff',
            'barangay_technical_staff',
            'crop_head',
            'fish_head',
            'livestock_head',
            'poultry_head',
        ], true);
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
