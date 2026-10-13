<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssistanceApplication;
use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\InsuranceClaim;
use App\Models\Registrant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function monthRange(Request $request): array
    {
        $request->validate([
            'month_from' => ['nullable', 'date_format:Y-m'],
            'month_to' => ['nullable', 'date_format:Y-m', 'after_or_equal:month_from'],
        ]);
        if (! $request->filled('month_from') && ! $request->filled('month_to')) return [null, null];
        $from = \Carbon\Carbon::createFromFormat('!Y-m', $request->input('month_from', $request->input('month_to')))->startOfMonth();
        $to = \Carbon\Carbon::createFromFormat('!Y-m', $request->input('month_to', $request->input('month_from')))->endOfMonth();
        abort_if($from->diffInMonths($to) > 120, 422, 'Choose a month range of ten years or less.');
        return [$from, $to];
    }

    public function dashboard(Request $request)
    {
        [$monthFrom, $monthTo] = $this->monthRange($request);
        $request->validate([
            'assistance_from' => ['nullable', 'date'], 'assistance_to' => ['nullable', 'date', 'after_or_equal:assistance_from'],
            'insurance_from' => ['nullable', 'date'], 'insurance_to' => ['nullable', 'date', 'after_or_equal:insurance_from'],
        ]);
        $request->validate(['barangay_id' => ['nullable', 'integer', 'exists:barangays,id']]);
        $barangayId = $request->integer('barangay_id');
        $hasBarangayScope = $request->user()?->role === 'barangay_technical_staff';
        $barangayIds = $hasBarangayScope ? $request->user()->assignedBarangayIds() : [];
        $sector = $this->reportSector($request);
        $showDashboardAnnouncements = ! in_array($request->user()?->role, ['farmer', 'barangay_technical_staff'], true);
        $today = now()->startOfDay();
        $weekFromNow = now()->addWeek()->endOfDay();

        $registrants = Registrant::query()
            ->when($monthFrom, fn ($query) => $query->whereBetween('created_at', [$monthFrom, $monthTo]))
            ->when($barangayId, fn ($query) => $query->where('barangay_id', $barangayId))
            ->when($hasBarangayScope, fn ($query) => $query->whereIn('barangay_id', $barangayIds))
            ->when($sector, fn ($query) => $query->where('sector', $sector));
        $assistance = AssistanceApplication::query()
            ->when($monthFrom, fn ($query) => $query->whereBetween('applied_at', [$monthFrom->toDateString(), $monthTo->toDateString()]))
            ->when($barangayId, fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('barangay_id', $barangayId)))
            ->when($hasBarangayScope || $sector, fn ($query) => $query->whereHas('registrant', function ($registrant) use ($hasBarangayScope, $barangayIds, $sector) {
                $registrant->when($hasBarangayScope, fn ($query) => $query->whereIn('barangay_id', $barangayIds))
                    ->when($sector, fn ($query) => $query->where('sector', $sector));
            }));
        $insurance = InsuranceClaim::query()
            ->when($monthFrom, fn ($query) => $query->whereBetween('created_at', [$monthFrom, $monthTo]))
            ->when($barangayId, fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('barangay_id', $barangayId)))
            ->when($hasBarangayScope || $sector, fn ($query) => $query->whereHas('registrant', function ($registrant) use ($hasBarangayScope, $barangayIds, $sector) {
                $registrant->when($hasBarangayScope, fn ($query) => $query->whereIn('barangay_id', $barangayIds))
                    ->when($sector, fn ($query) => $query->where('sector', $sector));
            }));

        return response()->json([
            'as_of' => now()->toDateString(),
            'scope_sector' => $sector,
            'monthly_registrants' => collect(\Carbon\CarbonPeriod::create($monthFrom ?? now()->startOfYear(), '1 month', $monthTo ?? now()->endOfYear()))->map(function ($month) use ($registrants) {
                $start = $month->copy()->startOfMonth();
                $end = (clone $start)->endOfMonth();

                return [
                    'month' => $start->format('M Y'),
                    'total' => (clone $registrants)->whereBetween('created_at', [$start, $end])->count(),
                ];
            }),
            'totals' => [
                'registrants' => (clone $registrants)->count(),
                'approved_registrants' => (clone $registrants)->where('status', 'approved')->count(),
                'assistance_applications' => (clone $assistance)->count(),
                'assistance_pending' => (clone $assistance)->whereIn('status', ['pending', 'application_submitted', 'received_by_mao', 'forwarded_to_mswdo', 'under_review'])->count(),
                'assistance_released' => (clone $assistance)->where('status', 'released')->count(),
                'calamity_applications' => (clone $insurance)->count(),
                'insurance_pending' => (clone $insurance)->where('release_status', '!=', 'released')->whereNotIn('approval_status', ['rejected', 'denied'])->count(),
                'insurance_released' => (clone $insurance)->where('release_status', 'released')->count(),
                'archived_registrants' => (clone $registrants)->onlyTrashed()->count(),
                'archived_assistance_applications' => (clone $assistance)->whereNotNull('archived_at')->count(),
                'archived_insurance_applications' => (clone $insurance)->whereNotNull('archived_at')->count(),
            ],
            'by_sector' => (clone $registrants)->select('sector', DB::raw('count(*) as total'))->groupBy('sector')->get(),
            'by_barangay' => Barangay::withCount(['registrants' => fn ($query) => $query->when($sector, fn ($query) => $query->where('sector', $sector))
                ->when($monthFrom, fn ($query) => $query->whereBetween('created_at', [$monthFrom, $monthTo]))])
                ->when($barangayId, fn ($query) => $query->where('id', $barangayId))
                ->when($hasBarangayScope, fn ($query) => $query->whereIn('id', $barangayIds))
                ->orderByDesc('registrants_count')
                ->orderBy('name')
                ->get()
                ->each(fn ($barangay) => $barangay->setAttribute('enrollment_status', $barangay->current_enrollment_status)),
            'upcoming_announcements' => $showDashboardAnnouncements ? Announcement::query()
                ->when($sector, fn ($query) => $this->scopeAnnouncementsToSector($query, $sector))
                ->whereIn('type', ['distribution_schedule', 'calamity', 'bulletin', 'advisory', 'pest', 'disease'])
                ->where(function ($query) use ($today, $weekFromNow) {
                    $query
                        ->whereBetween('publish_at', [$today, $weekFromNow])
                        ->orWhereBetween('expires_at', [$today, $weekFromNow])
                        ->orWhere(function ($query) use ($today, $weekFromNow) {
                            $query->where('publish_at', '<=', $weekFromNow)
                                ->where('expires_at', '>=', $today);
                        });
                })
                ->orderBy('publish_at')
                ->limit(6)
                ->get(['id', 'title', 'type', 'publish_at', 'expires_at', 'target_barangays']) : collect(),
            'recent_announcements' => $showDashboardAnnouncements ? Announcement::query()
                ->when($sector, fn ($query) => $this->scopeAnnouncementsToSector($query, $sector))
                ->latest()
                ->limit(5)
                ->get(['id', 'title', 'type', 'publish_at', 'target_barangays', 'target_sectors']) : collect(),
            'announcement_feedback' => $showDashboardAnnouncements ? AnnouncementComment::query()
                ->with('announcement:id,title,type')
                ->whereNull('parent_id')
                ->whereHas('announcement', fn ($query) => $sector ? $this->scopeAnnouncementsToSector($query, $sector) : $query)
                ->latest()
                ->limit(5)
                ->get(['id', 'announcement_id', 'author_name', 'body', 'likes_count', 'dislikes_count', 'created_at']) : collect(),
            'recent_activity' => AuditLog::query()
                ->with('user:id,name,role')
                ->latest()
                ->limit(5)
                ->get(['id', 'user_id', 'action', 'created_at']),
            'assistance_report' => in_array($request->user()?->role, ['super_admin', 'mao_staff'], true) ? (clone $assistance)
                ->when($request->assistance_from, fn ($query, $date) => $query->whereDate('applied_at', '>=', $date))
                ->when($request->assistance_to, fn ($query, $date) => $query->whereDate('applied_at', '<=', $date))
                ->with('registrant:id,registry_number,first_name,middle_name,last_name,suffix,sector')
                ->whereNull('archived_at')
                ->latest('applied_at')
                ->get(['id', 'registrant_id', 'assistance_type', 'applied_at', 'status'])
                ->map(fn (AssistanceApplication $application) => [
                    'id' => $application->id,
                    'assistance_type' => $application->assistance_type,
                    'sector' => $application->registrant?->sector,
                    'applicant' => $application->registrant?->full_name,
                    'registry_number' => $application->registrant?->registry_number,
                    'application_date' => $application->applied_at?->toDateString(),
                    'status' => $application->status,
                ]) : collect(),
            'insurance_report' => in_array($request->user()?->role, ['super_admin', 'mao_staff'], true) ? (clone $insurance)
                ->when($request->insurance_from, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
                ->when($request->insurance_to, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
                ->with('registrant:id,registry_number,first_name,middle_name,last_name,suffix,sector')
                ->whereNull('archived_at')->latest()->get()
                ->map(fn (InsuranceClaim $claim) => [
                    'id' => $claim->id,
                    'sector' => $claim->registrant?->sector,
                    'applicant' => $claim->registrant?->full_name,
                    'registry_number' => $claim->registrant?->registry_number,
                    'insurance_type' => $claim->claim_type,
                    'application_date' => $claim->created_at?->toDateString(),
                    'approval_status' => $claim->approval_status,
                    'release_status' => $claim->release_status,
                ]) : collect(),
            'seasonal_production' => (clone $registrants)->select('sector', DB::raw('count(*) as beneficiaries'))->groupBy('sector')->get(),
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

    private function reportSector(Request $request): ?string
    {
        $roleSector = $this->sectorForRole($request->user()?->role);

        if ($roleSector) {
            return $roleSector;
        }

        if (! in_array($request->user()?->role, ['super_admin', 'mao_staff'], true)) {
            return null;
        }

        $sector = $request->string('sector')->toString();

        return in_array($sector, ['farmer', 'fisherfolk', 'livestock', 'poultry'], true) ? $sector : null;
    }

    private function scopeAnnouncementsToSector($query, string $sector)
    {
        return $query->where(function ($query) use ($sector) {
            $query->whereNull('target_sectors')
                ->orWhereJsonLength('target_sectors', 0)
                ->orWhereJsonContains('target_sectors', $sector);
        });
    }

    public function export(Request $request)
    {
        [$monthFrom, $monthTo] = $this->monthRange($request);
        $request->validate(['barangay_id' => ['nullable', 'integer', 'exists:barangays,id']]);
        $sector = $this->reportSector($request);
        $dataset = $request->string('dataset', 'registrants')->toString();
        $format = $request->string('format', 'csv')->toString();
        if (in_array($dataset, ['assistance', 'insurance'], true)) {
            abort_unless($request->user()?->hasRole(['super_admin', 'mao_staff']), 403);
            $request->validate(['date_from' => ['nullable', 'date'], 'date_to' => ['nullable', 'date', 'after_or_equal:date_from'], 'assistance_type' => ['nullable', 'string'], 'insurance_type' => ['nullable', 'string', 'max:255']]);
            $isAssistance = $dataset === 'assistance';
            $dateColumn = $isAssistance ? 'applied_at' : 'created_at';
            $query = ($isAssistance ? AssistanceApplication::query() : InsuranceClaim::query())
                ->when(! $isAssistance && $request->insurance_type, fn ($query) => $query->where('claim_type', $request->insurance_type))
                ->when($monthFrom, fn ($query) => $query->whereBetween($dateColumn, $isAssistance ? [$monthFrom->toDateString(), $monthTo->toDateString()] : [$monthFrom, $monthTo]))
                ->with('registrant')->whereNull('archived_at')
                ->when($sector || $request->integer('barangay_id'), fn ($query) => $query->whereHas('registrant', fn ($person) => $person
                    ->when($sector, fn ($query) => $query->where('sector', $sector))
                    ->when($request->integer('barangay_id'), fn ($query, $id) => $query->where('barangay_id', $id))))
                ->when($request->date_from, fn ($query, $date) => $query->whereDate($dateColumn, '>=', $date))
                ->when($request->date_to, fn ($query, $date) => $query->whereDate($dateColumn, '<=', $date))
                ->orderByDesc($dateColumn);
            $csv = $this->csvRow($isAssistance
                ? ['assistance_type', 'sector', 'applicant', 'registry_number', 'application_date', 'status']
                : ['insurance_type', 'sector', 'applicant', 'registry_number', 'application_date', 'approval_status', 'release_status']);
            foreach ($query->cursor() as $row) {
                $type = $isAssistance ? $row->assistance_type : $row->claim_type;
                if ($isAssistance && $request->assistance_type) {
                    $normalized = in_array(strtolower($type), ['farm', 'farm input', 'rice seeds', 'rice_seeds']) ? 'fisheries' : ($type === 'crop_damage' ? 'crop' : $type);
                    if ($normalized !== $request->assistance_type) continue;
                }
                $values = [$type, $row->registrant?->sector, $row->registrant?->full_name,
                    $row->registrant?->registry_number, $row->{$dateColumn}?->toDateString()];
                $values = array_merge($values, $isAssistance ? [$row->status] : [$row->approval_status, $row->release_status]);
                $values = array_map(fn ($value) => preg_match('/^[\s]*[=+@-]/u', (string) $value) ? "'".$value : $value, $values);
                $csv .= $this->csvRow($values);
            }
            return $this->download($csv, 'tarsis-'.$dataset.'-tracker', 'csv');
        }

        if ($dataset === 'archived_registrants') {
            return $this->exportArchivedRegistrants($sector, $format);
        }
        if ($dataset === 'archived_assistance') {
            return $this->exportArchivedAssistance($sector, $format);
        }
        if ($dataset === 'archived_insurance') {
            return $this->exportArchivedInsurance($sector, $format);
        }

        $rows = Registrant::with(['barangay', 'assistanceApplications', 'insuranceClaims'])
            ->when($monthFrom, fn ($query) => $query->whereBetween('created_at', [$monthFrom, $monthTo]))
            ->when($request->integer('barangay_id'), fn ($query, $barangayId) => $query->where('barangay_id', $barangayId))
            ->when($request->user()?->role === 'barangay_technical_staff', fn ($query) => $query->whereIn('barangay_id', $request->user()->assignedBarangayIds()))
            ->when($sector, fn ($query) => $query->where('sector', $sector))
            ->orderBy('registry_number')
            ->get();
        $sectorColumns = $this->registrantSectorExportColumns($sector);
        $csv = $this->csvRow(array_merge([
            'registry_number',
            'name',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'birthday',
            'sex',
            'civil_status',
            'phone',
            'email',
            'address',
            'barangay',
            'sector',
            'status',
            'ownership_type',
        ], array_keys($sectorColumns)));

        foreach ($rows as $row) {
            $csv .= $this->csvRow(array_merge([
                $this->spreadsheetText($row->registry_number),
                $row->full_name,
                $row->first_name,
                $row->middle_name,
                $row->last_name,
                $row->suffix,
                $row->birthday?->toDateString(),
                $row->sex,
                $row->civil_status,
                $row->phone,
                $row->email,
                $row->address,
                $row->barangay?->name,
                $row->sector,
                $row->status,
                $row->ownership_type,
            ], array_map(fn ($attribute) => $row->{$attribute}, $sectorColumns)));
        }

        return response($csv, 200, [
            'Content-Type' => $this->contentType($format),
            'Content-Disposition' => "attachment; filename=tarsis-registrants-report.{$this->extension($format)}",
        ]);
    }

    private function registrantSectorExportColumns(?string $sector): array
    {
        return match ($sector) {
            'farmer' => [
                'farm_area' => 'farm_area',
                'farm_location' => 'farm_location',
            ],
            'fisherfolk' => [
                'boat_name' => 'boat_name',
            ],
            'livestock' => [
                'farm_area' => 'farm_area',
                'farm_location' => 'farm_location',
                'livestock_type' => 'livestock_type',
            ],
            'poultry' => [
                'farm_area' => 'farm_area',
                'farm_location' => 'farm_location',
                'poultry_type' => 'poultry_type',
            ],
            default => [
                'farm_area' => 'farm_area',
                'farm_location' => 'farm_location',
                'boat_name' => 'boat_name',
                'livestock_type' => 'livestock_type',
                'poultry_type' => 'poultry_type',
            ],
        };
    }

    private function exportArchivedRegistrants(?string $sector, string $format)
    {
        $csv = $this->csvRow(['registry_number', 'name', 'sector', 'barangay', 'previous_status', 'archived_on', 'archived_by', 'archive_reason']);
        Registrant::onlyTrashed()->with(['barangay', 'archivedBy:id,name'])
            ->when($sector, fn ($query) => $query->where('sector', $sector))
            ->orderBy('registry_number')
            ->get()
            ->each(function ($row) use (&$csv) {
                $csv .= $this->csvRow([$row->registry_number, $row->full_name, $row->sector, $row->barangay?->name, $row->previous_status, $row->archived_at, $row->archivedBy?->name, $row->archive_reason]);
            });

        return $this->download($csv, 'tarsis-archived-registrants', $format);
    }

    private function exportArchivedAssistance(?string $sector, string $format)
    {
        $csv = $this->csvRow(['application_number', 'registry_number', 'applicant', 'assistance_type', 'previous_status', 'archived_on', 'archived_by', 'archive_reason']);
        AssistanceApplication::with(['registrant.barangay', 'archivedBy:id,name'])
            ->whereNotNull('archived_at')
            ->when($sector, fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
            ->orderBy('id')
            ->get()
            ->each(function ($row) use (&$csv) {
                $csv .= $this->csvRow(["APP-{$row->id}", $row->registrant?->registry_number, $row->registrant?->full_name, $row->assistance_type, $row->previous_status, $row->archived_at, $row->archivedBy?->name, $row->archive_reason]);
            });

        return $this->download($csv, 'tarsis-archived-assistance-applications', $format);
    }

    private function exportArchivedInsurance(?string $sector, string $format)
    {
        $csv = $this->csvRow(['claim_number', 'registry_number', 'applicant', 'insurance_type', 'previous_status', 'archived_on', 'archived_by', 'archive_reason']);
        InsuranceClaim::with(['registrant.barangay', 'archivedBy:id,name'])
            ->whereNotNull('archived_at')
            ->when($sector, fn ($query) => $query->whereHas('registrant', fn ($registrant) => $registrant->where('sector', $sector)))
            ->orderBy('id')
            ->get()
            ->each(function ($row) use (&$csv) {
                $csv .= $this->csvRow(["CLM-{$row->id}", $row->registrant?->registry_number, $row->registrant?->full_name, $row->claim_type, $row->previous_status, $row->archived_at, $row->archivedBy?->name, $row->archive_reason]);
            });

        return $this->download($csv, 'tarsis-archived-insurance-applications', $format);
    }

    private function download(string $content, string $filename, string $format)
    {
        if ($format === 'pdf') {
            return response($this->simplePdf($content), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "attachment; filename={$filename}.pdf",
            ]);
        }

        return response($content, 200, [
            'Content-Type' => $this->contentType($format),
            'Content-Disposition' => "attachment; filename={$filename}.{$this->extension($format)}",
        ]);
    }

    private function extension(string $format): string
    {
        return match ($format) {
            'excel' => 'xls',
            'pdf' => 'pdf',
            default => 'csv',
        };
    }

    private function contentType(string $format): string
    {
        return match ($format) {
            'excel' => 'application/vnd.ms-excel',
            'pdf' => 'application/pdf',
            default => 'text/csv',
        };
    }

    private function simplePdf(string $text): string
    {
        $lines = collect(explode("\n", trim($text)))
            ->map(fn ($line) => substr(str_replace(['\\', '(', ')', '"'], ['\\\\', '\\(', '\\)', ''], $line), 0, 110))
            ->take(45)
            ->values();
        $content = "BT /F1 8 Tf 36 806 Td 10 TL";
        foreach ($lines as $index => $line) {
            $content .= ($index ? ' T* ' : ' ')."({$line}) Tj";
        }
        $content .= ' ET';
        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Length '.strlen($content)." >> stream\n{$content}\nendstream endobj",
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object."\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= str_pad((string) $offset, 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }

        return $pdf."trailer << /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    private function csvRow(array $columns): string
    {
        return collect($columns)
            ->map(fn ($value) => '"'.str_replace('"', '""', (string) $value).'"')
            ->implode(',')."\n";
    }

    private function spreadsheetText(?string $value): string
    {
        return $value ? '="'.$value.'"' : '';
    }
}
