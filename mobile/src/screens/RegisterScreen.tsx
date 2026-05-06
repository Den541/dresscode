import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
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

export default function RegisterScreen({ navigation }: Props) {
    const [name, setName]                     = useState('');
    const [email, setEmail]                   = useState('');
    const [password, setPassword]             = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const { register, loading, error: authError } = useAuth();
    const [localError, setLocalError] = useState('');

    const clearError = () => setLocalError('');

    const handleRegister = async () => {
        setLocalError('');
        if (!email.trim() || !password.trim()) { setLocalError('Email та пароль обовʼязкові'); return; }
        if (!email.includes('@')) { setLocalError('Введи коректний email'); return; }
        if (password.length < 8) { setLocalError('Пароль — мінімум 8 символів'); return; }
        if (password !== passwordConfirm) { setLocalError('Паролі не збігаються'); return; }
        try {
            await register(email.toLowerCase(), password, name || undefined);
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Помилка реєстрації');
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
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Brand ── */}
                    <View style={styles.brand}>
                        <Text style={styles.brandEyebrow}>ТВІЙ ПЕРСОНАЛЬНИЙ СТИЛІСТ</Text>
                        <Text style={styles.brandName}>DressCode</Text>
                        <Text style={styles.brandTagline}>Створи свій акаунт</Text>
                    </View>

                    {/* ── Form card ── */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Реєстрація</Text>
                        <View style={styles.cardDivider} />

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>ІМʼЯ <Text style={styles.optional}>(необовʼязково)</Text></Text>
                            <TextInput
                                value={name}
                                onChangeText={t => { setName(t); clearError(); }}
                                placeholder="Іван Петренко"
                                placeholderTextColor={MUTED}
                                style={styles.input}
                                autoCapitalize="words"
                                returnKeyType="next"
                                keyboardAppearance="dark"
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>EMAIL</Text>
                            <TextInput
                                value={email}
                                onChangeText={t => { setEmail(t); clearError(); }}
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
                                onChangeText={t => { setPassword(t); clearError(); }}
                                placeholder="Мінімум 8 символів"
                                placeholderTextColor={MUTED}
                                style={styles.input}
                                secureTextEntry
                                returnKeyType="next"
                                autoComplete="password-new"
                                textContentType="newPassword"
                                autoCorrect={false}
                                spellCheck={false}
                                keyboardAppearance="dark"
                                editable={!loading}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>ПІДТВЕРДЖЕННЯ ПАРОЛЯ</Text>
                            <TextInput
                                value={passwordConfirm}
                                onChangeText={t => { setPasswordConfirm(t); clearError(); }}
                                placeholder="••••••••"
                                placeholderTextColor={MUTED}
                                style={[
                                    styles.input,
                                    passwordConfirm.length > 0 && password !== passwordConfirm && styles.inputError,
                                ]}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                                autoComplete="password-new"
                                textContentType="newPassword"
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
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#000" size="small" />
                                : <Text style={styles.primaryBtnText}>Створити акаунт</Text>
                            }
                        </Pressable>
                    </View>

                    {/* ── Footer ── */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Вже є акаунт? </Text>
                        <Pressable onPress={() => navigation.navigate('Login')} disabled={loading}>
                            <Text style={styles.footerLink}>Увійти</Text>
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
    container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32, gap: 28 },

    // ── Brand ──
    brand: { alignItems: 'center', gap: 6, paddingTop: 8 },
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
    optional: {
        color: '#333', fontSize: 10, fontWeight: '400', letterSpacing: 0,
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
    inputError: {
        borderColor: RED + '66',
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
