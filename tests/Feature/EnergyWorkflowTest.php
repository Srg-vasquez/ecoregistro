<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\EmissionFactor;
use App\Models\EnergyRecord;
use App\Models\Facility;
use App\Models\User;
use App\Services\EnergyWorkflow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnergyWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;

    private User $reviewer;

    private Facility $facility;

    private EmissionFactor $factor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->operator = User::factory()->create(['role' => 'operator']);
        $this->reviewer = User::factory()->create(['role' => 'reviewer']);
        $this->facility = Facility::create(['name' => 'Prueba', 'code' => 'T1', 'location' => 'Temuco', 'grid' => 'SEN']);
        $this->factor = EmissionFactor::create(['grid' => 'SEN', 'year' => 2026, 'version' => 'demo-v1', 'kg_co2e_per_kwh' => 0.25,
            'source_label' => 'Ficticio', 'is_demo' => true]);
    }

    private function payload(array $overrides = []): array
    {
        return array_replace(['facility_id' => $this->facility->id, 'emission_factor_id' => $this->factor->id,
            'period' => '2026-01', 'electricity_kwh' => 10000, 'production_tonnes' => 100,
            'evidence_ref' => 'Factura ficticia'], $overrides);
    }

    private function record(): EnergyRecord
    {
        return app(EnergyWorkflow::class)->create($this->payload(), $this->operator);
    }

    private function approve(): EnergyRecord
    {
        $w = app(EnergyWorkflow::class);
        $r = $this->record();
        $r = $w->transition($r, 'submit', 1, $this->operator, null);

        return $w->transition($r, 'approve', 2, $this->reviewer, null);
    }

    public function test_api_requires_a_session(): void
    {
        $this->getJson('/api/records')->assertUnauthorized();
        $this->getJson('/api/export')->assertUnauthorized();
    }

    public function test_login_and_logout(): void
    {
        $user = User::factory()->create(['email' => 'demo@example.test', 'password' => 'long-test-password']);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'incorrect'])->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'long-test-password'])->assertOk()->assertJsonPath('user.id', $user->id);
        $this->postJson('/api/logout')->assertOk()->assertJsonPath('user', null);
        $this->getJson('/api/records')->assertUnauthorized();
    }

    public function test_create_duplicate_and_invalid_measurements(): void
    {
        $this->actingAs($this->operator)->postJson('/api/records', $this->payload())->assertCreated()->assertJsonPath('record.lock_version', 1);
        $this->postJson('/api/records', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('period');
        $this->postJson('/api/records', $this->payload(['period' => '2026-02', 'electricity_kwh' => -1]))->assertUnprocessable()->assertJsonValidationErrors('electricity_kwh');
        $this->postJson('/api/records', $this->payload(['period' => '2026-02', 'electricity_kwh' => '1.12345']))->assertUnprocessable();
    }

    public function test_factor_must_match_year_and_electrical_grid(): void
    {
        $this->actingAs($this->operator)->postJson('/api/records', $this->payload(['period' => '2027-01']))->assertUnprocessable()->assertJsonValidationErrors('emission_factor_id');
        $this->factor->update(['grid' => 'OTHER']);
        $this->postJson('/api/records', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('emission_factor_id');
    }

    public function test_reviewer_cannot_create_and_operator_cannot_approve(): void
    {
        $this->actingAs($this->reviewer)->postJson('/api/records', $this->payload())->assertForbidden();
        $r = $this->record();
        $this->actingAs($this->operator)->postJson("/api/records/{$r->id}/transition", ['action' => 'submit', 'lock_version' => 1])->assertOk();
        $this->postJson("/api/records/{$r->id}/transition", ['action' => 'approve', 'lock_version' => 2])->assertForbidden();
    }

    public function test_full_workflow_snapshots_the_factor_and_audits_every_step(): void
    {
        $r = $this->approve();
        $this->assertEquals(2500, $r->emissions_kg_co2e);
        $this->assertSame('demo-v1', $r->factor_snapshot['version']);
        $this->assertSame(3, AuditEvent::where('energy_record_id', $r->id)->count());
        $this->factor->update(['kg_co2e_per_kwh' => 0.8, 'version' => 'changed']);
        $this->actingAs($this->reviewer)->getJson("/api/records/{$r->id}")->assertOk()
            ->assertJsonPath('record.factor.version', 'demo-v1')->assertJsonPath('record.emissions_tonnes', 2.5);
    }

    public function test_approved_records_are_immutable(): void
    {
        $r = $this->approve();
        $this->actingAs($this->operator)->putJson("/api/records/{$r->id}", $this->payload(['lock_version' => 3, 'electricity_kwh' => 2]))->assertConflict();
        $this->assertEquals(10000, $r->fresh()->electricity_kwh);
    }

    public function test_stale_version_does_not_overwrite_someone_elses_changes(): void
    {
        $r = $this->record();
        $this->actingAs($this->operator)->putJson("/api/records/{$r->id}", $this->payload(['lock_version' => 1, 'electricity_kwh' => 11]))->assertOk();
        $this->putJson("/api/records/{$r->id}", $this->payload(['lock_version' => 1, 'electricity_kwh' => 99]))->assertConflict();
        $this->assertEquals(11, $r->fresh()->electricity_kwh);
    }

    public function test_another_operator_cannot_edit_or_submit_the_record(): void
    {
        $r = $this->record();
        $other = User::factory()->create(['role' => 'operator']);
        $this->actingAs($other)->putJson("/api/records/{$r->id}", $this->payload(['lock_version' => 1]))->assertForbidden();
        $this->postJson("/api/records/{$r->id}/transition", ['action' => 'submit', 'lock_version' => 1])->assertForbidden();
    }

    public function test_correction_requires_reason_and_must_be_resubmitted(): void
    {
        $r = $this->record();
        $url = "/api/records/{$r->id}/transition";
        $this->actingAs($this->operator)->postJson($url, ['action' => 'submit', 'lock_version' => 1])->assertOk();
        $this->actingAs($this->reviewer)->postJson($url, ['action' => 'request_changes', 'lock_version' => 2])->assertUnprocessable();
        $this->postJson($url, ['action' => 'request_changes', 'lock_version' => 2, 'review_note' => 'Revisar la factura de consumo.'])->assertOk()->assertJsonPath('record.status', 'changes_requested');
        $this->postJson($url, ['action' => 'approve', 'lock_version' => 3])->assertConflict();
        $this->actingAs($this->operator)->postJson($url, ['action' => 'submit', 'lock_version' => 3])->assertOk()->assertJsonPath('record.status', 'submitted');
    }

    public function test_totals_ignore_drafts_and_use_weighted_intensity(): void
    {
        $this->approve();
        $f2 = Facility::create(['name' => 'Segunda', 'code' => 'T2', 'location' => 'Valdivia', 'grid' => 'SEN']);
        $w = app(EnergyWorkflow::class);
        $r = $w->create($this->payload(['facility_id' => $f2->id, 'electricity_kwh' => 20000, 'production_tonnes' => 400]), $this->operator);
        $this->actingAs($this->operator)->getJson('/api/dashboard?period=2026-01')->assertOk()->assertJsonPath('metrics.electricity_kwh', 10000)
            ->assertJsonPath('metrics.coverage_pct', 50);
        $r = $w->transition($r, 'submit', 1, $this->operator, null);
        $w->transition($r, 'approve', 2, $this->reviewer, null);
        $this->getJson('/api/dashboard?period=2026-01')->assertJsonPath('metrics.intensity', 60)->assertJsonPath('metrics.emissions_tonnes', 7.5);
    }

    public function test_empty_month_and_zero_production_are_not_misleading(): void
    {
        $this->actingAs($this->operator)->getJson('/api/dashboard?period=2026-02')->assertOk()->assertJsonPath('metrics.intensity', null)
            ->assertJsonPath('metrics.missing_count', 1)->assertJsonPath('metrics.coverage_pct', 0);
        $this->postJson('/api/records', $this->payload(['production_tonnes' => 0]))->assertCreated()->assertJsonPath('record.intensity', null);
    }

    public function test_trend_includes_first_and_last_months_of_the_range(): void
    {
        $this->approve();
        $this->actingAs($this->operator)->getJson('/api/dashboard?period=2026-06')->assertOk()
            ->assertJsonPath('trend.0.period', '2026-01')->assertJsonPath('trend.0.electricity_kwh', 10000)
            ->assertJsonPath('trend.5.period', '2026-06')->assertJsonPath('trend.5.approved_count', 0);
        $this->getJson('/api/dashboard?period=2026-13')->assertUnprocessable();
        $this->postJson('/api/records', $this->payload(['period' => '2026-13']))->assertUnprocessable();
    }

    public function test_csv_only_exports_approved_rows_and_neutralizes_spreadsheet_formulas(): void
    {
        $r = $this->approve();
        $r->update(['evidence_ref' => '=2+2']);
        app(EnergyWorkflow::class)->create($this->payload(['period' => '2026-02']), $this->operator);
        $response = $this->actingAs($this->reviewer)->get('/api/export');
        $response->assertOk();
        $csv = $response->streamedContent();
        $this->assertStringContainsString("'=2+2", $csv);
        $this->assertStringNotContainsString('2026-02', $csv);
        $this->assertStringContainsString('demo-v1', $csv);
    }
}
