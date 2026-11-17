<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmissionFactor extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['year' => 'integer', 'kg_co2e_per_kwh' => 'decimal:8', 'is_demo' => 'boolean'];
    }

    public function snapshot(): array
    {
        return $this->only(['id', 'grid', 'year', 'version', 'kg_co2e_per_kwh', 'source_label', 'source_url', 'is_demo']);
    }
}
