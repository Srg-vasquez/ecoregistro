<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthSessionController extends Controller
{
    public function session(Request $request)
    {
        return response()->json(['user' => $request->user()?->only(['id', 'name', 'email', 'role']), 'csrf_token' => csrf_token()]);
    }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string', 'max:200']]);
        if (! Auth::attempt($data)) {
            throw ValidationException::withMessages(['email' => 'Correo o contraseña incorrectos.']);
        }
        $request->session()->regenerate();

        return $this->session($request);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['user' => null, 'csrf_token' => csrf_token()]);
    }
}
