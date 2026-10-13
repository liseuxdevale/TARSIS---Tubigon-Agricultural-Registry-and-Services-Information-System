<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value)
            || !preg_match('/\p{L}/u', $value)
            || !preg_match('/\p{N}/u', $value)
            || !preg_match('/[^\p{L}\p{N}\s]/u', $value)) {
            $fail('Password must contain at least one letter, one number, and one symbol.');
        }
    }
}
