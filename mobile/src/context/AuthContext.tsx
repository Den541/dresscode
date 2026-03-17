import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { storage, StoredUser, AuthTokens } from '../utils/storage';

export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
};

type AuthContextType = {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
    restore: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Restore session on app start
    useEffect(() => {
        restore();
    }, []);

    const restore = async () => {
        try {
            setLoading(true);
            setError(null);
            const tokens = await storage.getTokens();
            const storedUser = await storage.getUser();

            if (tokens && storedUser) {
                setAccessToken(tokens.accessToken);
                setRefreshToken(tokens.refreshToken);
                setUser(storedUser);
            } else {
                setUser(null);
                setAccessToken(null);
                setRefreshToken(null);
            }
        } catch (err) {
            console.error('Failed to restore session:', err);
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data?.message || 'Login failed'
                );
            }

            const data = await response.json();

            setAccessToken(data.accessToken);
            setRefreshToken(data.refreshToken);
            setUser(data.user);

            await storage.saveTokens({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            await storage.saveUser(data.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (
        email: string,
        password: string,
        name?: string,
    ) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(
                    data?.message || 'Registration failed'
                );
            }

            const data = await response.json();

            setAccessToken(data.accessToken);
            setRefreshToken(data.refreshToken);
            setUser(data.user);

            await storage.saveTokens({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            await storage.saveUser(data.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);

            // Call logout endpoint if token is available
            if (accessToken) {
                try {
                    await fetch(`${API_BASE_URL}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                } catch (err) {
                    console.error('Failed to notify server of logout:', err);
                    // Continue with local logout anyway
                }
            }

            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            setError(null);
            await storage.clearAll();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        accessToken,
        refreshToken,
        loading,
        error,
        login,
        register,
        logout,
        restore,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
