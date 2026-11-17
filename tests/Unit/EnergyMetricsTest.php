<?php

namespace Tests\Unit;

use App\Services\EnergyMetrics;
use PHPUnit\Framework\TestCase;

class EnergyMetricsTest extends TestCase
{
    public function test_units_and_rounding_are_explicit(): void
    {
        $this->assertSame(2500.0, EnergyMetrics::emissions(10000, 0.25));
        $this->assertSame(2.5, EnergyMetrics::emissions(10000, 0.25) / 1000);
        $this->assertSame(0.030864, EnergyMetrics::emissions(0.123456, 0.25));
    }

    public function test_zero_production_is_undefined_not_zero_efficiency(): void
    {
        $this->assertNull(EnergyMetrics::intensity(10000, 0));
        $this->assertSame(80.0, EnergyMetrics::intensity(12000, 150));
        $this->assertSame(0.0, EnergyMetrics::intensity(0, 100));
    }

    public function test_negative_consumption_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        EnergyMetrics::emissions(-1, 0.25);
    }
}
