<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\EnergyRecord;
use App\Models\Facility;
use Carbon\CarbonImmutable;

class DashboardService
{
    public function forPeriod(string $period): array
    {
        $date = CarbonImmutable::createFromFormat('!Y-m', $period);
        $facilities = Facility::where('active', true)->get();
        $records = EnergyRecord::with(['facility', 'factor', 'author', 'reviewer'])
            ->whereBetween('period', [$date->subMonths(5)->startOfMonth()->toDateString(), $date->endOfMonth()->toDateString()])->get();
        $current = $records->filter(fn ($r) => $r->period->format('Y-m') === $period);
        $approved = $current->where('status', 'approved');
        $kwh = (float) $approved->sum('electricity_kwh');
        $tonnes = (float) $approved->sum('production_tonnes');
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $date->subMonths($i)->format('Y-m');
            $subset = $records->filter(fn ($r) => $r->period->format('Y-m') === $month)->where('status', 'approved');
            $trend[] = ['period' => $month, 'electricity_kwh' => (float) $subset->sum('electricity_kwh'),
                'emissions_tonnes' => (float) $subset->sum('emissions_kg_co2e') / 1000,
                'approved_count' => $subset->count(), 'expected_count' => $facilities->count()];
        }

        return [
            'period' => $period,
            'metrics' => ['electricity_kwh' => $kwh, 'emissions_tonnes' => (float) $approved->sum('emissions_kg_co2e') / 1000,
                'intensity' => EnergyMetrics::intensity($kwh, $tonnes), 'production_tonnes' => $tonnes,
                'coverage_pct' => $facilities->count() ? round(100 * $approved->count() / $facilities->count()) : null,
                'approved_count' => $approved->count(), 'expected_count' => $facilities->count(),
                'pending_review' => EnergyRecord::where('status', 'submitted')->count(),
                'missing_count' => $facilities->filter(fn ($f) => ! $current->contains('facility_id', $f->id))->count()],
            'trend' => $trend,
            'facilities' => $facilities->map(function ($facility) use ($current) {
                return [...$facility->only(['id', 'name', 'code', 'location']), 'record' => $current->firstWhere('facility_id', $facility->id)?->present()];
            })->values(),
            'recent_events' => AuditEvent::with('user')->latest('id')->limit(5)->get()->map(fn ($event) => [
                'id' => $event->id, 'record_id' => $event->energy_record_id, 'action' => $event->action,
                'user' => $event->user->name, 'at' => $event->created_at->toIso8601String()]),
            'methodology' => ['scope' => 'Electricidad adquirida · alcance 2 · método local',
                'is_demo' => true, 'note' => 'Datos y factores ficticios. Estimación parcial de demostración; no es una huella organizacional verificada.'],
        ];
    }
}
