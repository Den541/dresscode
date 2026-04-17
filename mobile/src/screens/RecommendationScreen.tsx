import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { WardrobeItem, fetchWardrobeItems, WARDROBE_CATEGORY_LABELS } from '../utils/wardrobe';
import { fetchAiRecommendation, AiRecommendationResponse } from '../utils/ai';

export default function RecommendationScreen({ route }: any) {
  const weather = route?.params?.weather;
  const { accessToken, refreshAccessToken } = useAuth();

  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendationResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [regenKey, setRegenKey] = useState(0);

  useEffect(() => {
    loadPreferences();
  }, [regenKey]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError('');

      if (!accessToken) {
        setError('Not authenticated');
        return;
      }

      const loadWithToken = async (tokenToUse: string) => {
        const loadedWardrobe = await fetchWardrobeItems(tokenToUse);
        setWardrobeItems(loadedWardrobe);

        setAiLoading(true);
        try {
          const aiResponse = await fetchAiRecommendation(tokenToUse, {
            temperature: weather?.temperature,
            feelsLike: weather?.feelsLike,
            windSpeed: weather?.windSpeed,
            precipitationMm: weather?.precipitationMm,
            description: weather?.description,
          });
          setAiRecommendation(aiResponse);
        } catch (aiErr) {
          setAiRecommendation(null);
        } finally {
          setAiLoading(false);
        }
      };

      try {
        await loadWithToken(accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load wardrobe';
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
      const msg = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(msg);
      setWardrobeItems([]);
      setAiRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const chosenWardrobeItems = useMemo(() => {
    if (!aiRecommendation) {
      return [] as WardrobeItem[];
    }

    const buckets = new Map<string, WardrobeItem[]>();
    wardrobeItems.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      const existing = buckets.get(key) ?? [];
      existing.push(item);
      buckets.set(key, existing);
    });

    return aiRecommendation.recommendation.chosenItems
      .map((name) => {
        const key = name.trim().toLowerCase();
        const bucket = buckets.get(key);
        if (!bucket || bucket.length === 0) {
          return null;
        }

        return bucket.shift() ?? null;
      })
      .filter((item): item is WardrobeItem => Boolean(item));
  }, [aiRecommendation, wardrobeItems]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Рекомендація</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI-рекомендація</Text>
          {aiLoading ? (
            <Text style={styles.reason}>AI аналізує гардероб...</Text>
          ) : aiRecommendation ? (
            <>
              <Text style={styles.aiSummary}>{aiRecommendation.recommendation.outfitSummary}</Text>
              <Text style={styles.aiMeta}>Гардероб: {aiRecommendation.wardrobeCount} речей</Text>
              <Text style={styles.aiMeta}>Погода: {aiRecommendation.recommendation.weatherFit}</Text>
              <Text style={styles.aiMeta}>Гардероб: {aiRecommendation.recommendation.wardrobeFit}</Text>
              <Text style={styles.sectionLabel}>Пояснення</Text>
              {(aiRecommendation.recommendation.reasoning.length > 0
                ? aiRecommendation.recommendation.reasoning
                : ['AI сформував коротку рекомендацію без додаткових пояснень.']
              ).map((item, index) => (
                <Text key={`${index}-${item}`} style={styles.reason}>• {item}</Text>
              ))}
            </>
          ) : (
            <Text style={styles.reason}>AI-рекомендація тимчасово недоступна.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Що вдягнути</Text>
          {chosenWardrobeItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
              {chosenWardrobeItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemMetaText}>{WARDROBE_CATEGORY_LABELS[item.category] ?? item.category}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.reason}>AI ще не вибрав речі або їх немає в гардеробі.</Text>
          )}
        </View>

        <Pressable style={styles.btn} onPress={() => setRegenKey((x) => x + 1)}>
          <Text style={styles.btnText}>Оновити рекомендацію</Text>
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
    backgroundColor: '#0b0b0b'
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },

  card: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#121212',
    gap: 8,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  item: { color: '#bbb', marginVertical: 2 },
  reason: { color: '#bbb', marginVertical: 2, lineHeight: 18 },
  aiSummary: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  aiMeta: { color: '#9bd1ff', fontSize: 12, lineHeight: 18 },
  sectionLabel: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 4 },

  errorText: { color: '#ff6b6b', fontSize: 12, marginBottom: 8 },
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

  btn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#000', fontWeight: '700' },
});