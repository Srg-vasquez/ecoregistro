<?php

namespace Database\Seeders;

use App\Models\EmissionFactor;
use App\Models\EnergyRecord;
use App\Models\Facility;
use App\Models\User;
use App\Services\EnergyWorkflow;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('DEMO_PASSWORD');
        if (! $password || mb_strlen($password) < 12) {
            throw new \RuntimeException('Configura DEMO_PASSWORD con al menos 12 caracteres antes de cargar la demo.');
        }
        if (EnergyRecord::exists()) {
            $this->command?->warn('La demo ya contiene registros; no se sobrescribieron.');

            return;
        }
        $operator = User::firstOrCreate(['email' => 'operador@ecoregistro.test'], ['name' => 'Sergio · Operaciones', 'password' => Hash::make($password), 'role' => 'operator']);
        $reviewer = User::firstOrCreate(['email' => 'revisor@ecoregistro.test'], ['name' => 'Camila · Gestión ambiental', 'password' => Hash::make($password), 'role' => 'reviewer']);
        $factor = EmissionFactor::firstOrCreate(['grid' => 'SEN', 'year' => 2026, 'version' => 'DEMO-2026-v1'],
            ['kg_co2e_per_kwh' => 0.25, 'source_label' => 'Factor ficticio para pruebas; no oficial', 'source_url' => null, 'is_demo' => true]);
        $facilities = [
            Facility::firstOrCreate(['code' => 'PL-01'], ['name' => 'Planta Temuco', 'location' => 'Temuco, La Araucanía', 'grid' => 'SEN']),
            Facility::firstOrCreate(['code' => 'PL-02'], ['name' => 'Planta Valdivia', 'location' => 'Valdivia, Los Ríos', 'grid' => 'SEN']),
        ];
        $consumption = [[10000, 12000, 11800, 11500, 12200, 11900], [7400, 7600, 7100, 7900, 8100]];
        $production = [[100, 150, 148, 145, 155, 153], [85, 89, 88, 94, 98]];
        $workflow = app(EnergyWorkflow::class);
        foreach ($facilities as $idx => $facility) {
            foreach ($consumption[$idx] as $month => $kwh) {
                $record = $workflow->create(['facility_id' => $facility->id, 'emission_factor_id' => $factor->id,
                    'period' => sprintf('2026-%02d', $month + 1), 'electricity_kwh' => $kwh,
                    'production_tonnes' => $production[$idx][$month], 'evidence_ref' => sprintf('Factura ficticia %s-2026-%02d', $facility->code, $month + 1),
                    'notes' => 'Datos sintéticos para demostración.'], $operator);
                if ($month === 3 && $idx === 1) {
                    continue;
                }
                $record = $workflow->transition($record, 'submit', $record->lock_version, $operator, null);
                if ($month === 5) {
                    continue;
                }
                $workflow->transition($record, 'approve', $record->lock_version, $reviewer, 'Revisión de evidencia ficticia completada.');
            }
        }
    }
}
