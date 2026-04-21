import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    FlatList,
    Image,
    Alert,
    ScrollView,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
    deleteWardrobeItem,
    fetchWardrobeItems,
    reanalyzeWardrobeItem,
    WardrobeItem,
    WardrobeCategory,
    WARDROBE_CATEGORY_LABELS,
} from '../utils/wardrobe';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = '#C9961A';
const BG = '#0D0D0D';
const CARD = '#141414';
const CARD2 = '#1A1A1A';
const BORDER = '#252525';
const WHITE = '#FFFFFF';
const GRAY = '#888888';
const MUTED = '#444444';
const RED = '#FF6B6B';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD = 18;
const GRID_GAP = 12;
const CARD_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP) / 2;

type Props = { navigation: any };
type FilterValue = 'ALL' | WardrobeCategory;

const FILTERS: Array<{ label: string; value: FilterValue }> = [
    { label: 'ВСЕ', value: 'ALL' },
    { label: 'ВЕРХ', value: 'TOPS' },
    { label: 'НИЗ', value: 'BOTTOMS' },
    { label: 'ВЕРХНІЙ ОДЯГ', value: 'OUTERWEAR' },
    { label: 'ВЗУТТЯ', value: 'SHOES' },
    { label: 'АКСЕСУАРИ', value: 'ACCESSORIES' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function WardrobeScreen({ navigation }: Props) {
    const { accessToken, refreshAccessToken } = useAuth();

    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterValue>('ALL');
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [analysisComment, setAnalysisComment] = useState('');
    const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

    // ── Load items ──
    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            if (!accessToken) { setError('Не авторизовано'); return; }
            try {
                setItems(await fetchWardrobeItems(accessToken));
            } catch (err) {
                const msg = err instanceof Error ? err.message : '';
                if (!msg.toLowerCase().includes('unauthorized')) throw err;
                const next = await refreshAccessToken();
                if (!next) { setError('Сесія закінчилась'); return; }
                setItems(await fetchWardrobeItems(next));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка завантаження');
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

    const visibleItems = useMemo(() =>
        selectedFilter === 'ALL' ? items : items.filter(i => i.category === selectedFilter),
        [items, selectedFilter],
    );

    // ── Delete ──
    const handleDelete = (item: WardrobeItem) => {
        Alert.alert('Видалити?', `Видалити "${item.name}"?`, [
            { text: 'Скасувати', style: 'cancel' },
            {
                text: 'Видалити', style: 'destructive',
                onPress: async () => {
                    if (!accessToken) return;
                    try {
                        setDeletingId(item.id);
                        try {
                            await deleteWardrobeItem(accessToken, item.id);
                        } catch (err) {
                            const msg = err instanceof Error ? err.message : '';
                            if (!msg.toLowerCase().includes('unauthorized')) throw err;
                            const next = await refreshAccessToken();
                            if (!next) { setError('Сесія закінчилась'); return; }
                            await deleteWardrobeItem(next, item.id);
                        }
                        setItems(prev => prev.filter(x => x.id !== item.id));
                        setSelectedItem(null);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Помилка видалення');
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    };

    // ── Reanalyze ──
    const handleReanalyze = async () => {
        if (!selectedItem || !accessToken) return;
        try {
            setReanalyzingId(selectedItem.id);
            const run = async (token: string) =>
                reanalyzeWardrobeItem(token, selectedItem.id, analysisComment);
            let updated: Awaited<ReturnType<typeof run>>;
            try {
                updated = await run(accessToken);
            } catch (err) {
                const msg = err instanceof Error ? err.message : '';
                if (!msg.toLowerCase().includes('unauthorized')) throw err;
                const next = await refreshAccessToken();
                if (!next) throw new Error('Сесія закінчилась');
                updated = await run(next);
            }
            const patch = (item: WardrobeItem) =>
                item.id === selectedItem.id
                    ? {
                        ...item, name: updated.name, category: updated.category,
                        aiAnalysis: updated.aiAnalysis ?? null,
                        aiAnalyzedAt: updated.aiAnalyzedAt ?? null
                    }
                    : item;
            setItems(prev => prev.map(patch));
            setSelectedItem(prev => prev ? patch(prev) : prev);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка оновлення');
        } finally {
            setReanalyzingId(null);
        }
    };

    // ── Loading / Error states ──
    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={GOLD} />
                    <Text style={styles.loadingText}>Завантаження гардеробу...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && items.length === 0) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={loadItems}>
                        <Text style={styles.retryBtnText}>Спробувати знову</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ── Header for FlatList ──
    const ListHeader = (
        <>
            {/* Page header */}
            <View style={styles.pageHeader}>
                <Text style={styles.pageTitle}>Підібраний Одяг</Text>
                <Pressable
                    style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => navigation.navigate('AddWardrobeItem')}
                >
                    <Text style={styles.addBtnText}>＋</Text>
                </Pressable>
            </View>

            {/* Filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
            >
                {FILTERS.map(f => (
                    <Pressable
                        key={f.value}
                        style={[styles.chip, selectedFilter === f.value && styles.chipActive]}
                        onPress={() => setSelectedFilter(f.value)}
                    >
                        <Text style={[styles.chipText, selectedFilter === f.value && styles.chipTextActive]}>
                            {f.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Divider */}
            <View style={styles.divider} />
        </>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={BG} />

            <FlatList
                data={visibleItems}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>👗</Text>
                        <Text style={styles.emptyTitle}>
                            {selectedFilter === 'ALL' ? 'Гардероб порожній' : 'Немає речей у цій категорії'}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            {selectedFilter === 'ALL'
                                ? 'Додай першу річ, щоб AI підбирав тобі образи'
                                : 'Спробуй іншу категорію або додай нову річ'}
                        </Text>
                        {selectedFilter === 'ALL' && (
                            <Pressable
                                style={styles.emptyAddBtn}
                                onPress={() => navigation.navigate('AddWardrobeItem')}
                            >
                                <Text style={styles.emptyAddBtnText}>Додати річ</Text>
                            </Pressable>
                        )}
                    </View>
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Pressable
                        style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}
                        onPress={() => { setSelectedItem(item); setAnalysisComment(''); }}
                    >
                        <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
                        <View style={styles.gridInfo}>
                            <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.gridCategory}>
                                {WARDROBE_CATEGORY_LABELS[item.category] ?? item.category}
                            </Text>
                        </View>
                    </Pressable>
                )}
            />

            {/* ── Bottom Tab Bar ── */}
            <View style={styles.tabBar}>
                <TabItem icon="🌬️" label="ГОЛОВНА" onPress={() => navigation.navigate('Home')} />
                <TabItem icon="👔" label="ГАРДЕРОБ" active />
                <TabItem icon="✦" label="СТИЛЬ" onPress={() => navigation.navigate('Recommendation')} />
                <TabItem icon="🕐" label="ЖУРНАЛ" onPress={() => navigation.navigate('RecommendationHistory')} />
                <TabItem icon="👤" label="ПРОФІЛЬ" onPress={() => navigation.navigate('Profile')} />
            </View>

            {/* ── Item Detail Modal ── */}
            <Modal
                visible={Boolean(selectedItem)}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedItem(null)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)} />
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.modalWrap}
                        >
                            <View style={styles.modalSheet}>
                                {/* Handle */}
                                <View style={styles.modalHandle} />

                                {selectedItem && (
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                        contentContainerStyle={styles.modalContent}
                                    >
                                        {/* Image */}
                                        <Image
                                            source={{ uri: selectedItem.imageUrl }}
                                            style={styles.modalImage}
                                        />

                                        {/* Header */}
                                        <View style={styles.modalHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.modalTitle} numberOfLines={2}>
                                                    {selectedItem.name}
                                                </Text>
                                                <Text style={styles.modalCategory}>
                                                    {WARDROBE_CATEGORY_LABELS[selectedItem.category] ?? selectedItem.category}
                                                </Text>
                                            </View>
                                            <Pressable
                                                style={({ pressed }) => [styles.deleteIconBtn, pressed && { opacity: 0.7 }]}
                                                onPress={() => handleDelete(selectedItem)}
                                                disabled={deletingId === selectedItem.id}
                                            >
                                                <Text style={styles.deleteIconText}>🗑️</Text>
                                            </Pressable>
                                        </View>

                                        {/* AI Tags */}
                                        {selectedItem.aiAnalysis && (
                                            <View style={styles.aiSection}>
                                                <Text style={styles.aiSectionTitle}>AI АНАЛІЗ</Text>

                                                {selectedItem.aiAnalysis.summary ? (
                                                    <Text style={styles.aiSummary}>
                                                        {selectedItem.aiAnalysis.summary}
                                                    </Text>
                                                ) : null}

                                                {/* Warmth bar */}
                                                {typeof selectedItem.aiAnalysis.warmthLevel === 'number' && (
                                                    <View style={styles.warmthRow}>
                                                        <Text style={styles.warmthLabel}>Теплота</Text>
                                                        <View style={styles.warmthTrack}>
                                                            <View
                                                                style={[
                                                                    styles.warmthFill,
                                                                    { width: `${selectedItem.aiAnalysis.warmthLevel * 10}%` as any },
                                                                ]}
                                                            />
                                                        </View>
                                                        <Text style={styles.warmthValue}>
                                                            {selectedItem.aiAnalysis.warmthLevel}/10
                                                        </Text>
                                                    </View>
                                                )}

                                                {/* Tags rows */}
                                                {selectedItem.aiAnalysis.styleTags?.length ? (
                                                    <TagRow label="Стиль" tags={selectedItem.aiAnalysis.styleTags} color="#9BD1FF" />
                                                ) : null}
                                                {selectedItem.aiAnalysis.seasonTags?.length ? (
                                                    <TagRow label="Сезон" tags={selectedItem.aiAnalysis.seasonTags} color="#51CF66" />
                                                ) : null}
                                                {selectedItem.aiAnalysis.colorTags?.length ? (
                                                    <TagRow label="Кольори" tags={selectedItem.aiAnalysis.colorTags} color={GOLD} />
                                                ) : null}
                                            </View>
                                        )}

                                        {/* Comment input */}
                                        <View style={styles.commentSection}>
                                            <Text style={styles.commentLabel}>КОМЕНТАР ДЛЯ AI</Text>
                                            <TextInput
                                                style={styles.commentInput}
                                                value={analysisComment}
                                                onChangeText={setAnalysisComment}
                                                placeholder="Наприклад: тонка кофта, носиться поверх футболки..."
                                                placeholderTextColor={MUTED}
                                                multiline
                                                editable={reanalyzingId !== selectedItem.id}
                                            />
                                            <Text style={styles.commentHint}>
                                                Уточни, якщо AI неточно визначив тип або характеристики
                                            </Text>
                                        </View>

                                        {/* Action buttons */}
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.reanalyzeBtn,
                                                reanalyzingId === selectedItem.id && { opacity: 0.5 },
                                                pressed && { opacity: 0.75 },
                                            ]}
                                            onPress={handleReanalyze}
                                            disabled={reanalyzingId === selectedItem.id}
                                        >
                                            {reanalyzingId === selectedItem.id
                                                ? <ActivityIndicator size="small" color={GOLD} />
                                                : <Text style={styles.reanalyzeBtnText}>✦  Оновити AI аналіз</Text>
                                            }
                                        </Pressable>

                                        <Pressable
                                            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
                                            onPress={() => setSelectedItem(null)}
                                        >
                                            <Text style={styles.closeBtnText}>Закрити</Text>
                                        </Pressable>
                                    </ScrollView>
                                )}
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
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

// ─── Tag row ──────────────────────────────────────────────────────────────────
function TagRow({ label, tags, color }: { label: string; tags: string[]; color: string }) {
    return (
        <View style={styles.tagRow}>
            <Text style={styles.tagRowLabel}>{label}</Text>
            <View style={styles.tagList}>
                {tags.map((t, i) => (
                    <View key={i} style={[styles.tag, { borderColor: color + '55', backgroundColor: color + '18' }]}>
                        <Text style={[styles.tagText, { color }]}>{t}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
    loadingText: { color: GRAY, fontSize: 14 },
    errorIcon: { fontSize: 40 },
    errorText: { color: RED, fontSize: 14, textAlign: 'center' },
    retryBtn: {
        backgroundColor: GOLD, borderRadius: 12,
        paddingHorizontal: 24, paddingVertical: 12,
    },
    retryBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

    // ── PAGE HEADER ──
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: GRID_PAD,
        paddingTop: Platform.OS === 'android' ? 20 : 10,
        marginBottom: 20,
    },
    pageTitle: {
        color: GOLD,
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.8,
    },
    addBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: GOLD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnText: { color: '#000', fontSize: 22, fontWeight: '700', lineHeight: 26 },

    // ── FILTERS ──
    filtersRow: {
        paddingHorizontal: GRID_PAD,
        gap: 8,
        paddingBottom: 4,
    },
    chip: {
        height: 38,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: CARD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipActive: {
        backgroundColor: GOLD,
        borderColor: GOLD,
    },
    chipText: {
        color: GRAY,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    chipTextActive: {
        color: '#000',
    },

    divider: {
        height: 1,
        backgroundColor: BORDER,
        marginHorizontal: GRID_PAD,
        marginTop: 16,
        marginBottom: 16,
    },

    // ── GRID ──
    listContent: {
        paddingHorizontal: GRID_PAD,
        paddingBottom: 24,
    },
    row: {
        gap: GRID_GAP,
        marginBottom: GRID_GAP,
    },
    gridCard: {
        width: CARD_W,
        backgroundColor: CARD,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER,
    },
    gridImage: {
        width: CARD_W,
        height: CARD_W,
        backgroundColor: CARD2,
    },
    gridInfo: {
        padding: 12,
        gap: 3,
    },
    gridName: {
        color: WHITE,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    gridCategory: {
        color: GOLD,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // ── EMPTY STATE ──
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 10,
    },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { color: WHITE, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    emptyDesc: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
    emptyAddBtn: {
        marginTop: 8,
        backgroundColor: GOLD,
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    emptyAddBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

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
    tabItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
    tabIcon: { fontSize: 20, opacity: 0.4 },
    tabIconActive: { opacity: 1 },
    tabLabel: { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
    tabLabelActive: { color: GOLD },

    // ── MODAL ──
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.72)',
    },
    modalWrap: {
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        borderTopWidth: 1,
        borderColor: BORDER,
        paddingTop: 12,
    },
    modalHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: BORDER,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    modalImage: {
        width: '100%',
        height: 260,
        borderRadius: 18,
        backgroundColor: CARD2,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    modalTitle: {
        color: WHITE,
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.4,
        lineHeight: 28,
    },
    modalCategory: {
        color: GOLD,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    deleteIconBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: RED + '18',
        borderWidth: 1,
        borderColor: RED + '44',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    deleteIconText: { fontSize: 18 },

    // ── AI SECTION ──
    aiSection: {
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 16,
        gap: 12,
    },
    aiSectionTitle: {
        color: GOLD,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    aiSummary: {
        color: GRAY,
        fontSize: 13,
        lineHeight: 18,
    },
    warmthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    warmthLabel: {
        color: GRAY,
        fontSize: 12,
        width: 54,
    },
    warmthTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: BORDER,
        overflow: 'hidden',
    },
    warmthFill: {
        height: '100%',
        borderRadius: 2,
        backgroundColor: GOLD,
    },
    warmthValue: {
        color: GRAY,
        fontSize: 11,
        width: 32,
        textAlign: 'right',
    },
    tagRow: { gap: 6 },
    tagRowLabel: { color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
    tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    tagText: { fontSize: 11, fontWeight: '600' },

    // ── COMMENT ──
    commentSection: { gap: 8 },
    commentLabel: {
        color: MUTED,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    commentInput: {
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        padding: 14,
        color: WHITE,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    commentHint: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 16,
    },

    // ── BUTTONS ──
    reanalyzeBtn: {
        borderWidth: 1,
        borderColor: GOLD + '66',
        backgroundColor: GOLD + '18',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    reanalyzeBtnText: {
        color: GOLD,
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.2,
    },
    closeBtn: {
        backgroundColor: WHITE,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
});
