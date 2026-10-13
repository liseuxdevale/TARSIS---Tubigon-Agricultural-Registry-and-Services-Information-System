export function cx(...values) {
    return values.filter(Boolean).join(' ');
}

export function formatRegistryNumber(value) {
    const number = String(value || '');
    const digits = number.replace(/-/g, '');
    if (!/^\d{15}$/.test(digits)) return number;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function today() {
    return new Date().toISOString().slice(0, 10);
}

export function formatDate(value) {
    if (!value) return 'Not set';
    const day = dateInputValue(value);
    const date = new Date(`${day}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function dateInputValue(value) {
    return value ? String(value).slice(0, 10) : '';
}

export function formatDateTime(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return date.toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

export function formatJson(value) {
    if (!value || (typeof value === 'object' && !Object.keys(value).length)) return 'Not set';
    if (typeof value === 'string') return value;
    return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(', ');
}

export function parseKeyValue(value) {
    if (!value) return {};
    return Object.fromEntries(
        value
            .split(',')
            .map((part) => part.split(':').map((item) => item.trim()))
            .filter(([key]) => key)
            .map(([key, item]) => [key, item || ''])
    );
}
