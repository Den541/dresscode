import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    ScrollView,
    Image,
    Platform,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
    AiRecommendationResponse,
    RecommendationFromWardrobeItem,
    RecommendationMissingItem,
    fetchRecommendationHistoryDetails,
    deleteRecommendation,
    saveRecommendationFeedback,
} from '../utils/ai';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = '#C9961A';
const BG     = '#0D0D0D';
const CARD   = '#141414';
const CARD2  = '#1A1A1A';
const BORDER = '#252525';
const WHITE  = '#FFFFFF';
const GRAY   = '#888888';
const MUTED  = '#444444';
const RED    = '#FF6B6B';
const GREEN  = '#51CF66';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 18;

// ─── Category config (mirrors RecommendationScreen) ──────────────────────────
const CATEGORY_ORDER = ['OUTERWEAR', 'TOPS', 'BOTTOMS', 'SHOES', 'ACCESSORIES'] as const;
const CATEGORY_LABELS: Record<string, string> = {
    OUTERWEAR:   'Верхній одяг',
    TOPS:        'Верх',
    BOTTOMS:     'Низ',
    SHOES:       'Взуття',
    ACCESSORIES: 'Аксесуари',
};
const CARD_HEIGHTS: Record<string, number> = {
    OUTERWEAR:   SCREEN_W * 0.65,
    TOPS:        SCREEN_W * 0.60,
    BOTTOMS:     SCREEN_W * 0.72,
    SHOES:       SCREEN_W * 0.48,
    ACCESSORIES: SCREEN_W * 0.48,
};

function starLabel(n: number): string {
    return ['😕', '😐', '🙂', '😊', '🤩'][n - 1] ?? '';
}

// ─── Flat Lay Board ───────────────────────────────────────────────────────────
function CollageBoard({ items, missing, onAddMissing }: {
    items: RecommendationFromWardrobeItem[];
    missing: RecommendationMissingItem[];
    onAddMissing: () => void;
}) {
    const byCategory = new Map(items.map(i => [i.category, i]));
    const missingByCategory = new Map(missing.map(m => [m.category, m]));

    return (
        <View style={styles.flatLayList}>
            {CATEGORY_ORDER.map(cat => {
                const item = byCategory.get(cat);
                const missingItem = missingByCategory.get(cat);
                const cardH = CARD_HEIGHTS[cat] ?? SCREEN_W * 0.55;

                if (item) {
                    return (
                        <View key={cat} style={[styles.flatLayCard, { height: cardH }]}>
                            <Image source={{ uri: item.imageUrl }} style={styles.flatLayImage} resizeMode="cover" />
                            <View style={styles.flatLayTag}>
                                <Text style={styles.flatLayTagCat}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                                <Text style={styles.flatLayTagName} numberOfLines={1}>{item.name}</Text>
                            </View>
                        </View>
                    );
                }

                if (missingItem) {
                    return (
                        <Pressable
                            key={cat}
                            style={({ pressed }) => [styles.flatLayEmpty, { height: cardH * 0.55 }, pressed && { opacity: 0.7 }]}
                            onPress={onAddMissing}
                        >
                            <View style={styles.flatLayEmptyPlus}>
                                <Text style={styles.flatLayEmptyPlusIcon}>+</Text>
                            </View>
                            <Text style={styles.flatLayEmptyLabel}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                            <Text style={styles.flatLayEmptySuggestion} numberOfLines={2}>
                                {missingItem.suggestion}
                            </Text>
                        </Pressable>
                    );
                }

                return null;
            })}
        </View>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RecommendationHistoryDetailsScreen({ route, navigation }: any) {
    const recommendationId = route?.params?.id as string;
    const { accessToken, refreshAccessToken } = useAuth();

    const [details, setDetails] = useState<AiRecommendationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [rating, setRating] = useState<number | null>(null);
    const [savingFeedback, setSavingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState('');

    const loadDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            if (!accessToken) { setError('Not authenticated'); return; }

            const load = async (token: string) => {
                const payload = await fetchRecommendationHistoryDetails(token, recommendationId);
                setDetails(payload);
                setRating(payload.userRating ?? null);
            };

            try {
                await load(accessToken);
            } catch (err) {
                const msg = err instanceof Error ? err.message : '';
                if (!msg.toLowerCase().includes('unauthorized')) throw err;
                const next = await refreshAccessToken();
                if (!next) throw new Error('Session expired. Please login again.');
                await load(next);
            }
        } catch (err) {
            setDetails(null);
            setError(err instanceof Error ? err.message : 'Failed to load recommendation details');
        } finally {
            setLoading(false);
        }
    }, [accessToken, recommendationId, refreshAccessToken]);

    useEffect(() => { loadDetails(); }, [loadDetails]);

    const onSaveRating = async (newRating: number | null) => {
        if (!details?.id || !accessToken) return;
        const comment = details.userComment ?? '';
        setSavingFeedback(true);
        setFeedbackStatus('');
        try {
            const result = await saveRecommendationFeedback(accessToken, details.id, comment, newRating ?? undefined);
            setDetails(prev => prev ? { ...prev, userRating: result.userRating } : prev);
            setRating(result.userRating ?? newRating);
            setFeedbackStatus('✓ Оцінку збережено');
        } catch {
            setFeedbackStatus('Помилка збереження оцінки');
        } finally {
            setSavingFeedback(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Видалити запис?',
            'Цей образ буде видалено з журналу назавжди.',
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Видалити',
                    style: 'destructive',
                    onPress: async () => {
                        if (!accessToken) return;
                        try {
                            await deleteRecommendation(accessToken, recommendationId);
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Помилка', err instanceof Error ? err.message : 'Не вдалося видалити');
                        }
                    },
                },
            ],
        );
    };

    const hasOutfit = (details?.fromWardrobe.length ?? 0) > 0;

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={GOLD} />
                    <Text style={styles.loadingText}>Завантаження...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ══ HEADER ══════════════════════════════════════════════ */}
                <View style={styles.header}>
                    <Pressable
                        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backBtnText}>← Назад</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.deleteHeaderBtn, pressed && { opacity: 0.6 }]}
                        onPress={handleDelete}
                    >
                        <Text style={styles.deleteHeaderBtnText}>Видалити</Text>
                    </Pressable>
                </View>

                <View style={styles.titleRow}>
                    <Text style={styles.eyebrow}>ДЕТАЛІ ОБРАЗУ</Text>
                    {details && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaChipCity}>{details.city}</Text>
                            <Text style={styles.metaChipDate}>
                                {new Date(details.createdAt).toLocaleDateString('uk-UA', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                })}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ══ ERROR ═══════════════════════════════════════════════ */}
                {!!error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>⚠️  {error}</Text>
                        <Pressable onPress={loadDetails}>
                            <Text style={styles.errorRetry}>Спробувати ще раз</Text>
                        </Pressable>
                    </View>
                )}

                {details && (
                    <>
                        {/* ══ OUTFIT BOARD ════════════════════════════════════ */}
                        <View style={styles.collageBoardCard}>
                            <View style={styles.boardHeader}>
                                <Text style={styles.boardLabel}>ПІДІБРАНИЙ ОБРАЗ</Text>
                                {hasOutfit && (
                                    <View style={styles.boardBadge}>
                                        <Text style={styles.boardBadgeText}>{details.fromWardrobe.length} речей</Text>
                                    </View>
                                )}
                            </View>

                            {details.outfitImageUrl ? (
                                <View>
                                    <View style={styles.generatedImageWrap}>
                                        <Image
                                            source={{ uri: details.outfitImageUrl }}
                                            style={styles.generatedImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.generatedBadge}>
                                            <Text style={styles.generatedBadgeText}>✦ Згенеровано AI</Text>
                                        </View>
                                    </View>

                                    {hasOutfit && (
                                        <>
                                            <View style={styles.flatLayDivider}>
                                                <View style={styles.flatLayDividerLine} />
                                                <Text style={styles.flatLayDividerLabel}>З ВАШОГО ГАРДЕРОБУ</Text>
                                                <View style={styles.flatLayDividerLine} />
                                            </View>
                                            <CollageBoard
                                                items={details.fromWardrobe}
                                                missing={details.missing}
                                                onAddMissing={() => navigation.navigate('Wardrobe')}
                                            />
                                        </>
                                    )}
                                </View>
                            ) : hasOutfit ? (
                                <CollageBoard
                                    items={details.fromWardrobe}
                                    missing={details.missing}
                                    onAddMissing={() => navigation.navigate('Wardrobe')}
                                />
                            ) : (
                                <View style={styles.boardEmpty}>
                                    <Text style={styles.boardEmptyEmoji}>👗</Text>
                                    <Text style={styles.boardEmptyTitle}>Гардероб був порожній</Text>
                                    <Text style={styles.boardEmptyDesc}>
                                        Цей образ було згенеровано без речей із гардеробу
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ══ AI TIPS ════════════════════════════════════════ */}
                        {details.recommended.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>ПОРАДИ AI</Text>
                                <View style={styles.cardDivider} />
                                {details.recommended.map((tip, i) => (
                                    <View key={i} style={styles.tipRow}>
                                        <View style={styles.tipDot} />
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* ══ MISSING ITEMS ═══════════════════════════════════ */}
                        {details.missing.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>ЧОГО БРАКУВАЛО</Text>
                                <View style={styles.cardDivider} />
                                {details.missing.map((item, i) => (
                                    <View key={i} style={styles.missingRow}>
                                        <View style={styles.missingIconBox}>
                                            <Text style={styles.missingIcon}>+</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.missingLabel}>{item.label}</Text>
                                            <Text style={styles.missingSuggestion}>{item.suggestion}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* ══ REASONS ═════════════════════════════════════════ */}
                        {details.reasons.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>ЧОМУ ЦЕЙ ОБРАЗ</Text>
                                <View style={styles.cardDivider} />
                                {details.reasons.map((line, i) => (
                                    <View key={i} style={styles.tipRow}>
                                        <View style={styles.tipDot} />
                                        <Text style={styles.tipText}>{line}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* ══ RATING CARD ═════════════════════════════════════ */}
                        <View style={styles.card}>
                            <Text style={styles.cardLabel}>ТВІЙ ВІДГУК</Text>
                            <View style={styles.cardDivider} />

                            <Text style={styles.fieldLabel}>Оцінка образу</Text>
                            <View style={styles.ratingRow}>
                                {[1, 2, 3, 4, 5].map(v => {
                                    const active = rating === v;
                                    return (
                                        <Pressable
                                            key={v}
                                            style={[styles.ratingBtn, active && styles.ratingBtnActive]}
                                            onPress={() => {
                                                const next = active ? null : v;
                                                setRating(next);
                                                onSaveRating(next);
                                            }}
                                            disabled={savingFeedback}
                                        >
                                            <Text style={styles.ratingEmoji}>{starLabel(v)}</Text>
                                            <Text style={[styles.ratingNum, active && styles.ratingNumActive]}>{v}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {savingFeedback && (
                                <ActivityIndicator size="small" color={GOLD} style={{ marginTop: 4 }} />
                            )}

                            {!!feedbackStatus && (
                                <View style={[
                                    styles.feedbackStatusBanner,
                                    feedbackStatus.startsWith('✓') && styles.feedbackStatusSuccess,
                                ]}>
                                    <Text style={[
                                        styles.feedbackStatusText,
                                        feedbackStatus.startsWith('✓') && styles.feedbackStatusTextSuccess,
                                    ]}>
                                        {feedbackStatus}
                                    </Text>
                                </View>
                            )}

                            {details.userComment ? (
                                <View style={styles.commentBox}>
                                    <Text style={styles.commentBoxLabel}>Коментар</Text>
                                    <Text style={styles.commentBoxText}>{details.userComment}</Text>
                                </View>
                            ) : null}
                        </View>
                    </>
                )}

                <View style={{ height: 8 }} />
            </ScrollView>

            {/* ══ BOTTOM TAB BAR ══════════════════════════════════════ */}
            <View style={styles.tabBar}>
                <TabItem iconName="home-outline"    label="ГОЛОВНА"  onPress={() => navigation.navigate('Home')} />
                <TabItem iconName="shirt-outline"   label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
                <TabItem iconName="diamond-outline" label="СТИЛЬ"    onPress={() => navigation.navigate('Recommendation')} />
                <TabItem iconName="time"            label="ЖУРНАЛ"   active onPress={() => navigation.navigate('RecommendationHistory')} />
                <TabItem iconName="person-outline"  label="ПРОФІЛЬ"  onPress={() => navigation.navigate('Profile')} />
            </View>
        </SafeAreaView>
    );
}

function TabItem({ iconName, label, active, onPress }: {
    iconName: string; label: string; active?: boolean; onPress?: () => void;
}) {
    return (
        <Pressable style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.6 }]} onPress={onPress}>
            <Ionicons name={iconName as any} size={22} color={active ? GOLD : '#555'} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    container: {
        paddingHorizontal: PAD,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 24,
        gap: 14,
    },
    center: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
    },
    loadingText: { color: GRAY, fontSize: 13 },

    // ── HEADER ──
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: { paddingVertical: 4 },
    backBtnText: { color: GOLD, fontSize: 14, fontWeight: '600' },
    deleteHeaderBtn: {
        borderWidth: 1,
        borderColor: RED + '55',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    deleteHeaderBtnText: { color: RED, fontSize: 12, fontWeight: '600' },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 4,
    },
    eyebrow: {
        color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8,
    },
    metaChip: {
        backgroundColor: CARD,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
        paddingVertical: 7,
        alignItems: 'flex-end',
    },
    metaChipCity: { color: WHITE, fontSize: 13, fontWeight: '700' },
    metaChipDate: { color: GRAY, fontSize: 11 },

    // ── ERROR ──
    errorBanner: {
        backgroundColor: RED + '14',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: RED + '33',
        padding: 14,
        gap: 8,
    },
    errorText: { color: RED, fontSize: 13 },
    errorRetry: { color: GOLD, fontSize: 13, fontWeight: '600' },

    // ══ COLLAGE BOARD ══
    collageBoardCard: {
        backgroundColor: CARD,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
    },
    boardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    boardLabel: { color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8 },
    boardBadge: {
        backgroundColor: GOLD + '22',
        borderWidth: 1,
        borderColor: GOLD + '44',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    boardBadgeText: { color: GOLD, fontSize: 11, fontWeight: '600' },
    boardEmpty: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 10,
    },
    boardEmptyEmoji: { fontSize: 48 },
    boardEmptyTitle: { color: WHITE, fontSize: 17, fontWeight: '700' },
    boardEmptyDesc: { color: GRAY, fontSize: 13, textAlign: 'center', lineHeight: 18 },

    // ── GENERATED IMAGE ──
    generatedImageWrap: {
        margin: 16,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    generatedImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: CARD2,
    },
    generatedBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.72)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: GOLD + '55',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    generatedBadgeText: { color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

    // ── FLAT LAY ──
    flatLayDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },
    flatLayDividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
    flatLayDividerLabel: { color: MUTED, fontSize: 9, fontWeight: '700', letterSpacing: 1.6 },
    flatLayList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 },
    flatLayCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: CARD2,
        borderWidth: 1,
        borderColor: BORDER,
    },
    flatLayImage: { width: '100%', height: '100%' },
    flatLayTag: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 2,
    },
    flatLayTagCat: { color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
    flatLayTagName: { color: WHITE, fontSize: 13, fontWeight: '600' },
    flatLayEmpty: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: GOLD + '44',
        borderStyle: 'dashed',
        backgroundColor: GOLD + '08',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 20,
    },
    flatLayEmptyPlus: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: GOLD + '22',
        borderWidth: 1, borderColor: GOLD + '66',
        alignItems: 'center', justifyContent: 'center',
    },
    flatLayEmptyPlusIcon: { color: GOLD, fontSize: 24, fontWeight: '300' },
    flatLayEmptyLabel: { color: WHITE, fontSize: 14, fontWeight: '600' },
    flatLayEmptySuggestion: { color: GRAY, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },

    // ── INFO CARDS ──
    card: {
        backgroundColor: CARD,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 18,
        gap: 12,
    },
    cardLabel: { color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8 },
    cardDivider: { height: 1, backgroundColor: BORDER, marginTop: -4 },

    // ── TIPS ──
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    tipDot: {
        width: 5, height: 5, borderRadius: 3,
        backgroundColor: GOLD, marginTop: 7, flexShrink: 0,
    },
    tipText: { color: GRAY, fontSize: 13, lineHeight: 20, flex: 1 },

    // ── MISSING ──
    missingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    missingIconBox: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: GOLD + '22',
        borderWidth: 1, borderColor: GOLD + '44',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
    },
    missingIcon: { color: GOLD, fontSize: 16, fontWeight: '700' },
    missingLabel: { color: WHITE, fontSize: 13, fontWeight: '600', marginBottom: 2 },
    missingSuggestion: { color: GRAY, fontSize: 12, lineHeight: 17 },

    // ── RATING ──
    fieldLabel: { color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    ratingRow: { flexDirection: 'row', gap: 8 },
    ratingBtn: {
        flex: 1, alignItems: 'center', paddingVertical: 10,
        borderRadius: 12, borderWidth: 1, borderColor: BORDER,
        backgroundColor: '#0F0F0F', gap: 2,
    },
    ratingBtnActive: { borderColor: GOLD, backgroundColor: GOLD + '18' },
    ratingEmoji: { fontSize: 18 },
    ratingNum: { color: MUTED, fontSize: 11, fontWeight: '700' },
    ratingNumActive: { color: GOLD },
    feedbackStatusBanner: {
        borderRadius: 10, borderWidth: 1,
        borderColor: RED + '33', backgroundColor: RED + '14',
        paddingVertical: 10, paddingHorizontal: 12,
    },
    feedbackStatusSuccess: { borderColor: GREEN + '44', backgroundColor: GREEN + '14' },
    feedbackStatusText: { color: RED, fontSize: 12 },
    feedbackStatusTextSuccess: { color: GREEN, fontSize: 12 },
    commentBox: {
        backgroundColor: '#0F0F0F',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
        gap: 6,
    },
    commentBoxLabel: { color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    commentBoxText: { color: GRAY, fontSize: 14, lineHeight: 20 },

    // ── TAB BAR ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#0F0F0F',
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'android' ? 12 : 6,
        paddingHorizontal: 6,
    },
    tabItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
    tabIcon: { fontSize: 20, opacity: 0.4 },
    tabIconActive: { opacity: 1 },
    tabLabel: { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
    tabLabelActive: { color: GOLD },
});
