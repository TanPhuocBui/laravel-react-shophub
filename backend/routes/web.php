<?php

use App\Http\Controllers\Api\AccountController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/register', [AccountController::class, 'register'])->middleware('throttle:8,1,account-register');
Route::post('/login', [AccountController::class, 'login'])->middleware('throttle:30,1,account-login');
Route::post('/logout', [AccountController::class, 'logout']);
