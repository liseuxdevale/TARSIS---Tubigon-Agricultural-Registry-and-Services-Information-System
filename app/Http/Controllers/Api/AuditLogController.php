<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = $this->filteredQuery($request)->latest();

        return response()->json($query->paginate($request->integer('per_page', 20)));
    }

    public function export(Request $request)
    {
        $csv = $this->csvRow([
            'date_time',
            'administrator',
            'role',
            'action',
            'module',
            'record_number',
            'ip_address',
        ]);

        $this->filteredQuery($request)
            ->oldest()
            ->get()
            ->each(function (AuditLog $log) use (&$csv) {
                $csv .= $this->csvRow([
                    $this->spreadsheetText($log->created_at?->format('Y-m-d H:i:s')),
                    $log->user?->name ?: 'System',
                    $log->user?->role,
                    $log->action,
                    class_basename($log->auditable_type) ?: 'System',
                    $this->spreadsheetText($this->recordNumber($log)),
                    $log->ip_address,
                ]);
            });

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=tarsis-audit-logs.csv',
        ]);
    }

    private function filteredQuery(Request $request)
    {
        return AuditLog::with('user')
            ->when($request->action, fn ($query, $action) => $query->where('action', 'like', "%{$action}%"))
            ->when($request->user_id, fn ($query, $userId) => $query->where('user_id', $userId))
            ->when($request->date_from, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($request->date_to, fn ($query, $date) => $query->whereDate('created_at', '<=', $date));
    }

    private function recordNumber(AuditLog $log): string
    {
        $values = $log->new_values ?: $log->old_values ?: [];

        return (string) (
            $values['registry_number']
            ?? $values['application_number']
            ?? $values['claim_number']
            ?? $values['id']
            ?? $log->auditable_id
            ?? ''
        );
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
