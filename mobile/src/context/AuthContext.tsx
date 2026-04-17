import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';

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
    refreshAccessToken: () => Promise<string | null>;
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
    const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

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

    const clearSession = async () => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        setError(null);
        await storage.clearAll();
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

            await clearSession();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshAccessToken = async (): Promise<string | null> => {
        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const activeRefreshToken = refreshToken;
        if (!activeRefreshToken) {
            return null;
        }

        refreshPromiseRef.current = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: activeRefreshToken }),
                });

                if (!response.ok) {
                    const isInvalidRefresh = response.status === 401 || response.status === 403;
                    if (isInvalidRefresh) {
                        await clearSession();
                    }
                    return null;
                }

                const data = await response.json();
                const nextAccessToken = data?.accessToken as string | undefined;
                const nextRefreshToken =
                    (data?.refreshToken as string | undefined) ?? activeRefreshToken;

                if (!nextAccessToken) {
                    return null;
                }

                setAccessToken(nextAccessToken);
                setRefreshToken(nextRefreshToken);

                await storage.saveTokens({
                    accessToken: nextAccessToken,
                    refreshToken: nextRefreshToken,
                });

                return nextAccessToken;
            } catch (err) {
                console.error('Refresh token flow failed:', err);
                return null;
            } finally {
                refreshPromiseRef.current = null;
            }
        })();

        return refreshPromiseRef.current;
    };

    const value: AuthContextType = {
        user,
        accessToken,
        refreshToken,
        loading,
        error,
        login,
        register,
        refreshAccessToken,
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
