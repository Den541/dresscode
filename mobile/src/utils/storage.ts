import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'dresscode:accessToken';
const REFRESH_TOKEN_KEY = 'dresscode:refreshToken';
const USER_KEY = 'dresscode:user';

// Helper to detect if SecureStore is available on this platform
const isSecureStoreAvailable = async (): Promise<boolean> => {
    try {
        const testKey = 'dresscode:test';
        await SecureStore.setItemAsync(testKey, 'test');
        await SecureStore.deleteItemAsync(testKey);
        return true;
    } catch {
        return false;
    }
};

export type StoredUser = {
    id: string;
    email: string;
    name: string | null;
};

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export const storage = {
    async saveTokens(tokens: AuthTokens): Promise<void> {
        try {
            // Try SecureStore first, fallback to AsyncStorage on error
            try {
                await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
                await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
                return;
            } catch (secureStoreError) {
                console.warn('SecureStore unavailable, falling back to AsyncStorage:', secureStoreError);
            }

            // Fallback: use AsyncStorage if SecureStore fails
            await AsyncStorage.multiSet([
                [ACCESS_TOKEN_KEY, tokens.accessToken],
                [REFRESH_TOKEN_KEY, tokens.refreshToken],
            ]);
        } catch (error) {
            console.error('Failed to save tokens:', error);
            throw error;
        }
    },

    async getTokens(): Promise<AuthTokens | null> {
        try {
            // Try SecureStore first
            try {
                const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
                const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

                if (accessToken && refreshToken) {
                    return { accessToken, refreshToken };
                }
            } catch (secureStoreError) {
                console.warn('SecureStore read failed, trying AsyncStorage:', secureStoreError);
            }

            // Fallback: try AsyncStorage
            const tokens = await AsyncStorage.multiGet([
                ACCESS_TOKEN_KEY,
                REFRESH_TOKEN_KEY,
            ]);
            const [accessToken, refreshToken] = tokens.map(([_, value]) => value);

            if (!accessToken || !refreshToken) {
                return null;
            }

            return { accessToken, refreshToken };
        } catch (error) {
            console.error('Failed to get tokens:', error);
            return null;
        }
    },

    async saveUser(user: StoredUser): Promise<void> {
        try {
            const userJson = JSON.stringify(user);

            // Try SecureStore first, fallback to AsyncStorage on error
            try {
                await SecureStore.setItemAsync(USER_KEY, userJson);
                return;
            } catch (secureStoreError) {
                console.warn('SecureStore unavailable, falling back to AsyncStorage:', secureStoreError);
            }

            // Fallback: use AsyncStorage if SecureStore fails
            await AsyncStorage.setItem(USER_KEY, userJson);
        } catch (error) {
            console.error('Failed to save user:', error);
            throw error;
        }
    },

    async getUser(): Promise<StoredUser | null> {
        try {
            // Try SecureStore first
            try {
                const user = await SecureStore.getItemAsync(USER_KEY);
                if (user) {
                    return JSON.parse(user);
                }
            } catch (secureStoreError) {
                console.warn('SecureStore read failed, trying AsyncStorage:', secureStoreError);
            }

            // Fallback: try AsyncStorage
            const user = await AsyncStorage.getItem(USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    },

    async clearAll(): Promise<void> {
        try {
            // Clear from both storages
            try {
                await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
                await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
                await SecureStore.deleteItemAsync(USER_KEY);
            } catch (secureStoreError) {
                console.warn('SecureStore clear failed:', secureStoreError);
            }

            // Always clear from AsyncStorage as well
            await AsyncStorage.multiRemove([
                ACCESS_TOKEN_KEY,
                REFRESH_TOKEN_KEY,
                USER_KEY,
            ]);
        } catch (error) {
            console.error('Failed to clear storage:', error);
            throw error;
        }
    },
};
