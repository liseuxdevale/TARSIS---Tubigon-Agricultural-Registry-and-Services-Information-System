import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('tarsis_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(token));

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setUser(null);
            return;
        }

        setLoading(true);
        api.get('/auth/me')
            .then((response) => setUser(response.data))
            .catch(() => {
                localStorage.removeItem('tarsis_token');
                setToken(null);
            })
            .finally(() => setLoading(false));
    }, [token]);

    async function login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('tarsis_token', response.data.access_token);
        setToken(response.data.access_token);
        setUser(response.data.user);
        return response.data.user;
    }

    async function register(payload) {
        const response = await api.post('/auth/register', payload);
        localStorage.setItem('tarsis_token', response.data.access_token);
        setToken(response.data.access_token);
        setUser(response.data.user);
        return response.data.user;
    }

    function logout() {
        localStorage.removeItem('tarsis_token');
        setToken(null);
        setUser(null);
    }

    function updateUser(nextUser) {
        setUser(nextUser);
    }

    const value = useMemo(() => ({ token, user, loading, signedIn: Boolean(token), login, register, logout, updateUser }), [token, user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
