import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const GOLD   = '#C9961A';
const BG     = '#0D0D0D';
const CARD   = '#141414';
const BORDER = '#252525';
const WHITE  = '#FFFFFF';
const GRAY   = '#888888';
const MUTED  = '#444444';
const RED    = '#FF6B6B';

type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error: authError } = useAuth();
    const [localError, setLocalError] = useState('');

    const handleLogin = async () => {
        setLocalError('');
        if (!email.trim() || !password.trim()) { setLocalError('Email та пароль обовʼязкові'); return; }
        if (!email.includes('@')) { setLocalError('Введи коректний email'); return; }
        try {
            await login(email.toLowerCase(), password);
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Помилка входу');
        }
    };

    const displayError = localError || authError;

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Brand ── */}
                    <View style={styles.brand}>
                        <Text style={styles.brandEyebrow}>ТВІЙ ПЕРСОНАЛЬНИЙ СТИЛІСТ</Text>
                        <Text style={styles.brandName}>DressCode</Text>
                        <Text style={styles.brandTagline}>Стиль починається тут</Text>
                    </View>

                    {/* ── Form card ── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Вхід до акаунту</Text>
                        <View style={styles.cardDivider} />

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>EMAIL</Text>
                            <TextInput
                                value={email}
                                onChangeText={t => { setEmail(t); setLocalError(''); }}
                                placeholder="you@example.com"
                                placeholderTextColor={MUTED}
                                style={styles.input}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                returnKeyType="next"
                                autoComplete="email"
                                textContentType="emailAddress"
                                autoCorrect={false}
                                spellCheck={false}
                                keyboardAppearance="dark"
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>ПАРОЛЬ</Text>
                            <TextInput
                                value={password}
                                onChangeText={t => { setPassword(t); setLocalError(''); }}
                                placeholder="••••••••"
                                placeholderTextColor={MUTED}
                                style={styles.input}
                                secureTextEntry
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                                autoComplete="password"
                                textContentType="password"
                                autoCorrect={false}
                                spellCheck={false}
                                keyboardAppearance="dark"
                                editable={!loading}
                            />
                        </View>

                        {!!displayError && (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>⚠️  {displayError}</Text>
                            </View>
                        )}

                        <Pressable
                            style={({ pressed }) => [styles.primaryBtn, (loading || pressed) && styles.primaryBtnDim]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#000" size="small" />
                                : <Text style={styles.primaryBtnText}>Увійти</Text>
                            }
                        </Pressable>
                    </View>

                    {/* ── Footer ── */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Ще немає акаунту? </Text>
                        <Pressable onPress={() => navigation.navigate('Register')} disabled={loading}>
                            <Text style={styles.footerLink}>Зареєструватись</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: BG },
    flex:      { flex: 1 },
    container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32, gap: 32 },

    // ── Brand ──
    brand: { alignItems: 'center', gap: 6, paddingTop: 16 },
    brandEyebrow: {
        color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 3,
    },
    brandName: {
        color: GOLD, fontSize: 48, fontWeight: '700', letterSpacing: -1.5, lineHeight: 52,
    },
    brandTagline: {
        color: GRAY, fontSize: 14, letterSpacing: 0.3,
    },

    // ── Card ──
    card: {
        backgroundColor: CARD,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 24,
        gap: 16,
    },
    cardTitle: {
        color: WHITE, fontSize: 20, fontWeight: '700', letterSpacing: -0.3,
    },
    cardDivider: { height: 1, backgroundColor: BORDER },

    // ── Fields ──
    fieldGroup: { gap: 6 },
    label: {
        color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    },
    input: {
        backgroundColor: '#0A0A0A',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: WHITE,
        fontSize: 15,
    },

    // ── Error ──
    errorBanner: {
        backgroundColor: RED + '14',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: RED + '33',
        paddingVertical: 11,
        paddingHorizontal: 14,
    },
    errorText: { color: RED, fontSize: 13 },

    // ── Primary button ──
    primaryBtn: {
        backgroundColor: GOLD,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
        marginTop: 4,
    },
    primaryBtnDim: { opacity: 0.7 },
    primaryBtnText: { color: '#000', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },

    // ── Footer ──
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText: { color: GRAY, fontSize: 14 },
    footerLink: { color: GOLD, fontSize: 14, fontWeight: '700' },
});
