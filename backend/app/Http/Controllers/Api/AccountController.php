<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginAccountRequest;
use App\Http\Requests\RegisterAccountRequest;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AccountController
{
    public function register(RegisterAccountRequest $request): JsonResponse
    {
        try {
            User::create($request->validated());
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['email' => 'Email này đã được đăng ký.']);
        }

        return response()->json(['message' => 'Đăng ký thành công. Bạn có thể đăng nhập.'], 201);
    }

    public function login(LoginAccountRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $key = 'account-login:'.hash('sha256', $credentials['email'].'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }

        if (! Auth::guard('web')->attemptWhen($credentials, fn (User $user) => $user->is_active)) {
            RateLimiter::hit($key);
            throw ValidationException::withMessages(['email' => 'Email hoặc mật khẩu không đúng.']);
        }

        RateLimiter::clear($key);
        $request->session()->regenerate();

        return response()->json($request->user());
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
