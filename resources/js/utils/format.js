export function cx(...values) {
    return values.filter(Boolean).join(' ');
}

export function today() {
    return new Date().toISOString().slice(0, 10);
}

export function formatDate(value) {
    if (!value) return 'Not set';
    return String(value).slice(0, 10);
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
