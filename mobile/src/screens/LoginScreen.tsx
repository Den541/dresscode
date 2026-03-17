import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error: authError } = useAuth();
    const [localError, setLocalError] = useState<string>('');

    const handleLogin = async () => {
        try {
            setLocalError('');

            if (!email.trim() || !password.trim()) {
                setLocalError('Email and password are required');
                return;
            }

            if (!email.includes('@')) {
                setLocalError('Please enter a valid email');
                return;
            }

            await login(email.toLowerCase(), password);
            // Navigation will happen automatically via nav guard
        } catch (err) {
            // Error is already set by useAuth, just ensure local error shows it
            const msg = err instanceof Error ? err.message : 'Login failed';
            setLocalError(msg);
        }
    };

    const displayError = localError || authError;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>DressCode</Text>
                <Text style={styles.subtitle}>Sign In</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#666"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#666"
                    style={styles.input}
                    secureTextEntry
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    autoCorrect={false}
                    spellCheck={false}
                    editable={!loading}
                />

                {displayError && (
                    <Text style={styles.errorText}>{displayError}</Text>
                )}

                <Pressable
                    style={[styles.loginBtn, loading && styles.btnDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.loginBtnText}>Sign In</Text>
                    )}
                </Pressable>

                <Pressable
                    style={styles.registerBtn}
                    onPress={() => navigation.navigate('Register')}
                    disabled={loading}
                >
                    <Text style={styles.registerBtnText}>Create account</Text>
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkText}>Sign Up</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#0b0b0b',
        justifyContent: 'space-between',
    },
    header: {
        marginTop: 40,
        marginBottom: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
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

    label: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
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

    errorText: {
        color: '#ff6b6b',
        fontSize: 12,
        marginTop: 4,
    },

    loginBtn: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },

    btnDisabled: {
        opacity: 0.6,
    },

    loginBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },

    registerBtn: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },

    registerBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },

    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },

    footerText: {
        color: '#aaa',
        fontSize: 14,
    },

    linkText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
