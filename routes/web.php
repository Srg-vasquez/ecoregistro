<?php

use App\Http\Controllers\AuthSessionController;
use App\Http\Controllers\EcoController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'app')->name('login');
Route::prefix('api')->group(function () {
    Route::get('/session', [AuthSessionController::class, 'session']);
    Route::post('/login', [AuthSessionController::class, 'login'])->middleware('throttle:10,1');
    Route::middleware('auth')->group(function () {
        Route::post('/logout', [AuthSessionController::class, 'logout']);
        Route::get('/meta', [EcoController::class, 'meta']);
        Route::get('/dashboard', [EcoController::class, 'dashboard']);
        Route::get('/export', [EcoController::class, 'export']);
        Route::get('/records', [EcoController::class, 'index']);
        Route::post('/records', [EcoController::class, 'store']);
        Route::get('/records/{record}', [EcoController::class, 'show']);
        Route::put('/records/{record}', [EcoController::class, 'update']);
        Route::post('/records/{record}/transition', [EcoController::class, 'transition']);
    });
});
