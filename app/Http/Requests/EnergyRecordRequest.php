<?php

namespace App\Http\Requests;

use App\Models\EnergyRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EnergyRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'operator';
    }

    public function rules(): array
    {
        $id = $this->route('record')?->id;

        return [
            'facility_id' => ['required', 'integer', Rule::exists('facilities', 'id')->where('active', true)],
            'period' => ['bail', 'required', 'regex:/^20\d{2}-(0[1-9]|1[0-2])$/', 'date_format:Y-m', function ($attribute, $value, $fail) use ($id) {
                if (EnergyRecord::where('facility_id', $this->integer('facility_id'))->whereDate('period', $value.'-01')
                    ->when($id, fn ($q) => $q->where('id', '!=', $id))->exists()) {
                    $fail('Ya existe un registro para esa instalación y mes.');
                }
            }],
            'emission_factor_id' => ['required', 'integer', 'exists:emission_factors,id'],
            'electricity_kwh' => ['required', 'numeric', 'min:0', 'max:100000000', 'decimal:0,3'],
            'production_tonnes' => ['required', 'numeric', 'min:0', 'max:100000000', 'decimal:0,3'],
            'evidence_ref' => ['required', 'string', 'min:3', 'max:200'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lock_version' => [$id ? 'required' : 'sometimes', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return ['required' => 'Este campo es obligatorio.', 'period.unique' => 'Ya existe un registro para esa instalación y mes.',
            'period.date_format' => 'Usa un período con formato AAAA-MM.', 'decimal' => 'Usa como máximo tres decimales.',
            'min' => 'El valor es inferior al mínimo permitido.', 'max' => 'El valor supera el máximo permitido.'];
    }
}
