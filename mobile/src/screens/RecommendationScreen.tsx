import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { WARDROBE_CATEGORY_LABELS } from '../utils/wardrobe';
import { fetchAiRecommendation, AiRecommendationResponse, saveRecommendationFeedback } from '../utils/ai';

export default function RecommendationScreen({ route, navigation }: any) {
  const weather = route?.params?.weather;
  const { accessToken, refreshAccessToken } = useAuth();

  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendationResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [regenKey, setRegenKey] = useState(0);
  const [comment, setComment] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    loadRecommendation();
  }, [regenKey]);

  const loadRecommendation = async () => {
    try {
      setLoading(true);
      setError('');

      if (!accessToken) {
        setError('Сесія неактивна. Увійди знову.');
        return;
      }

      const loadWithToken = async (tokenToUse: string) => {
        setAiLoading(true);
        try {
          const aiResponse = await fetchAiRecommendation(tokenToUse, {
            city: weather?.city,
            temperature: weather?.temperature,
            feelsLike: weather?.feelsLike,
            windSpeed: weather?.windSpeed,
            precipitationMm: weather?.precipitationMm,
            description: weather?.description,
          });
          setAiRecommendation(aiResponse);
          setComment(aiResponse.userComment ?? '');
          setRating(aiResponse.userRating ?? null);
          setCommentStatus('');
        } catch (aiErr) {
          const aiMessage = aiErr instanceof Error ? aiErr.message : 'Не вдалося завантажити рекомендацію';
          setError(aiMessage);
          setAiRecommendation(null);
        } finally {
          setAiLoading(false);
        }
      };

      try {
        await loadWithToken(accessToken);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load recommendation';
        if (!message.toLowerCase().includes('unauthorized')) {
          throw err;
        }

        const nextAccessToken = await refreshAccessToken();
        if (!nextAccessToken) {
          throw new Error('Сесія завершилась. Увійди повторно.');
        }

        await loadWithToken(nextAccessToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не вдалося завантажити рекомендацію';
      setError(msg);
      setAiRecommendation(null);
      setComment('');
      setCommentStatus('');
      setRating(null);
    } finally {
      setLoading(false);
    }
  };

  const onSaveComment = async () => {
    if (!aiRecommendation?.id) {
      setCommentStatus('Спочатку згенеруй рекомендацію.');
      return;
    }

    const tokenToUse = accessToken;
    if (!tokenToUse) {
      setCommentStatus('Сесія завершилась. Увійди повторно.');
      return;
    }

    const normalized = comment.trim();
    if (normalized.length < 2) {
      setCommentStatus('Коментар має містити мінімум 2 символи.');
      return;
    }

    if (normalized.length > 500) {
      setCommentStatus('Коментар занадто довгий (макс. 500 символів).');
      return;
    }

    setSavingComment(true);
    setCommentStatus('');

    try {
      const result = await saveRecommendationFeedback(tokenToUse, aiRecommendation.id, normalized, rating);

      setAiRecommendation((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          userComment: result.userComment ?? normalized,
          userRating: result.userRating,
        };
      });

      setComment(result.userComment ?? normalized);
      setRating(result.userRating ?? rating);
      setCommentStatus('Відгук збережено. Буде враховано у наступних рекомендаціях.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не вдалося зберегти відгук';
      setCommentStatus(msg);
    } finally {
      setSavingComment(false);
    }
  };

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

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI-рекомендація</Text>
          {aiLoading ? (
            <Text style={styles.reason}>Формуємо рекомендацію...</Text>
          ) : aiRecommendation ? (
            <>
              {(aiRecommendation.recommended.length > 0
                ? aiRecommendation.recommended
                : ['Рекомендація тимчасово недоступна.']
              ).map((item, index) => (
                <Text key={`${index}-${item}`} style={styles.reason}>• {item}</Text>
              ))}
            </>
          ) : (
            <Text style={styles.reason}>Рекомендація тимчасово недоступна.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>З гардеробу</Text>
          {aiRecommendation && aiRecommendation.fromWardrobe.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
              {aiRecommendation.fromWardrobe.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} /> : null}
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemMetaText}>{WARDROBE_CATEGORY_LABELS[item.category as keyof typeof WARDROBE_CATEGORY_LABELS] ?? item.category}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.reason}>Підходящих речей у гардеробі не знайдено.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Чого бракує</Text>
          {aiRecommendation && aiRecommendation.missing.length > 0 ? (
            aiRecommendation.missing.map((item, index) => (
              <Text key={`${item.category}-${index}`} style={styles.reason}>• {item.label}: {item.suggestion}</Text>
            ))
          ) : (
            <Text style={styles.reason}>Базовий набір уже є у гардеробі.</Text>
          )}
        </View>

        <Pressable style={styles.btn} onPress={() => setRegenKey((x) => x + 1)}>
          <Text style={styles.btnText}>Оновити рекомендацію</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Твій коментар до рекомендації</Text>
          <Text style={styles.sectionLabel}>Оцінка рекомендації</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = rating === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.ratingChip, active ? styles.ratingChipActive : undefined]}
                  onPress={() => setRating(active ? null : value)}
                >
                  <Text style={[styles.ratingChipText, active ? styles.ratingChipTextActive : undefined]}>{value}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Наприклад: було холодно / занадто тепло / ок"
            placeholderTextColor="#777"
            style={styles.commentInput}
            multiline
            maxLength={500}
          />

          {!!commentStatus && <Text style={styles.commentStatus}>{commentStatus}</Text>}

          <Pressable style={[styles.secondaryBtn, savingComment && styles.secondaryBtnDisabled]} onPress={onSaveComment} disabled={savingComment}>
            <Text style={styles.secondaryBtnText}>{savingComment ? 'Збереження...' : 'Зберегти відгук'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('RecommendationHistory')}>
          <Text style={styles.secondaryBtnText}>Історія рекомендацій</Text>
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
  card: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#121212',
    gap: 8,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reason: { color: '#bbb', marginVertical: 2, lineHeight: 18 },
  sectionLabel: { color: '#bbb', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ff6b6b', fontSize: 13 },
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
  btnText: { color: '#000', fontWeight: '700', fontSize: 18 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  secondaryBtnDisabled: {
    opacity: 0.6,
  },
  secondaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  ratingRow: { flexDirection: 'row', gap: 10, marginTop: 2, marginBottom: 4 },
  ratingChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101010',
  },
  ratingChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  ratingChipText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  ratingChipTextActive: {
    color: '#000',
  },
  commentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    textAlignVertical: 'top',
    fontSize: 16,
    backgroundColor: '#0f0f0f',
  },
  commentStatus: {
    color: '#9bd1ff',
    fontSize: 12,
  },
});
