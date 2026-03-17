import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

type Props = { navigation: any };

type UserPreferences = {
    style: 'CASUAL' | 'FORMAL' | 'SPORTY';
    coldSensitivity: number;
    favoriteCats: string[];
};

type UserProfile = {
    id: string;
    email: string;
    name: string | null;
    preferences: UserPreferences;
};

export default function ProfileScreen({ navigation }: Props) {
    const { user, accessToken, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [name, setName] = useState('');
    const [style, setStyle] = useState<'CASUAL' | 'FORMAL' | 'SPORTY'>('CASUAL');
    const [coldSensitivity, setColdSensitivity] = useState(0);
    const [favoriteCatsLocal, setFavoriteCatsLocal] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Load profile
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError('');

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json();
            setProfile(data);
            setName(data.name || '');
            setStyle(data.preferences.style);
            setColdSensitivity(data.preferences.coldSensitivity);
            setFavoriteCatsLocal(data.preferences.favoriteCats || []);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load profile';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccess('');
            setError('');

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    name: name || undefined,
                    style,
                    coldSensitivity,
                    favoriteCats: favoriteCatsLocal,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data?.message || 'Failed to save profile');
            }

            const updatedProfile = await response.json();
            setProfile(updatedProfile);
            setSuccess('Profile saved successfully!');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save profile';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            // Navigation will be handled by auth context
        } catch (err) {
            setError('Failed to logout');
        }
    };

    const toggleCat = (cat: string) => {
        setFavoriteCatsLocal((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal Info</Text>

                <Text style={styles.label}>Name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="#666"
                    style={styles.input}
                    autoCapitalize="words"
                    editable={!saving}
                />

                <Text style={styles.sectionTitle}>Style Preference</Text>
                <View style={styles.styleRow}>
                    {[
                        { label: 'Casual', value: 'CASUAL' as const },
                        { label: 'Formal', value: 'FORMAL' as const },
                        { label: 'Sporty', value: 'SPORTY' as const },
                    ].map((item) => (
                        <Pressable
                            key={item.value}
                            style={[
                                styles.styleBtn,
                                style === item.value && styles.styleBtnActive,
                            ]}
                            onPress={() => setStyle(item.value)}
                        >
                            <Text
                                style={[
                                    styles.styleBtnText,
                                    style === item.value && styles.styleBtnTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Cold Sensitivity</Text>
                <Text style={styles.label}>
                    Level: {coldSensitivity} (← more tolerant, less tolerant →)
                </Text>
                <View style={styles.sliderContainer}>
                    {[-5, -3, -1, 0, 1, 3, 5].map((val) => (
                        <Pressable
                            key={val}
                            style={[
                                styles.sliderBtn,
                                coldSensitivity === val && styles.sliderBtnActive,
                            ]}
                            onPress={() => setColdSensitivity(val)}
                        >
                            <Text
                                style={[
                                    styles.sliderBtnText,
                                    coldSensitivity === val && styles.sliderBtnTextActive,
                                ]}
                            >
                                {val}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Favorite Categories</Text>
                <View style={styles.categoriesContainer}>
                    {['Casual', 'Business', 'Sportwear', 'Streetwear'].map((cat) => (
                        <Pressable
                            key={cat}
                            style={[
                                styles.catBtn,
                                favoriteCatsLocal.includes(cat) && styles.catBtnActive,
                            ]}
                            onPress={() => toggleCat(cat)}
                        >
                            <Text
                                style={[
                                    styles.catBtnText,
                                    favoriteCatsLocal.includes(cat) && styles.catBtnTextActive,
                                ]}
                            >
                                {cat}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}
                {success && <Text style={styles.successText}>{success}</Text>}

                <Pressable
                    style={[styles.saveBtn, saving && styles.btnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                </Pressable>
            </View>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Logout</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        backgroundColor: '#0b0b0b',
        gap: 16,
    },

    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b0b0b',
    },

    header: {
        marginTop: 20,
        marginBottom: 20,
    },

    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },

    email: {
        fontSize: 14,
        color: '#aaa',
        marginTop: 4,
    },

    card: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        padding: 16,
        backgroundColor: '#121212',
        gap: 12,
    },

    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },

    label: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    input: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        backgroundColor: '#0f0f0f',
        fontSize: 14,
    },

    styleRow: {
        flexDirection: 'row',
        gap: 8,
    },

    styleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        backgroundColor: '#0f0f0f',
        alignItems: 'center',
    },

    styleBtnActive: {
        borderColor: '#fff',
        backgroundColor: '#fff',
    },

    styleBtnText: {
        color: '#aaa',
        fontWeight: '600',
        fontSize: 13,
    },

    styleBtnTextActive: {
        color: '#000',
    },

    sliderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },

    sliderBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        alignItems: 'center',
        backgroundColor: '#0f0f0f',
    },

    sliderBtnActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },

    sliderBtnText: {
        color: '#aaa',
        fontWeight: '600',
        fontSize: 12,
    },

    sliderBtnTextActive: {
        color: '#000',
    },

    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    catBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        backgroundColor: '#0f0f0f',
    },

    catBtnActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },

    catBtnText: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
    },

    catBtnTextActive: {
        color: '#000',
    },

    errorText: {
        color: '#ff6b6b',
        fontSize: 12,
    },

    successText: {
        color: '#51cf66',
        fontSize: 12,
    },

    saveBtn: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },

    btnDisabled: {
        opacity: 0.6,
    },

    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },

    logoutBtn: {
        borderWidth: 1,
        borderColor: '#ff6b6b',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },

    logoutBtnText: {
        color: '#ff6b6b',
        fontWeight: '700',
        fontSize: 16,
    },
});
