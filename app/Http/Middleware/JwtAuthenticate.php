<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class JwtAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => 'Missing bearer token.'], 401);
        }

        try {
            $user = app(JwtService::class)->userFromToken($token);
        } catch (Throwable $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        }

        if (! $user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
