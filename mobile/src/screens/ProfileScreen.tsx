import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Pressable,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = '#C9961A';
const BG     = '#0D0D0D';
const CARD   = '#141414';
const BORDER = '#252525';
const WHITE  = '#FFFFFF';
const GRAY   = '#888888';
const MUTED  = '#444444';
const RED    = '#FF6B6B';
const GREEN  = '#51CF66';

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

const STYLE_OPTIONS = [
    { value: 'CASUAL' as const,  label: 'Кежуал', icon: '👕' },
    { value: 'FORMAL' as const,  label: 'Формальний', icon: '👔' },
    { value: 'SPORTY' as const,  label: 'Спортивний', icon: '⚡' },
];

const CAT_OPTIONS = [
    { value: 'Casual',     label: 'Кежуал',    icon: '🧢' },
    { value: 'Business',   label: 'Бізнес',    icon: '💼' },
    { value: 'Sportwear',  label: 'Спорт',     icon: '🏃' },
    { value: 'Streetwear', label: 'Стріт',     icon: '🛹' },
];

function getInitials(name?: string | null, email?: string): string {
    if (name?.trim()) {
        const parts = name.trim().split(' ').filter(Boolean);
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    }
    return (email?.[0] ?? '?').toUpperCase();
}

function getColdLabel(value: number): string {
    if (value >= 4)  return 'Дуже чутливий до холоду';
    if (value >= 2)  return 'Чутливий до холоду';
    if (value <= -4) return 'Добре переносиш холод';
    if (value <= -2) return 'Менш чутливий до холоду';
    return 'Нейтральна чутливість';
}

function getColdHint(value: number): string {
    if (value >= 4)  return 'AI порекомендує тепліші речі навіть у помірну погоду';
    if (value >= 2)  return 'AI додасть верхній шар навіть при прохолоді';
    if (value <= -4) return 'AI пропонуватиме легші варіанти для будь-якої погоди';
    if (value <= -2) return 'AI враховуватиме, що ти комфортніше одягаєшся';
    return 'AI підбирає стандартний баланс між теплом і легкістю';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: Props) {
    const { user, accessToken, logout } = useAuth();

    const [profile, setProfile]                   = useState<UserProfile | null>(null);
    const [name, setName]                         = useState('');
    const [style, setStyle]                       = useState<'CASUAL' | 'FORMAL' | 'SPORTY'>('CASUAL');
    const [coldSensitivity, setColdSensitivity]   = useState(0);
    const [favoriteCats, setFavoriteCats]         = useState<string[]>([]);
    const [loading, setLoading]                   = useState(true);
    const [saving, setSaving]                     = useState(false);
    const [error, setError]                       = useState('');
    const [success, setSuccess]                   = useState('');

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError('');
            if (!accessToken) { setError('Не авторизовано'); return; }

            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) throw new Error('Не вдалось завантажити профіль');

            const data = await res.json();
            setProfile(data);
            setName(data.name || '');
            setStyle(data.preferences.style);
            setColdSensitivity(data.preferences.coldSensitivity);
            setFavoriteCats(data.preferences.favoriteCats || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка завантаження');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSuccess('');
            setError('');
            if (!accessToken) { setError('Не авторизовано'); return; }

            const res = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    name: name || undefined,
                    style,
                    coldSensitivity,
                    favoriteCats,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data?.message || 'Не вдалось зберегти');
            }

            const updated = await res.json();
            setProfile(updated);
            setSuccess('Профіль збережено');
            setTimeout(() => setSuccess(''), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка збереження');
        } finally {
            setSaving(false);
        }
    };

    const toggleCat = (cat: string) =>
        setFavoriteCats(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );

    // ── Loading ──
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={GOLD} />
                    <Text style={styles.loadingText}>Завантаження профілю...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const displayName = name.trim() || user?.email?.split('@')[0] || 'Користувач';
    const coldFraction = (coldSensitivity + 5) / 10;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={BG} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ══ HERO ══════════════════════════════════════════════ */}
                <View style={styles.hero}>
                    <View style={styles.avatarWrap}>
                        <Text style={styles.avatarText}>
                            {getInitials(user?.name, user?.email)}
                        </Text>
                    </View>
                    <Text style={styles.heroName}>{displayName}</Text>
                    <Text style={styles.heroEmail}>{user?.email}</Text>
                </View>

                {/* ══ PERSONAL INFO ═════════════════════════════════════ */}
                <SectionCard label="ОСОБИСТІ ДАНІ">
                    <Text style={styles.fieldLabel}>Ім'я</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Введи своє ім'я..."
                        placeholderTextColor={MUTED}
                        style={styles.input}
                        autoCapitalize="words"
                        editable={!saving}
                    />
                </SectionCard>

                {/* ══ STYLE ═════════════════════════════════════════════ */}
                <SectionCard label="СТИЛЬ">
                    <View style={styles.styleRow}>
                        {STYLE_OPTIONS.map(opt => {
                            const active = style === opt.value;
                            return (
                                <Pressable
                                    key={opt.value}
                                    style={[styles.styleCard, active && styles.styleCardActive]}
                                    onPress={() => setStyle(opt.value)}
                                >
                                    <Text style={styles.styleIcon}>{opt.icon}</Text>
                                    <Text style={[styles.styleLabel, active && styles.styleLabelActive]}>
                                        {opt.label}
                                    </Text>
                                    {active && <View style={styles.styleDot} />}
                                </Pressable>
                            );
                        })}
                    </View>
                </SectionCard>

                {/* ══ COLD SENSITIVITY ══════════════════════════════════ */}
                <SectionCard label="ЧУТЛИВІСТЬ ДО ХОЛОДУ">
                    {/* Value badge */}
                    <View style={styles.coldHeader}>
                        <Text style={styles.coldLevelLabel}>{getColdLabel(coldSensitivity)}</Text>
                        <View style={styles.coldBadge}>
                            <Text style={styles.coldBadgeText}>
                                {coldSensitivity > 0 ? `+${coldSensitivity}` : coldSensitivity}
                            </Text>
                        </View>
                    </View>

                    {/* Custom track */}
                    <View style={styles.coldTrackWrap}>
                        <View style={styles.coldTrack}>
                            <View style={[styles.coldFill, { width: `${coldFraction * 100}%` as any }]} />
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={-5}
                            maximumValue={5}
                            step={1}
                            value={coldSensitivity}
                            onValueChange={setColdSensitivity}
                            minimumTrackTintColor="transparent"
                            maximumTrackTintColor="transparent"
                            thumbTintColor={GOLD}
                        />
                    </View>

                    {/* Tick labels */}
                    <View style={styles.tickRow}>
                        <Text style={styles.tickEdge}>Менш чутливий</Text>
                        <Text style={styles.tickEdge}>Більш чутливий</Text>
                    </View>

                    <View style={styles.coldHintBox}>
                        <Text style={styles.coldHintIcon}>🌡️</Text>
                        <Text style={styles.coldHint}>{getColdHint(coldSensitivity)}</Text>
                    </View>
                </SectionCard>

                {/* ══ FAVORITE CATEGORIES ═══════════════════════════════ */}
                <SectionCard label="УЛЮБЛЕНІ КАТЕГОРІЇ">
                    <View style={styles.catsGrid}>
                        {CAT_OPTIONS.map(cat => {
                            const active = favoriteCats.includes(cat.value);
                            return (
                                <Pressable
                                    key={cat.value}
                                    style={[styles.catChip, active && styles.catChipActive]}
                                    onPress={() => toggleCat(cat.value)}
                                >
                                    <Text style={styles.catChipIcon}>{cat.icon}</Text>
                                    <Text style={[styles.catChipLabel, active && styles.catChipLabelActive]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </SectionCard>

                {/* ══ STATUS MESSAGES ═══════════════════════════════════ */}
                {!!error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>⚠️  {error}</Text>
                    </View>
                )}
                {!!success && (
                    <View style={styles.successBanner}>
                        <Text style={styles.successText}>✓  {success}</Text>
                    </View>
                )}

                {/* ══ SAVE BUTTON ═══════════════════════════════════════ */}
                <Pressable
                    style={({ pressed }) => [
                        styles.saveBtn,
                        saving && { opacity: 0.6 },
                        pressed && !saving && { opacity: 0.85 },
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving
                        ? <ActivityIndicator color="#000" />
                        : <Text style={styles.saveBtnText}>Зберегти зміни</Text>
                    }
                </Pressable>

                {/* ══ LOGOUT ════════════════════════════════════════════ */}
                <Pressable
                    style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}
                    onPress={logout}
                >
                    <Text style={styles.logoutBtnText}>Вийти з акаунту</Text>
                </Pressable>

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* ══ BOTTOM TAB BAR ══════════════════════════════════════ */}
            <View style={styles.tabBar}>
                <TabItem icon="🌬️" label="ГОЛОВНА"  onPress={() => navigation.navigate('Home')} />
                <TabItem icon="👔"  label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
                <TabItem icon="✦"   label="СТИЛЬ"    onPress={() => navigation.navigate('Recommendation')} />
                <TabItem icon="🕐"  label="ЖУРНАЛ"   onPress={() => navigation.navigate('RecommendationHistory')} />
                <TabItem icon="👤"  label="ПРОФІЛЬ"  active />
            </View>
        </SafeAreaView>
    );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{label}</Text>
            <View style={styles.sectionDivider} />
            {children}
        </View>
    );
}

// ─── Tab item ─────────────────────────────────────────────────────────────────
function TabItem({ icon, label, active, onPress }: {
    icon: string; label: string; active?: boolean; onPress?: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.6 }]}
            onPress={onPress}
        >
            <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        </Pressable>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe:   { flex: 1, backgroundColor: BG },
    scroll: { flex: 1 },
    container: {
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 24,
        gap: 14,
    },
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14,
    },
    loadingText: { color: GRAY, fontSize: 14 },

    // ── HERO ──
    hero: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    avatarWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#1A1A1A',
        borderWidth: 2,
        borderColor: GOLD,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    avatarText: {
        color: GOLD,
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    heroName: {
        color: WHITE,
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    heroEmail: {
        color: GRAY,
        fontSize: 13,
    },

    // ── SECTION CARD ──
    sectionCard: {
        backgroundColor: CARD,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 18,
        gap: 14,
    },
    sectionLabel: {
        color: GOLD,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.8,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: BORDER,
        marginTop: -6,
    },

    // ── INPUT ──
    fieldLabel: {
        color: MUTED,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
        marginBottom: -6,
    },
    input: {
        backgroundColor: '#0F0F0F',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: WHITE,
        fontSize: 15,
        fontWeight: '500',
    },

    // ── STYLE ──
    styleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    styleCard: {
        flex: 1,
        backgroundColor: '#0F0F0F',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: 'center',
        paddingVertical: 16,
        gap: 6,
    },
    styleCardActive: {
        borderColor: GOLD,
        backgroundColor: GOLD + '18',
    },
    styleIcon: {
        fontSize: 24,
        lineHeight: 28,
    },
    styleLabel: {
        color: GRAY,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    styleLabelActive: {
        color: GOLD,
    },
    styleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: GOLD,
        marginTop: 2,
    },

    // ── COLD SENSITIVITY ──
    coldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coldLevelLabel: {
        color: WHITE,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    coldBadge: {
        backgroundColor: GOLD + '22',
        borderWidth: 1,
        borderColor: GOLD + '55',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    coldBadgeText: {
        color: GOLD,
        fontSize: 13,
        fontWeight: '700',
    },
    coldTrackWrap: {
        position: 'relative',
        justifyContent: 'center',
        height: 44,
    },
    coldTrack: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: BORDER,
        borderRadius: 2,
        overflow: 'hidden',
    },
    coldFill: {
        height: '100%',
        backgroundColor: GOLD,
        borderRadius: 2,
    },
    slider: {
        width: '100%',
        height: 44,
    },
    tickRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -8,
    },
    tickEdge: {
        color: MUTED,
        fontSize: 10,
        fontWeight: '500',
    },
    coldHintBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#0F0F0F',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 12,
        gap: 10,
    },
    coldHintIcon: { fontSize: 16, lineHeight: 20 },
    coldHint: {
        color: GRAY,
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },

    // ── CATEGORIES ──
    catsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: '#0F0F0F',
    },
    catChipActive: {
        borderColor: GOLD,
        backgroundColor: GOLD + '18',
    },
    catChipIcon: { fontSize: 14 },
    catChipLabel: {
        color: GRAY,
        fontSize: 13,
        fontWeight: '600',
    },
    catChipLabelActive: {
        color: GOLD,
    },

    // ── STATUS ──
    errorBanner: {
        backgroundColor: RED + '14',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: RED + '33',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    errorText: { color: RED, fontSize: 13 },
    successBanner: {
        backgroundColor: GREEN + '14',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GREEN + '33',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    successText: { color: GREEN, fontSize: 13, fontWeight: '600' },

    // ── BUTTONS ──
    saveBtn: {
        backgroundColor: GOLD,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: -0.2,
    },
    logoutBtn: {
        borderWidth: 1,
        borderColor: RED + '55',
        backgroundColor: RED + '10',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    logoutBtnText: {
        color: RED,
        fontWeight: '700',
        fontSize: 14,
    },

    // ── BOTTOM TAB BAR ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#0F0F0F',
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'android' ? 12 : 6,
        paddingHorizontal: 6,
    },
    tabItem:      { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
    tabIcon:      { fontSize: 20, opacity: 0.4 },
    tabIconActive:{ opacity: 1 },
    tabLabel:     { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
    tabLabelActive: { color: GOLD },
});
