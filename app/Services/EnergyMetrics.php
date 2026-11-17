<?php

namespace App\Services;

use InvalidArgumentException;

class EnergyMetrics
{
    public static function emissions(float $kwh, float $factor): float
    {
        if ($kwh < 0 || $factor < 0) {
            throw new InvalidArgumentException('Los valores no pueden ser negativos.');
        }

        return round($kwh * $factor, 6);
    }

    public static function intensity(float $kwh, float $tonnes): ?float
    {
        return $tonnes > 0 ? round($kwh / $tonnes, 3) : null;
    }
}
