<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Registrant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class RegistrantDuplicateService
{
    public function pairKey(Registrant $first, Registrant $second): string
    {
        $records = collect([$first, $second])->sortBy('id')->map(fn ($record) => [
            $record->id, self::name($record->getAttributes()), $record->birthday?->toDateString(),
        ])->values()->all();

        return hash('sha256', json_encode($records));
    }

    public function unresolvedPairs($records): array
    {
        $reviewed = AuditLog::where('action', 'registrant.different_persons')->get()
            ->pluck('new_values')->map(fn ($values) => $values['pair_key'] ?? null)->filter()->flip();
        $pairs = [];
        foreach ($records->values() as $index => $first) {
            foreach ($records->values()->slice($index + 1) as $second) {
                if (! $reviewed->has($this->pairKey($first, $second))) {
                    $pairs[] = [$first->id, $second->id];
                }
            }
        }

        return $pairs;
    }

    public const NUMBER_MESSAGE = 'This RSBSA number is already registered in the system. Please verify the existing record.';

    public static function number(?string $value): ?string
    {
        $value = trim($value ?? '');
        if ($value === '') {
            return null;
        }
        // Only remove the separators of the verified, existing 2-2-2-3-6 format.
        if (preg_match('/^\d{2}\s*-\s*\d{2}\s*-\s*\d{2}\s*-\s*\d{3}\s*-\s*\d{6}$/D', $value)) {
            return preg_replace('/[\s-]+/', '', $value);
        }

        return $value;
    }

    public static function name(array $data): string
    {
        $parts = array_map(fn ($field) => trim((string) ($data[$field] ?? '')), ['first_name', 'middle_name', 'last_name', 'suffix']);

        return mb_strtolower(preg_replace('/\s+/u', ' ', trim(implode(' ', $parts))));
    }

    public static function canInspect(?User $user, Registrant $record): bool
    {
        if (! $user || ! $user->hasRole(['super_admin', 'mao_staff', 'barangay_technical_staff', 'crop_head', 'fish_head', 'livestock_head', 'poultry_head'])) {
            return false;
        }
        $sector = Announcement::sectorForRole($user->role);

        return (! $sector || $record->sector === $sector)
            && ($user->role !== 'barangay_technical_staff' || $user->hasBarangayAccess((int) $record->barangay_id));
    }

    public function exact(?string $number, ?int $except = null): ?Registrant
    {
        if (! $number) {
            return null;
        }

        return Registrant::withTrashed()->whereRaw("REPLACE(TRIM(registry_number), '-', '') = ?", [self::number($number)])
            ->when($except, fn ($query) => $query->where('id', '!=', $except))->first();
    }

    public function identity(array $data, ?int $except = null)
    {
        if (empty($data['birthday']) || empty($data['first_name']) || empty($data['last_name'])) {
            return collect();
        }
        $name = self::name($data);

        return Registrant::withTrashed()->with('barangay:id,name')->whereDate('birthday', $data['birthday'])
            ->when($except, fn ($query) => $query->where('id', '!=', $except))
            ->get()->filter(fn ($record) => self::name($record->getAttributes()) === $name)->values();
    }

    public function check(Request $request, array $data, ?Registrant $current = null): ?array
    {
        $number = $data['registry_number'] ?? null;
        $exact = $this->exact($number, $current?->id);
        if ($exact) {
            $result = ['code' => 'duplicate_registry_number', 'message' => self::NUMBER_MESSAGE,
                'errors' => ['registry_number' => [self::NUMBER_MESSAGE]]];
            if (self::canInspect($request->user(), $exact)) {
                $result['existing_record'] = $this->summary($exact);
            }

            return $result;
        }
        $matches = $this->identity($data, $current?->id);
        if ($current) {
            $candidate = clone $current;
            $candidate->fill($data);
            $matches = $matches->filter(fn ($record) => count($this->unresolvedPairs(collect([$candidate, $record]))) > 0)->values();
        }
        if ($matches->isEmpty()) {
            return null;
        }
        $context = hash('sha256', json_encode([$request->user()?->id, $current?->id, self::name($data), substr($data['birthday'], 0, 10), $number, $matches->pluck('id')->sort()->values()->all()]));
        $token = $request->input('duplicate_review_token');
        if (is_string($token)) {
            try {
                $review = json_decode(Crypt::decryptString($token), true);
                if (($review['expires'] ?? 0) >= time() && hash_equals($context, $review['context'] ?? '')) {
                    return null;
                }
            } catch (Throwable) { /* Invalid or stale review tokens trigger a fresh warning. */
            }
        }

        return [
            'code' => 'possible_duplicate', 'message' => 'A similar name and date of birth were found. Review your form before continuing. This is a possible match, not a confirmed duplicate.',
            'matches' => $matches->filter(fn ($record) => self::canInspect($request->user(), $record))->map(fn ($record) => $this->summary($record))->values(),
            'duplicate_review_token' => Crypt::encryptString(json_encode(['context' => $context, 'expires' => time() + 900])),
        ];
    }

    public function summary(Registrant $record): array
    {
        return ['id' => $record->id, 'registry_number' => $record->registry_number, 'full_name' => $record->full_name,
            'birthday' => $record->birthday?->toDateString(), 'barangay' => ['name' => $record->barangay?->name],
            'address' => $record->address, 'sector' => $record->sector, 'status' => $record->trashed() ? 'archived' : $record->status];
    }
}
