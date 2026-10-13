<?php

namespace App\Console\Commands;

use App\Models\Registrant;
use App\Services\RegistrantDuplicateService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class AuditRegistrantDuplicates extends Command
{
    protected $signature = 'registrants:audit-duplicates';

    protected $description = 'Read-only audit of registry-number uniqueness and possible identity matches, including archived records';

    public function handle(): int
    {
        $rows = Registrant::withTrashed()->get(['id', 'registry_number', 'first_name', 'middle_name', 'last_name', 'suffix', 'birthday', 'deleted_at']);
        $numbers = $rows->filter(fn ($row) => filled($row->registry_number))->groupBy(fn ($row) => RegistrantDuplicateService::number($row->registry_number))->filter(fn ($group) => $group->count() > 1);
        $noncanonical = $rows->filter(fn ($row) => $row->registry_number !== RegistrantDuplicateService::number($row->registry_number));
        $identities = $rows->filter(fn ($row) => $row->birthday)->groupBy(fn ($row) => RegistrantDuplicateService::name($row->getAttributes()).'|'.$row->birthday->toDateString())->filter(fn ($group) => $group->count() > 1);
        $unique = Schema::hasIndex('registrants', ['registry_number'], 'unique');
        $this->info('Unique registry_number index: '.($unique ? 'present' : 'MISSING'));
        $this->line('Normalized number collision groups: '.$numbers->count());
        $this->line('Noncanonical numbers requiring manual review: '.$noncanonical->count());
        $this->line('Possible full-name/birthday match groups (including archived): '.$identities->count());
        foreach ($numbers as $group) {
            $this->warn('Number collision record IDs: '.$group->pluck('id')->implode(', '));
        }
        if ($noncanonical->isNotEmpty()) {
            $this->warn('Noncanonical record IDs: '.$noncanonical->pluck('id')->implode(', '));
        }
        $this->line('No records were changed. Identity matches require manual verification.');

        return $unique && $numbers->isEmpty() && $noncanonical->isEmpty() ? self::SUCCESS : self::FAILURE;
    }
}
