<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\EmissionFactor;
use App\Models\EnergyRecord;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnergyWorkflow
{
    public function create(array $input, User $user): EnergyRecord
    {
        abort_unless($user->role === 'operator', 403, 'Solo el operador puede cargar registros.');
        $input['period'] .= '-01';
        unset($input['lock_version']);
        $this->checkFactor($input);
        try {
            return DB::transaction(function () use ($input, $user) {
                $record = EnergyRecord::create([...$input, 'created_by' => $user->id, 'status' => 'draft']);
                $this->audit($record, $user, 'created', null);

                return $record;
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['period' => 'Ya existe un registro para esa instalación y mes.']);
        }
    }

    public function update(EnergyRecord $record, array $input, User $user): EnergyRecord
    {
        return DB::transaction(function () use ($record, $input, $user) {
            $record = EnergyRecord::query()->lockForUpdate()->findOrFail($record->id);
            $this->checkVersion($record, $input['lock_version']);
            abort_unless($user->role === 'operator' && $record->created_by === $user->id, 403, 'No puedes editar este registro.');
            abort_unless(in_array($record->status, ['draft', 'changes_requested']), 409, 'Un registro enviado o aprobado no se puede editar.');
            $before = $record->getAttributes();
            $input['period'] .= '-01';
            $this->checkFactor($input);
            unset($input['lock_version']);
            $record->fill($input);
            $record->lock_version++;
            try {
                $record->save();
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages(['period' => 'Ya existe un registro para esa instalación y mes.']);
            }
            $this->audit($record, $user, 'updated', $before);

            return $record;
        });
    }

    public function transition(EnergyRecord $record, string $action, int $version, User $user, ?string $note): EnergyRecord
    {
        return DB::transaction(function () use ($record, $action, $version, $user, $note) {
            $record = EnergyRecord::query()->lockForUpdate()->findOrFail($record->id);
            $this->checkVersion($record, $version);
            $before = $record->getAttributes();
            if ($action === 'submit') {
                abort_unless($user->role === 'operator' && $record->created_by === $user->id, 403);
                abort_unless(in_array($record->status, ['draft', 'changes_requested']), 409, 'No se puede enviar desde este estado.');
                $this->checkFactor($record->getAttributes());
                $record->status = 'submitted';
                $record->review_note = null;
            } else {
                abort_unless($user->role === 'reviewer' && $record->created_by !== $user->id, 403, 'Se requiere revisión independiente.');
                abort_unless($record->status === 'submitted', 409, 'Solo se revisan registros enviados.');
                if ($action === 'approve') {
                    $this->checkFactor($record->getAttributes());
                    $factor = EmissionFactor::findOrFail($record->emission_factor_id);
                    $record->factor_snapshot = $factor->snapshot();
                    $record->emissions_kg_co2e = EnergyMetrics::emissions((float) $record->electricity_kwh, (float) $factor->kg_co2e_per_kwh);
                    $record->status = 'approved';
                } else {
                    if (! $note || mb_strlen(trim($note)) < 10) {
                        throw ValidationException::withMessages(['review_note' => 'Explica la corrección con al menos 10 caracteres.']);
                    }
                    $record->status = 'changes_requested';
                }
                $record->reviewed_by = $user->id;
                $record->reviewed_at = now();
                $record->review_note = $note;
            }
            $record->lock_version++;
            $record->save();
            $this->audit($record, $user, $action, $before);

            return $record;
        });
    }

    private function checkVersion(EnergyRecord $record, int $version): void
    {
        abort_unless($record->lock_version === $version, 409, 'El registro cambió. Actualiza la página antes de continuar.');
    }

    private function checkFactor(array $input): void
    {
        $facility = Facility::findOrFail($input['facility_id']);
        $factor = EmissionFactor::findOrFail($input['emission_factor_id']);
        if ($factor->year !== (int) substr((string) $input['period'], 0, 4) || $factor->grid !== $facility->grid) {
            throw ValidationException::withMessages(['emission_factor_id' => 'El factor debe corresponder al año y sistema eléctrico del registro.']);
        }
    }

    private function audit(EnergyRecord $record, User $user, string $action, ?array $before): void
    {
        AuditEvent::create(['energy_record_id' => $record->id, 'user_id' => $user->id,
            'action' => $action, 'before' => $before, 'after' => $record->getAttributes(), 'created_at' => now()]);
    }
}
