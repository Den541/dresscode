import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'dresscode:accessToken';
const REFRESH_TOKEN_KEY = 'dresscode:refreshToken';
const USER_KEY = 'dresscode:user';

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
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Failed to save user:', error);
            throw error;
        }
    },

    async getUser(): Promise<StoredUser | null> {
        try {
            const user = await AsyncStorage.getItem(USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    },

    async clearAll(): Promise<void> {
        try {
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
