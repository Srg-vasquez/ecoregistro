<?php

namespace App\Http\Controllers;

use App\Http\Requests\EnergyRecordRequest;
use App\Models\EmissionFactor;
use App\Models\EnergyRecord;
use App\Models\Facility;
use App\Services\DashboardService;
use App\Services\EnergyWorkflow;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EcoController extends Controller
{
    private function period(Request $request): ?string
    {
        return $request->validate(['period' => ['nullable', 'regex:/^20\d{2}-(0[1-9]|1[0-2])$/', 'date_format:Y-m']])['period'] ?? null;
    }

    public function meta()
    {
        $last = EnergyRecord::where('status', 'approved')->max('period');

        return response()->json(['facilities' => Facility::where('active', true)->get(),
            'factors' => EmissionFactor::orderByDesc('year')->get(),
            'default_period' => $last ? substr($last, 0, 7) : now()->format('Y-m')]);
    }

    public function dashboard(Request $request, DashboardService $service)
    {
        return response()->json($service->forPeriod($this->period($request) ?? now()->format('Y-m')));
    }

    public function index(Request $request)
    {
        $period = $this->period($request);
        $query = EnergyRecord::with(['facility', 'factor', 'author', 'reviewer']);
        if ($period) {
            $query->whereDate('period', $period.'-01');
        }

        return response()->json(['records' => $query->orderByDesc('period')->orderBy('facility_id')->limit(500)->get()->map->present()]);
    }

    public function show(EnergyRecord $record)
    {
        return response()->json(['record' => $record->load(['facility', 'factor', 'author', 'reviewer'])->present(),
            'events' => $record->events()->with('user')->orderByDesc('id')->get()->map(fn ($e) => [
                'id' => $e->id, 'action' => $e->action, 'user' => $e->user->name,
                'before' => $e->before, 'after' => $e->after, 'at' => $e->created_at->toIso8601String()])]);
    }

    public function store(EnergyRecordRequest $request, EnergyWorkflow $workflow)
    {
        return response()->json(['record' => $workflow->create($request->validated(), $request->user())->present()], 201);
    }

    public function update(EnergyRecordRequest $request, EnergyRecord $record, EnergyWorkflow $workflow)
    {
        return response()->json(['record' => $workflow->update($record, $request->validated(), $request->user())->present()]);
    }

    public function transition(Request $request, EnergyRecord $record, EnergyWorkflow $workflow)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['submit', 'approve', 'request_changes'])],
            'lock_version' => ['required', 'integer', 'min:1'], 'review_note' => ['nullable', 'string', 'max:1000']]);

        return response()->json(['record' => $workflow->transition($record, $data['action'], $data['lock_version'], $request->user(), $data['review_note'] ?? null)->present()]);
    }

    public function export(Request $request)
    {
        $period = $this->period($request);
        $query = EnergyRecord::with(['facility', 'factor', 'author', 'reviewer'])->where('status', 'approved');
        if ($period) {
            $query->whereDate('period', $period.'-01');
        }

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['instalacion', 'periodo', 'consumo_kwh', 'produccion_t', 'intensidad_kwh_por_t', 'emisiones_t_co2e',
                'factor_kg_co2e_por_kwh', 'version_factor', 'fuente_factor', 'factor_demo', 'referencia_evidencia', 'aprobado_por'], ';', '"', '');
            foreach ($query->orderBy('period')->get() as $record) {
                $r = $record->present();
                $row = [$r['facility']['name'], $r['period'], $r['electricity_kwh'], $r['production_tonnes'], $r['intensity'], $r['emissions_tonnes'],
                    $r['factor']['kg_co2e_per_kwh'], $r['factor']['version'], $r['factor']['source_label'], $r['factor']['is_demo'] ? 'SI' : 'NO',
                    $r['evidence_ref'], $r['reviewer']];
                $safe = array_map(fn ($v) => is_string($v) && preg_match('/^[\s]*[=+@\-]/u', $v) ? "'".$v : $v, $row);
                fputcsv($out, $safe, ';', '"', '');
            }
            fclose($out);
        }, 'ecoregistro-'.($period ?? 'todos').'-aprobados.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
