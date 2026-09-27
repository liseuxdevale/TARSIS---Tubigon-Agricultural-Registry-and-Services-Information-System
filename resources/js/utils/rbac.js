export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    MAO_STAFF: 'mao_staff',
    BARANGAY_STAFF: 'barangay_technical_staff',
    CROP_HEAD: 'crop_head',
    FISH_HEAD: 'fish_head',
    LIVESTOCK_HEAD: 'livestock_head',
    POULTRY_HEAD: 'poultry_head',
    FARMER: 'farmer',
    USER_ACCOUNT: 'pending_staff',
};

export const roleLabels = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.MAO_STAFF]: 'MAO Administrator',
    [ROLES.BARANGAY_STAFF]: 'Barangay Technical Staff',
    [ROLES.CROP_HEAD]: 'Crop Head',
    [ROLES.FISH_HEAD]: 'Fishery Head',
    [ROLES.LIVESTOCK_HEAD]: 'Livestock Head',
    [ROLES.POULTRY_HEAD]: 'Poultry Head',
    [ROLES.FARMER]: 'Farmer/Fisherfolk',
    [ROLES.USER_ACCOUNT]: 'User Account',
};

export const permissions = {
    manageUsers: [ROLES.SUPER_ADMIN],
    viewAuditLogs: [ROLES.SUPER_ADMIN],
    approveRegistrations: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageAnnouncements: [ROLES.SUPER_ADMIN, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageNotifications: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageAssistance: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageInsurance: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageReports: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    manageBarangays: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF],
    manageGeoMapping: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
    viewBarangayScope: [ROLES.SUPER_ADMIN, ROLES.MAO_STAFF, ROLES.BARANGAY_STAFF, ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD],
};

export const sectorAdminRoles = [ROLES.CROP_HEAD, ROLES.FISH_HEAD, ROLES.LIVESTOCK_HEAD, ROLES.POULTRY_HEAD];

export function roleSector(userOrRole) {
    const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
    return {
        [ROLES.CROP_HEAD]: 'farmer',
        [ROLES.FISH_HEAD]: 'fisherfolk',
        [ROLES.LIVESTOCK_HEAD]: 'livestock',
        [ROLES.POULTRY_HEAD]: 'poultry',
    }[role] || null;
}

export function hasAnyRole(user, roles) {
    return Boolean(user?.role && roles.includes(user.role));
}

export function can(user, permission) {
    return hasAnyRole(user, permissions[permission] || []);
}

export function isBarangayScoped(user) {
    return user?.role === ROLES.BARANGAY_STAFF;
}

export function assignedBarangayIds(user) {
    const ids = Array.isArray(user?.barangays)
        ? user.barangays.map((barangay) => Number(barangay.id)).filter(Boolean)
        : [];

    if (!ids.length && user?.barangay_id) ids.push(Number(user.barangay_id));

    return [...new Set(ids)];
}

export function hasBarangayAccess(user, barangayId) {
    return assignedBarangayIds(user).includes(Number(barangayId));
}

export function roleName(user) {
    return roleLabels[user?.role] || String(user?.role || '').replaceAll('_', ' ');
}
