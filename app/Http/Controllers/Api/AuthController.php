<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\StrongPassword;
use App\Services\AuditLogger;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request, JwtService $jwt)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', Rule::unique('users')],
            'phone' => ['required', 'string', 'regex:/^09\d{9}$/', Rule::unique('users')],
            'password' => ['required', 'string', 'min:8', new StrongPassword, 'confirmed'],
        ], [
            'phone.required' => 'Mobile number is required.',
            'phone.regex' => 'Enter a valid 11-digit mobile number starting with 09.',
            'phone.unique' => 'This mobile number is already linked to an account.',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'farmer',
            'requested_role' => null,
            'status' => 'active',
            'barangay_id' => null,
            'permissions' => [],
        ])->load(['barangay', 'barangays']);

        return response()->json([
            'message' => 'Beneficiary account created.',
            'token_type' => 'Bearer',
            'access_token' => $jwt->issue($user),
            'user' => $user,
        ], 201);
    }

    private function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (str_starts_with($digits, '639') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }

    public function login(Request $request, JwtService $jwt, AuditLogger $audit)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with(['barangay', 'barangays'])->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        if ($user->status === 'pending') {
            throw ValidationException::withMessages(['email' => 'Your account is awaiting admin approval.']);
        }

        if ($user->status === 'rejected') {
            $reason = $user->rejection_reason ? " Reason: {$user->rejection_reason}" : '';
            throw ValidationException::withMessages(['email' => "Your account request was rejected.{$reason}"]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages(['email' => 'This account is inactive. Please contact the Municipal Agriculture Office.']);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $audit->log($request, 'login', $user);

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $jwt->issue($user),
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load(['barangay', 'barangays']));
    }

    public function activity(Request $request)
    {
        return response()->json(
            $request->user()
                ->auditLogs()
                ->latest()
                ->limit($request->integer('limit', 5))
                ->get(['id', 'action', 'auditable_type', 'auditable_id', 'created_at'])
        );
    }

    public function updateAvatar(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update([
            'avatar_path' => $data['avatar']->store('user-avatars', 'public'),
        ]);

        $audit->log($request, 'user.avatar_updated', $user);

        return response()->json($user->fresh()->load(['barangay', 'barangays']));
    }

    public function updateProfile(Request $request, AuditLogger $audit)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'regex:/^09\d{9}$/', Rule::unique('users')->ignore($request->user()->id)],
            'office_department' => ['nullable', 'string', 'max:180'],
        ], [
            'phone.regex' => 'Enter a valid 11-digit mobile number starting with 09.',
            'phone.unique' => 'This mobile number is already linked to an account.',
        ]);

        $user = $request->user();
        $old = $user->only(['name', 'phone', 'office_department']);
        $user->update($data);

        $audit->log($request, 'user.profile_updated', $user, $old, $user->fresh()->only(['name', 'phone', 'office_department']));

        return response()->json($user->fresh()->load(['barangay', 'barangays']));
    }

    public function updatePassword(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', new StrongPassword, 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $user->update([
            'password' => Hash::make($data['password']),
            'password_changed_at' => now(),
            'must_change_password' => false,
        ]);

        $audit->log($request, 'user.password_changed', $user);

        return response()->json(['message' => 'Password updated.']);
    }
}
