import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    FlatList,
    Image,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
    fetchRecommendationHistory,
    deleteRecommendation,
    clearRecommendationHistory,
    RecommendationHistoryItem,
} from '../utils/ai';

const GOLD = '#C9961A';
const BG = '#0D0D0D';
const CARD = '#141414';
const BORDER = '#252525';
const MUTED = '#444444';
const GRAY = '#888888';
const RED = '#FF6B6B';

function formatHistoryDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / 86400000);

    const time = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `Сьогодні, ${time}`;
    if (diffDays === 1) return `Вчора, ${time}`;
    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function StarRating({ rating }: { rating: number | null }) {
    if (!rating) return null;
    const stars = Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('');
    return <Text style={styles.stars}>{stars}</Text>;
}

function HistoryCard({
    item,
    onPress,
    onDelete,
}: {
    item: RecommendationHistoryItem;
    onPress: () => void;
    onDelete: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={onPress}
            onLongPress={onDelete}
            delayLongPress={400}
        >
            {item.outfitImageUrl ? (
                <Image source={{ uri: item.outfitImageUrl }} style={styles.outfitThumb} resizeMode="cover" />
            ) : (
                <View style={styles.outfitThumbPlaceholder}>
                    <Text style={styles.placeholderIcon}>✦</Text>
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                    <Text style={styles.city} numberOfLines={1}>{item.city}</Text>
                    <StarRating rating={item.userRating} />
                </View>
                <Text style={styles.date}>{formatHistoryDate(item.createdAt)}</Text>
                {item.summary.length > 0 && (
                    <View style={styles.summaryList}>
                        {item.summary.map((line, i) => (
                            <Text key={i} style={styles.summaryLine} numberOfLines={1}>· {line}</Text>
                        ))}
                    </View>
                )}
                <View style={styles.badgeRow}>
                    {item.hasComment && (
                        <View style={styles.commentBadge}>
                            <Text style={styles.commentBadgeText}>Є коментар</Text>
                        </View>
                    )}
                    <Text style={styles.arrowHint}>Деталі →</Text>
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                onPress={onDelete}
                hitSlop={8}
            >
                <Text style={styles.deleteBtnIcon}>✕</Text>
            </Pressable>
        </Pressable>
    );
}

export default function RecommendationHistoryScreen({ navigation }: any) {
    const { accessToken, refreshAccessToken } = useAuth();

    const [history, setHistory] = useState<RecommendationHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            if (!accessToken) { setError('Not authenticated'); return; }

            const load = async (token: string) => {
                const payload = await fetchRecommendationHistory(token, 30);
                setHistory(payload);
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
            setHistory([]);
            setError(err instanceof Error ? err.message : 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

    const handleDelete = useCallback((item: RecommendationHistoryItem) => {
        Alert.alert(
            'Видалити запис?',
            `Образ з ${item.city} буде видалено назавжди.`,
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Видалити',
                    style: 'destructive',
                    onPress: async () => {
                        if (!accessToken) return;
                        try {
                            await deleteRecommendation(accessToken, item.id);
                            setHistory(prev => prev.filter(h => h.id !== item.id));
                        } catch (err) {
                            Alert.alert('Помилка', err instanceof Error ? err.message : 'Не вдалося видалити');
                        }
                    },
                },
            ],
        );
    }, [accessToken]);

    const handleClearAll = useCallback(() => {
        if (history.length === 0) return;
        Alert.alert(
            'Очистити журнал?',
            'Всі записи будуть видалені назавжди. Цю дію не можна скасувати.',
            [
                { text: 'Скасувати', style: 'cancel' },
                {
                    text: 'Очистити всі',
                    style: 'destructive',
                    onPress: async () => {
                        if (!accessToken) return;
                        try {
                            await clearRecommendationHistory(accessToken);
                            setHistory([]);
                        } catch (err) {
                            Alert.alert('Помилка', err instanceof Error ? err.message : 'Не вдалося очистити');
                        }
                    },
                },
            ],
        );
    }, [accessToken, history.length]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>ЖУРНАЛ</Text>
                        <Text style={styles.headerTitle}>Історія образів</Text>
                    </View>
                    {history.length > 0 && (
                        <Pressable
                            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
                            onPress={handleClearAll}
                        >
                            <Text style={styles.clearBtnText}>Очистити</Text>
                        </Pressable>
                    )}
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={GOLD} />
                        <Text style={styles.loadingText}>Завантаження...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable style={styles.retryBtn} onPress={loadHistory}>
                            <Text style={styles.retryBtnText}>Спробувати ще раз</Text>
                        </Pressable>
                    </View>
                ) : history.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={styles.emptyIcon}>✦</Text>
                        <Text style={styles.emptyTitle}>Журнал порожній</Text>
                        <Text style={styles.emptyHint}>Згенеруй свій перший образ на екрані рекомендацій</Text>
                    </View>
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <HistoryCard
                                item={item}
                                onPress={() => navigation.navigate('RecommendationHistoryDetails', { id: item.id })}
                                onDelete={() => handleDelete(item)}
                            />
                        )}
                    />
                )}

                {!loading && !error && (
                    <Pressable style={styles.refreshBtn} onPress={loadHistory}>
                        <Text style={styles.refreshBtnText}>Оновити</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.tabBar}>
                <TabItem iconName="home-outline"    label="ГОЛОВНА"  onPress={() => navigation.navigate('Home')} />
                <TabItem iconName="shirt-outline"   label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
                <TabItem iconName="diamond-outline" label="СТИЛЬ"    onPress={() => navigation.navigate('Recommendation')} />
                <TabItem iconName="time"            label="ЖУРНАЛ"   active />
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
    container: { flex: 1, backgroundColor: BG },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        color: GOLD,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    clearBtn: {
        borderWidth: 1,
        borderColor: RED + '55',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 2,
    },
    clearBtnText: { color: RED, fontSize: 12, fontWeight: '600' },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    loadingText: { color: GRAY, fontSize: 13 },
    errorText: { color: RED, fontSize: 14, textAlign: 'center' },
    retryBtn: {
        borderWidth: 1,
        borderColor: GOLD,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: { color: GOLD, fontWeight: '700', fontSize: 14 },
    emptyIcon: { fontSize: 32, color: GOLD },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    emptyHint: { fontSize: 13, color: GRAY, textAlign: 'center', lineHeight: 20 },
    list: { padding: 16, gap: 12 },
    card: {
        flexDirection: 'row',
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardPressed: { opacity: 0.75 },
    outfitThumb: {
        width: 90,
        height: 110,
        backgroundColor: '#1a1a1a',
    },
    outfitThumbPlaceholder: {
        width: 90,
        height: 110,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderIcon: { fontSize: 22, color: GOLD, opacity: 0.4 },
    cardBody: {
        flex: 1,
        padding: 12,
        gap: 4,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 28,
    },
    city: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
    stars: { fontSize: 12, color: GOLD, letterSpacing: 1 },
    date: { fontSize: 11, color: GRAY },
    summaryList: { gap: 2 },
    summaryLine: { fontSize: 12, color: '#999', lineHeight: 17 },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    commentBadge: {
        backgroundColor: '#1a2a1a',
        borderWidth: 1,
        borderColor: '#2a4a2a',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    commentBadgeText: { fontSize: 10, color: '#6ecf8a', fontWeight: '600' },
    arrowHint: { fontSize: 11, color: GOLD, opacity: 0.7 },
    deleteBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtnIcon: { color: '#666', fontSize: 10, fontWeight: '700' },
    refreshBtn: {
        margin: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: BORDER,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
    },
    refreshBtnText: { color: MUTED, fontWeight: '600', fontSize: 14 },
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
