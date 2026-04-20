import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AiRecommendationResponse, fetchRecommendationHistoryDetails } from '../utils/ai';
import { WARDROBE_CATEGORY_LABELS } from '../utils/wardrobe';

export default function RecommendationHistoryDetailsScreen({ route }: any) {
    const recommendationId = route?.params?.id as string;
    const { accessToken, refreshAccessToken } = useAuth();

    const [details, setDetails] = useState<AiRecommendationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }

            const loadWithToken = async (tokenToUse: string) => {
                const payload = await fetchRecommendationHistoryDetails(tokenToUse, recommendationId);
                setDetails(payload);
            };

            try {
                await loadWithToken(accessToken);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load recommendation details';
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
            setDetails(null);
            setError(err instanceof Error ? err.message : 'Failed to load recommendation details');
        } finally {
            setLoading(false);
        }
    }, [accessToken, recommendationId, refreshAccessToken]);

    useEffect(() => {
        loadDetails();
    }, [loadDetails]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Деталі рекомендації</Text>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                {details ? (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Загальна інформація</Text>
                            <Text style={styles.meta}>Місто: {details.city}</Text>
                            <Text style={styles.meta}>Дата: {new Date(details.createdAt).toLocaleString()}</Text>
                            <Text style={styles.meta}>
                                Рейтинг: {details.userRating ? `${details.userRating}/5` : 'не вказано'}
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Що рекомендовано</Text>
                            {(details.recommended.length > 0 ? details.recommended : ['Рекомендовані пункти відсутні.']).map((line, index) => (
                                <Text key={`recommended-${index}`} style={styles.textLine}>• {line}</Text>
                            ))}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>З гардеробу</Text>
                            {details.fromWardrobe.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
                                    {details.fromWardrobe.map((item) => (
                                        <View key={item.id} style={styles.itemCard}>
                                            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.itemMetaText}>
                                                {WARDROBE_CATEGORY_LABELS[item.category as keyof typeof WARDROBE_CATEGORY_LABELS] ?? item.category}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text style={styles.textLine}>Позицій із гардеробу не знайдено.</Text>
                            )}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Чого бракує</Text>
                            {(details.missing.length > 0
                                ? details.missing
                                : [{ category: 'N/A', label: 'Все ок', suggestion: 'Критичних прогалин не знайдено.' }]
                            ).map((item, index) => (
                                <View key={`missing-${index}`} style={styles.missingRow}>
                                    <Text style={styles.missingLabel}>• {item.label}</Text>
                                    <Text style={styles.textLine}>{item.suggestion}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Пояснення</Text>
                            {(details.reasons.length > 0 ? details.reasons : ['Пояснення відсутні.']).map((line, index) => (
                                <Text key={`reason-${index}`} style={styles.textLine}>• {line}</Text>
                            ))}
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Твій коментар</Text>
                            <Text style={styles.textLine}>
                                {details.userComment && details.userComment.trim()
                                    ? details.userComment
                                    : 'Коментар поки не додано.'}
                            </Text>
                        </View>
                    </>
                ) : (
                    !error && <Text style={styles.textLine}>Немає даних для відображення.</Text>
                )}

                <Pressable style={styles.secondaryBtn} onPress={loadDetails}>
                    <Text style={styles.secondaryBtnText}>Оновити деталі</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b0b0b' },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b0b0b',
    },
    title: { fontSize: 24, fontWeight: '700', color: '#fff' },
    errorText: { color: '#ff6b6b', fontSize: 12 },
    card: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        padding: 14,
        backgroundColor: '#121212',
        gap: 8,
    },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    meta: { color: '#9bd1ff', lineHeight: 18 },
    textLine: { color: '#bbb', lineHeight: 18 },
    missingRow: { gap: 4 },
    missingLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
    itemRow: { gap: 10, paddingVertical: 4 },
    itemCard: {
        width: 128,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        backgroundColor: '#0f0f0f',
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#1c1c1c',
    },
    itemName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    itemMetaText: {
        color: '#9bd1ff',
        fontSize: 11,
        paddingHorizontal: 10,
        paddingTop: 2,
        paddingBottom: 10,
    },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryBtnText: { color: '#fff', fontWeight: '700' },
});
