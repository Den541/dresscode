import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchRecommendationHistory, RecommendationHistoryItem } from '../utils/ai';

function formatHistoryDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = todayStart.getTime() - dateStart.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    const time = date.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
    });

    if (diffDays === 0) {
        return `Сьогодні, ${time}`;
    }

    if (diffDays === 1) {
        return `Вчора, ${time}`;
    }

    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }

            const loadWithToken = async (tokenToUse: string) => {
                const payload = await fetchRecommendationHistory(tokenToUse, 30);
                setHistory(payload);
            };

            try {
                await loadWithToken(accessToken);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load history';
                const isUnauthorized = message.toLowerCase().includes('unauthorized');

                if (!isUnauthorized) {
                    throw err;
                }

                const nextAccessToken = await refreshAccessToken();
                if (!nextAccessToken) {
                    throw new Error('Session expired. Please login again.');
                }

                await loadWithToken(nextAccessToken);
            }
        } catch (err) {
            setHistory([]);
            setError(err instanceof Error ? err.message : 'Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [loadHistory]),
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Історія рекомендацій</Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {!error && history.length === 0 ? (
                <Text style={styles.hint}>Історія порожня. Згенеруй рекомендацію на екрані Recommendation.</Text>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => navigation.navigate('RecommendationHistoryDetails', { id: item.id })}
                        >
                            <Text style={styles.city}>{item.city}</Text>
                            <Text style={styles.date}>{formatHistoryDate(item.createdAt)}</Text>
                            <Text style={styles.ratingBadge}>
                                Рейтинг: {item.userRating ? `${item.userRating}/5` : 'без оцінки'}
                            </Text>
                            {item.hasComment ? <Text style={styles.commentBadge}>Є коментар</Text> : null}
                            {(item.summary.length > 0 ? item.summary : ['Короткий підсумок недоступний.']).map((line, index) => (
                                <Text key={`${item.id}-${index}`} style={styles.summary}>• {line}</Text>
                            ))}
                        </Pressable>
                    )}
                />
            )}

            <Pressable style={styles.secondaryBtn} onPress={loadHistory}>
                <Text style={styles.secondaryBtnText}>Оновити історію</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b0b0b', padding: 16, gap: 12 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b0b0b',
    },
    title: { fontSize: 24, fontWeight: '700', color: '#fff' },
    errorText: { color: '#ff6b6b', fontSize: 12 },
    hint: { color: '#bbb', lineHeight: 20 },
    list: { gap: 10, paddingBottom: 12 },
    card: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        padding: 12,
        backgroundColor: '#121212',
        gap: 4,
    },
    city: { color: '#fff', fontSize: 16, fontWeight: '700' },
    date: { color: '#9bd1ff', fontSize: 12, marginBottom: 4 },
    ratingBadge: { color: '#ffd37c', fontSize: 12, marginBottom: 2 },
    commentBadge: { color: '#7ce2a6', fontSize: 12, marginBottom: 2 },
    summary: { color: '#bbb', lineHeight: 18 },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryBtnText: { color: '#fff', fontWeight: '700' },
});
