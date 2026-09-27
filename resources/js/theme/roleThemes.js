import { ROLES } from '../utils/rbac';

export const ROLE_THEME_KEYS = {
    SUPER_ADMIN: 'super-admin',
    MAO_ADMIN: 'mao-admin',
    BARANGAY_STAFF: 'barangay-staff',
    BENEFICIARY: 'beneficiary',
};

export const ROLE_THEMES = {
    [ROLE_THEME_KEYS.SUPER_ADMIN]: {
        name: 'Deep Forest',
        gradientStart: '#0B3D2E',
        gradientEnd: '#14251C',
        accent: '#D9A441',
        radius: '0.875rem',
    },
    [ROLE_THEME_KEYS.MAO_ADMIN]: {
        name: 'Government Green',
        gradientStart: '#1B5E3F',
        gradientEnd: '#2E7D5B',
        accent: '#38BDF8',
        radius: '1rem',
    },
    [ROLE_THEME_KEYS.BARANGAY_STAFF]: {
        name: 'Field Green',
        gradientStart: '#2F6B3F',
        gradientEnd: '#6FA96A',
        accent: '#F4B860',
        radius: '1.125rem',
    },
    [ROLE_THEME_KEYS.BENEFICIARY]: {
        name: 'Fresh Sprout',
        gradientStart: '#1B7A3A',
        gradientEnd: '#4CAF50',
        accent: '#FDE047',
        radius: '1.25rem',
    },
};

export function roleThemeKey(role) {
    if (role === ROLES.SUPER_ADMIN) return ROLE_THEME_KEYS.SUPER_ADMIN;
    if (role === ROLES.BARANGAY_STAFF) return ROLE_THEME_KEYS.BARANGAY_STAFF;
    if (role === ROLES.FARMER) return ROLE_THEME_KEYS.BENEFICIARY;
    return ROLE_THEME_KEYS.MAO_ADMIN;
}

export function roleTheme(role) {
    const key = roleThemeKey(role);

    return {
        key,
        ...ROLE_THEMES[key],
        shell: {
            [ROLE_THEME_KEYS.SUPER_ADMIN]: 'bg-[var(--role-bg)] text-[var(--role-text)]',
            [ROLE_THEME_KEYS.MAO_ADMIN]: 'bg-[var(--role-bg)] text-[var(--role-text)]',
            [ROLE_THEME_KEYS.BARANGAY_STAFF]: 'bg-[var(--role-bg)] text-[var(--role-text)]',
            [ROLE_THEME_KEYS.BENEFICIARY]: 'bg-[var(--role-bg)] text-[var(--role-text)]',
        }[key],
        sidebar: 'var(--role-sidebar)',
    };
}
