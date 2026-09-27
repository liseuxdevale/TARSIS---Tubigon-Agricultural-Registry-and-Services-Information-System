<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use RuntimeException;

class JwtService
{
    public function issue(User $user): string
    {
        $now = Carbon::now();

        return $this->encode([
            'iss' => config('app.url'),
            'sub' => $user->id,
            'role' => $user->role,
            'iat' => $now->timestamp,
            'exp' => $now->copy()->addHours(12)->timestamp,
        ]);
    }

    public function userFromToken(string $token): ?User
    {
        $payload = $this->decode($token);

        if (($payload['exp'] ?? 0) < Carbon::now()->timestamp) {
            throw new RuntimeException('Token expired.');
        }

        return User::query()
            ->with(['barangay', 'barangays'])
            ->whereKey($payload['sub'] ?? null)
            ->where('status', 'active')
            ->first();
    }

    private function encode(array $payload): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $segments[] = $this->sign(implode('.', $segments));

        return implode('.', $segments);
    }

    private function decode(string $token): array
    {
        $segments = explode('.', $token);

        if (count($segments) !== 3 || ! hash_equals($this->sign($segments[0].'.'.$segments[1]), $segments[2])) {
            throw new RuntimeException('Invalid token.');
        }

        return json_decode($this->base64UrlDecode($segments[1]), true, 512, JSON_THROW_ON_ERROR);
    }

    private function sign(string $value): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $value, config('app.key'), true));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/'));
    }
}
