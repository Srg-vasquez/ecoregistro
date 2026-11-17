<?php

namespace App\Models;

use App\Services\EnergyMetrics;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnergyRecord extends Model
{
    protected $guarded = ['id'];

    protected $attributes = ['lock_version' => 1, 'status' => 'draft'];

    protected function casts(): array
    {
        return ['period' => 'date:Y-m-d', 'reviewed_at' => 'datetime', 'factor_snapshot' => 'array',
            'electricity_kwh' => 'decimal:3', 'production_tonnes' => 'decimal:3',
            'emissions_kg_co2e' => 'decimal:6', 'lock_version' => 'integer', 'created_by' => 'integer'];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function factor(): BelongsTo
    {
        return $this->belongsTo(EmissionFactor::class, 'emission_factor_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AuditEvent::class);
    }

    public function present(): array
    {
        $factor = $this->factor_snapshot ?? $this->factor->snapshot();

        return [...$this->only(['id', 'facility_id', 'emission_factor_id', 'status', 'evidence_ref', 'notes',
            'created_by', 'review_note', 'lock_version']),
            'period' => $this->period->format('Y-m'),
            'facility' => $this->facility->only(['id', 'name', 'code', 'location']),
            'author' => $this->author->name,
            'reviewer' => $this->reviewer?->name,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'electricity_kwh' => (float) $this->electricity_kwh,
            'production_tonnes' => (float) $this->production_tonnes,
            'intensity' => EnergyMetrics::intensity((float) $this->electricity_kwh, (float) $this->production_tonnes),
            'emissions_tonnes' => $this->status === 'approved' ? (float) $this->emissions_kg_co2e / 1000 : null,
            'estimated_emissions_tonnes' => EnergyMetrics::emissions((float) $this->electricity_kwh, (float) $factor['kg_co2e_per_kwh']) / 1000,
            'factor' => $factor];
    }
}
