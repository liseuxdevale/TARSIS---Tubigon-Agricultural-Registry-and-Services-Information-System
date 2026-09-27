import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('tarsis_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const fieldMessages = error.response?.data?.errors ? Object.values(error.response.data.errors).flat() : [];
        const message = fieldMessages[0] || error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed.';
        return Promise.reject(new Error(message));
    }
);

export async function downloadCsv(path, filename) {
    const response = await api.get(path, { responseType: 'blob', headers: { Accept: 'text/csv' } });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
