<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('operator');
        });
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('location');
            $table->string('grid')->default('SEN');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('emission_factors', function (Blueprint $table) {
            $table->id();
            $table->string('grid');
            $table->unsignedSmallInteger('year');
            $table->string('version');
            $table->decimal('kg_co2e_per_kwh', 12, 8);
            $table->string('source_label');
            $table->string('source_url')->nullable();
            $table->boolean('is_demo')->default(true);
            $table->timestamps();
            $table->unique(['grid', 'year', 'version']);
        });
        Schema::create('energy_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->restrictOnDelete();
            $table->foreignId('emission_factor_id')->constrained()->restrictOnDelete();
            $table->date('period');
            $table->decimal('electricity_kwh', 15, 3);
            $table->decimal('production_tonnes', 15, 3);
            $table->string('evidence_ref', 200);
            $table->text('notes')->nullable();
            $table->string('status')->default('draft')->index();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->json('factor_snapshot')->nullable();
            $table->decimal('emissions_kg_co2e', 18, 6)->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->unique(['facility_id', 'period']);
        });
        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('energy_record_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('action');
            $table->json('before')->nullable();
            $table->json('after');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('energy_records');
        Schema::dropIfExists('emission_factors');
        Schema::dropIfExists('facilities');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};
