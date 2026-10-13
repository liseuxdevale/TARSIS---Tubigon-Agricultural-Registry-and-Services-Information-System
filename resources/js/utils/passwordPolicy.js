export const passwordHelp = 'Use at least 8 characters, including letters, numbers, and symbols.';

export function isStrongPassword(value) {
    return [...value].length >= 8
        && /\p{L}/u.test(value)
        && /\p{N}/u.test(value)
        && /[^\p{L}\p{N}\s]/u.test(value);
}
