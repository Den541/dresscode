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
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  fetchAiRecommendation,
  AiRecommendationResponse,
  RecommendationFromWardrobeItem,
  RecommendationMissingItem,
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


// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeatherEmoji(description = ''): string {
  const d = description.toLowerCase();
  if (d.includes('thunder'))                         return '⛈️';
  if (d.includes('snow'))                            return '❄️';
  if (d.includes('rain') || d.includes('drizzle'))  return '🌧️';
  if (d.includes('fog') || d.includes('mist'))      return '🌫️';
  if (d.includes('overcast'))                       return '☁️';
  if (d.includes('cloud'))                          return '⛅';
  return '☀️';
}

function starLabel(n: number): string {
  return ['😕', '😐', '🙂', '😊', '🤩'][n - 1] ?? '';
}

// ─── Category display config ──────────────────────────────────────────────────
const CATEGORY_ORDER = ['OUTERWEAR', 'TOPS', 'BOTTOMS', 'SHOES', 'ACCESSORIES'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  OUTERWEAR:   'Верхній одяг',
  TOPS:        'Верх',
  BOTTOMS:     'Низ',
  SHOES:       'Взуття',
  ACCESSORIES: 'Аксесуари',
};
const CATEGORY_ICONS: Record<string, string> = {
  OUTERWEAR:   '🧥',
  TOPS:        '👕',
  BOTTOMS:     '👖',
  SHOES:       '👟',
  ACCESSORIES: '🎒',
};
// Card heights by category
const CARD_HEIGHTS: Record<string, number> = {
  OUTERWEAR:   SCREEN_W * 0.65,
  TOPS:        SCREEN_W * 0.60,
  BOTTOMS:     SCREEN_W * 0.72,
  SHOES:       SCREEN_W * 0.48,
  ACCESSORIES: SCREEN_W * 0.48,
};
const FLAT_LAY_W = SCREEN_W - PAD * 2 - 40;

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
          // ── Present item ──
          return (
            <View key={cat} style={[styles.flatLayCard, { height: cardH }]}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.flatLayImage}
                resizeMode="cover"
              />
              <View style={styles.flatLayTag}>
                <Text style={styles.flatLayTagCat}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                <Text style={styles.flatLayTagName} numberOfLines={1}>{item.name}</Text>
              </View>
            </View>
          );
        }

        if (missingItem) {
          // ── Missing item placeholder ──
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
export default function RecommendationScreen({ route, navigation }: any) {
  const weather = route?.params?.weather;
  const { accessToken, refreshAccessToken } = useAuth();

  const [rec, setRec]                       = useState<AiRecommendationResponse | null>(null);
  const [loading, setLoading]               = useState(true);
  const [aiLoading, setAiLoading]           = useState(false);
  const [error, setError]                   = useState('');
  const [regenKey, setRegenKey]             = useState(0);

  const [comment, setComment]               = useState('');
  const [rating, setRating]                 = useState<number | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState('');

  useEffect(() => { loadRecommendation(); }, [regenKey]);

  const loadRecommendation = async () => {
    try {
      setLoading(true);
      setError('');
      if (!accessToken) { setError('Сесія неактивна. Увійди знову.'); return; }

      const fetch = async (token: string) => {
        setAiLoading(true);
        try {
          const data = await fetchAiRecommendation(token, {
            city: weather?.city,
            temperature: weather?.temperature,
            feelsLike: weather?.feelsLike,
            windSpeed: weather?.windSpeed,
            precipitationMm: weather?.precipitationMm,
            description: weather?.description,
          });
          setRec(data);
          setComment(data.userComment ?? '');
          setRating(data.userRating ?? null);
          setFeedbackStatus('');
        } finally {
          setAiLoading(false);
        }
      };

      try {
        await fetch(accessToken);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!msg.toLowerCase().includes('unauthorized')) throw err;
        const next = await refreshAccessToken();
        if (!next) throw new Error('Сесія завершилась. Увійди повторно.');
        await fetch(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити рекомендацію');
      setRec(null);
    } finally {
      setLoading(false);
    }
  };

  const onSaveFeedback = async () => {
    if (!rec?.id || !accessToken) return;
    const text = comment.trim();
    if (text.length < 2) { setFeedbackStatus('Мінімум 2 символи'); return; }
    if (text.length > 500) { setFeedbackStatus('Максимум 500 символів'); return; }

    setSavingFeedback(true);
    setFeedbackStatus('');
    try {
      const result = await saveRecommendationFeedback(accessToken, rec.id, text, rating);
      setRec(prev => prev ? { ...prev, userComment: result.userComment ?? text, userRating: result.userRating } : prev);
      setComment(result.userComment ?? text);
      setRating(result.userRating ?? rating);
      setFeedbackStatus('✓ Відгук збережено. Буде враховано у наступних рекомендаціях.');
    } catch (err) {
      setFeedbackStatus(err instanceof Error ? err.message : 'Помилка збереження');
    } finally {
      setSavingFeedback(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingTitle}>Формуємо образ...</Text>
          <Text style={styles.loadingHint}>AI аналізує гардероб та генерує образ{'\n'}(може зайняти до 30 секунд)</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasOutfit = (rec?.fromWardrobe.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ОБРАЗ ДНЯ</Text>
            <Text style={styles.title}>Рекомендація</Text>
          </View>
          {weather && (
            <View style={styles.weatherChip}>
              <Text style={styles.weatherChipEmoji}>
                {getWeatherEmoji(weather.description)}
              </Text>
              <View>
                <Text style={styles.weatherChipCity}>{weather.city}</Text>
                <Text style={styles.weatherChipTemp}>
                  {Math.round(weather.temperature)}°C
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ══ ERROR ═══════════════════════════════════════════════ */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
            <Pressable onPress={() => setRegenKey(x => x + 1)}>
              <Text style={styles.errorRetry}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {/* ══ OUTFIT BOARD ════════════════════════════════════════ */}
        <View style={styles.collageBoardCard}>
          <View style={styles.boardHeader}>
            <Text style={styles.boardLabel}>ПІДІБРАНИЙ ОБРАЗ</Text>
            {hasOutfit && (
              <View style={styles.boardBadge}>
                <Text style={styles.boardBadgeText}>{rec!.fromWardrobe.length} речей</Text>
              </View>
            )}
          </View>

          {aiLoading ? (
            <View style={styles.boardLoading}>
              <ActivityIndicator color={GOLD} size="small" />
              <Text style={styles.boardLoadingText}>AI генерує образ...</Text>
            </View>
          ) : rec?.outfitImageUrl ? (
            /* ── AI generated image + Flat Lay below ── */
            <View>
              {/* AI image */}
              <View style={styles.generatedImageWrap}>
                <Image
                  source={{ uri: rec.outfitImageUrl }}
                  style={styles.generatedImage}
                  resizeMode="cover"
                />
                <View style={styles.generatedBadge}>
                  <Text style={styles.generatedBadgeText}>✦ Згенеровано AI</Text>
                </View>
              </View>

              {/* Flat Lay divider */}
              {hasOutfit && (
                <>
                  <View style={styles.flatLayDivider}>
                    <View style={styles.flatLayDividerLine} />
                    <Text style={styles.flatLayDividerLabel}>З ВАШОГО ГАРДЕРОБУ</Text>
                    <View style={styles.flatLayDividerLine} />
                  </View>
                  <CollageBoard
                    items={rec.fromWardrobe}
                    missing={rec.missing}
                    onAddMissing={() => navigation.navigate('Wardrobe')}
                  />
                </>
              )}
            </View>
          ) : hasOutfit ? (
            /* ── Fallback flat lay while image generates ── */
            <CollageBoard
              items={rec!.fromWardrobe}
              missing={rec!.missing}
              onAddMissing={() => navigation.navigate('Wardrobe')}
            />
          ) : (
            <View style={styles.boardEmpty}>
              <Text style={styles.boardEmptyEmoji}>👗</Text>
              <Text style={styles.boardEmptyTitle}>Гардероб порожній</Text>
              <Text style={styles.boardEmptyDesc}>
                Додай речі до гардеробу — AI підбере образ саме з твоїх речей
              </Text>
              <Pressable
                style={styles.boardEmptyBtn}
                onPress={() => navigation.navigate('Wardrobe')}
              >
                <Text style={styles.boardEmptyBtnText}>Перейти до гардеробу →</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ══ AI TIPS ════════════════════════════════════════════ */}
        {rec && rec.recommended.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ПОРАДИ AI</Text>
            <View style={styles.cardDivider} />
            {rec.recommended.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ══ MISSING ITEMS ═══════════════════════════════════════ */}
        {rec && rec.missing.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ЧОГО БРАКУЄ</Text>
            <View style={styles.cardDivider} />
            {rec.missing.map((item, i) => (
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

        {/* ══ REFRESH BUTTON ══════════════════════════════════════ */}
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.8 }]}
          onPress={() => setRegenKey(x => x + 1)}
        >
          <Text style={styles.refreshBtnIcon}>↺</Text>
          <Text style={styles.refreshBtnText}>Оновити рекомендацію</Text>
        </Pressable>

        {/* ══ FEEDBACK CARD ═══════════════════════════════════════ */}
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
                  onPress={() => setRating(active ? null : v)}
                >
                  <Text style={styles.ratingEmoji}>{starLabel(v)}</Text>
                  <Text style={[styles.ratingNum, active && styles.ratingNumActive]}>{v}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Коментар</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Як пройшов день у цьому образі?"
            placeholderTextColor={MUTED}
            style={styles.commentInput}
            multiline
            maxLength={500}
          />
          <Text style={styles.commentCounter}>{comment.length}/500</Text>

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

          <Pressable
            style={({ pressed }) => [
              styles.saveFeedbackBtn,
              savingFeedback && { opacity: 0.6 },
              pressed && !savingFeedback && { opacity: 0.8 },
            ]}
            onPress={onSaveFeedback}
            disabled={savingFeedback}
          >
            {savingFeedback
              ? <ActivityIndicator size="small" color={GOLD} />
              : <Text style={styles.saveFeedbackBtnText}>Зберегти відгук</Text>
            }
          </Pressable>
        </View>

        {/* ══ HISTORY LINK ════════════════════════════════════════ */}
        <Pressable
          style={({ pressed }) => [styles.historyLink, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.navigate('RecommendationHistory')}
        >
          <Text style={styles.historyLinkText}>Переглянути всі образи →</Text>
        </Pressable>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ══ BOTTOM TAB BAR ══════════════════════════════════════ */}
      <View style={styles.tabBar}>
        <TabItem iconName="home-outline"     label="ГОЛОВНА"  onPress={() => navigation.navigate('Home')} />
        <TabItem iconName="shirt-outline"    label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
        <TabItem iconName="diamond"          label="СТИЛЬ"    active />
        <TabItem iconName="time-outline"     label="ЖУРНАЛ"   onPress={() => navigation.navigate('RecommendationHistory')} />
        <TabItem iconName="person-outline"   label="ПРОФІЛЬ"  onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

// ─── Tab item ─────────────────────────────────────────────────────────────────
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: BG },
  container: {
    paddingHorizontal: PAD,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 24,
    gap: 14,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
  },
  loadingTitle: { color: WHITE, fontSize: 18, fontWeight: '700', marginTop: 8 },
  loadingHint:  { color: GRAY, fontSize: 13, textAlign: 'center' },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8, marginBottom: 4,
  },
  title: {
    color: WHITE, fontSize: 28, fontWeight: '700', letterSpacing: -0.6,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weatherChipEmoji: { fontSize: 22 },
  weatherChipCity:  { color: GRAY, fontSize: 11, fontWeight: '500' },
  weatherChipTemp:  { color: WHITE, fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },

  // ── ERROR ──
  errorBanner: {
    backgroundColor: RED + '14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RED + '33',
    padding: 14,
    gap: 8,
  },
  errorText:  { color: RED, fontSize: 13 },
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
  boardLabel: {
    color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8,
  },
  boardBadge: {
    backgroundColor: GOLD + '22',
    borderWidth: 1,
    borderColor: GOLD + '44',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  boardBadgeText: { color: GOLD, fontSize: 11, fontWeight: '600' },
  boardLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  boardLoadingText: { color: GRAY, fontSize: 13 },

  // Canvas for absolute-positioned collage items
  canvas: {
    position: 'relative',
    backgroundColor: CARD2,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // Each item in the collage
  collageItem: {
    position: 'absolute',
  },
  collageImage: {
    width: '100%',
    height: '100%',
  },
  collageTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  collageTagText: {
    color: WHITE, fontSize: 10, fontWeight: '600', letterSpacing: 0.2,
  },

  // Hint when no transparent backgrounds
  noBgHint: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: GOLD + '22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD + '44',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noBgHintText: {
    color: GOLD, fontSize: 10, textAlign: 'center', fontWeight: '600',
  },

  // ── Board empty ──
  boardEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  boardEmptyEmoji: { fontSize: 48 },
  boardEmptyTitle: { color: WHITE, fontSize: 17, fontWeight: '700' },
  boardEmptyDesc:  { color: GRAY, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  boardEmptyBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: GOLD + '66',
    backgroundColor: GOLD + '18',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  boardEmptyBtnText: { color: GOLD, fontWeight: '600', fontSize: 13 },

  // ── INFO CARDS ──
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 12,
  },
  cardLabel: {
    color: GOLD, fontSize: 10, fontWeight: '600', letterSpacing: 1.8,
  },
  cardDivider: {
    height: 1, backgroundColor: BORDER, marginTop: -4,
  },

  // ── TIPS ──
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginTop: 7,
    flexShrink: 0,
  },
  tipText: {
    color: GRAY, fontSize: 13, lineHeight: 20, flex: 1,
  },

  // ── MISSING ──
  missingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  missingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: GOLD + '22',
    borderWidth: 1,
    borderColor: GOLD + '44',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  missingIcon:       { color: GOLD, fontSize: 16, fontWeight: '700' },
  missingLabel:      { color: WHITE, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  missingSuggestion: { color: GRAY, fontSize: 12, lineHeight: 17 },

  // ── REFRESH ──
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 15,
  },
  refreshBtnIcon: { color: GOLD, fontSize: 20, fontWeight: '700' },
  refreshBtnText: { color: WHITE, fontSize: 14, fontWeight: '600' },

  // ── FEEDBACK ──
  fieldLabel: {
    color: MUTED, fontSize: 10, fontWeight: '600', letterSpacing: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0F0F0F',
    gap: 2,
  },
  ratingBtnActive: {
    borderColor: GOLD,
    backgroundColor: GOLD + '18',
  },
  ratingEmoji: { fontSize: 18 },
  ratingNum: {
    color: MUTED, fontSize: 11, fontWeight: '700',
  },
  ratingNumActive: { color: GOLD },

  commentInput: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WHITE,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  commentCounter: {
    color: MUTED, fontSize: 11, textAlign: 'right', marginTop: -6,
  },

  feedbackStatusBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED + '33',
    backgroundColor: RED + '14',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  feedbackStatusSuccess: {
    borderColor: GREEN + '44',
    backgroundColor: GREEN + '14',
  },
  feedbackStatusText:        { color: RED, fontSize: 12 },
  feedbackStatusTextSuccess: { color: GREEN, fontSize: 12 },

  saveFeedbackBtn: {
    borderWidth: 1,
    borderColor: GOLD + '66',
    backgroundColor: GOLD + '18',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveFeedbackBtnText: {
    color: GOLD, fontWeight: '700', fontSize: 14,
  },

  // ── DALL-E GENERATED IMAGE ──
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
  generatedBadgeText: {
    color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
  },

  // ── FLAT LAY DIVIDER ──
  flatLayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  flatLayDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  flatLayDividerLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
  },

  // ── FLAT LAY VERTICAL LIST ──
  flatLayList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  flatLayCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  flatLayImage: {
    width: '100%',
    height: '100%',
  },
  flatLayTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  flatLayTagCat: {
    color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase',
  },
  flatLayTagName: {
    color: WHITE, fontSize: 13, fontWeight: '600',
  },
  // ── MISSING ITEM PLACEHOLDER ──
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD + '22',
    borderWidth: 1,
    borderColor: GOLD + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatLayEmptyPlusIcon: { color: GOLD, fontSize: 24, fontWeight: '300' },
  flatLayEmptyLabel:      { color: WHITE, fontSize: 14, fontWeight: '600' },
  flatLayEmptySuggestion: { color: GRAY, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },

  // ── HISTORY LINK ──
  historyLink: { alignItems: 'center', paddingVertical: 4 },
  historyLinkText: {
    color: GOLD + 'BB', fontSize: 13, fontWeight: '600',
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
  tabItem:        { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  tabIcon:        { fontSize: 20, opacity: 0.4 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  tabLabelActive: { color: GOLD },
});
