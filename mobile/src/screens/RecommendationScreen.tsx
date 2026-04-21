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
import { useAuth } from '../context/AuthContext';
import {
  fetchAiRecommendation,
  AiRecommendationResponse,
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

// ─── Outfit zone config ───────────────────────────────────────────────────────
const ZONES = [
  { category: 'OUTERWEAR',   label: 'ВЕРХНІЙ ОДЯГ', imgW: SCREEN_W * 0.52, imgH: SCREEN_W * 0.62 },
  { category: 'TOPS',        label: 'ВЕРХ',          imgW: SCREEN_W * 0.46, imgH: SCREEN_W * 0.56 },
  { category: 'BOTTOMS',     label: 'НИЗ',           imgW: SCREEN_W * 0.44, imgH: SCREEN_W * 0.70 },
] as const;

const SMALL_ZONES = [
  { category: 'SHOES',       label: 'ВЗУТТЯ'    },
  { category: 'ACCESSORIES', label: 'АКСЕСУАРИ' },
] as const;

type ItemDto = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeatherEmoji(description = ''): string {
  const d = description.toLowerCase();
  if (d.includes('thunder'))                           return '⛈️';
  if (d.includes('snow'))                              return '❄️';
  if (d.includes('rain') || d.includes('drizzle'))    return '🌧️';
  if (d.includes('fog') || d.includes('mist'))        return '🌫️';
  if (d.includes('overcast'))                         return '☁️';
  if (d.includes('cloud'))                            return '⛅';
  return '☀️';
}

function starLabel(n: number): string {
  return ['😕', '😐', '🙂', '😊', '🤩'][n - 1] ?? '';
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
          <Text style={styles.loadingHint}>AI аналізує погоду та твій гардероб</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Group wardrobe items by category ──
  const byCategory = (cat: string): ItemDto[] =>
    rec?.fromWardrobe.filter(i => i.category === cat) ?? [];

  const totalOutfitItems = rec?.fromWardrobe.length ?? 0;
  const hasOutfit = totalOutfitItems > 0;

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

        {/* ══ FLAT LAY BOARD ══════════════════════════════════════ */}
        <View style={styles.flatLayBoard}>
          {/* Board title */}
          <View style={styles.boardHeader}>
            <Text style={styles.boardLabel}>ПІДІБРАНИЙ ОБРАЗ</Text>
            {hasOutfit && (
              <View style={styles.boardBadge}>
                <Text style={styles.boardBadgeText}>{totalOutfitItems} речей</Text>
              </View>
            )}
          </View>

          {aiLoading ? (
            <View style={styles.boardLoading}>
              <ActivityIndicator color={GOLD} size="small" />
              <Text style={styles.boardLoadingText}>AI підбирає речі...</Text>
            </View>
          ) : hasOutfit ? (
            <View style={styles.flatLayContent}>
              {/* ── Main zones (OUTERWEAR / TOPS / BOTTOMS) ── */}
              {ZONES.map((zone, i) => {
                const items = byCategory(zone.category);
                if (items.length === 0) return null;
                return (
                  <React.Fragment key={zone.category}>
                    <View style={styles.mainZone}>
                      {/* Zone label */}
                      <Text style={styles.zoneLabel}>{zone.label}</Text>

                      {/* Images row */}
                      <View style={styles.zoneImagesRow}>
                        {items.map(item => (
                          <View key={item.id} style={styles.mainZoneImageWrap}>
                            <Image
                              source={{ uri: item.imageUrl }}
                              style={[
                                styles.mainZoneImage,
                                { width: zone.imgW, height: zone.imgH },
                              ]}
                              resizeMode="cover"
                            />
                            <View style={styles.imageNameTag}>
                              <Text style={styles.imageNameTagText} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Connector between zones */}
                    {i < ZONES.length - 1 && (
                      <View style={styles.zoneConnector}>
                        <View style={styles.zoneConnectorLine} />
                        <View style={styles.zoneConnectorDot} />
                        <View style={styles.zoneConnectorLine} />
                      </View>
                    )}
                  </React.Fragment>
                );
              })}

              {/* ── Small zones (SHOES / ACCESSORIES) ── */}
              {SMALL_ZONES.some(z => byCategory(z.category).length > 0) && (
                <>
                  <View style={styles.zoneConnector}>
                    <View style={styles.zoneConnectorLine} />
                    <View style={styles.zoneConnectorDot} />
                    <View style={styles.zoneConnectorLine} />
                  </View>

                  <View style={styles.smallZonesRow}>
                    {SMALL_ZONES.map(zone => {
                      const items = byCategory(zone.category);
                      if (items.length === 0) return null;
                      const itemW = (SCREEN_W - PAD * 2 - 40 - 12) / 2;
                      return (
                        <View key={zone.category} style={styles.smallZone}>
                          <Text style={styles.zoneLabel}>{zone.label}</Text>
                          {items.slice(0, 1).map(item => (
                            <View key={item.id} style={styles.smallZoneImageWrap}>
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={[styles.smallZoneImage, { width: itemW, height: itemW }]}
                                resizeMode="cover"
                              />
                              <View style={styles.imageNameTag}>
                                <Text style={styles.imageNameTagText} numberOfLines={1}>
                                  {item.name}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          ) : (
            /* ── Empty flat lay ── */
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

          {/* Star rating */}
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

          {/* Comment */}
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
        <TabItem icon="🌬️" label="ГОЛОВНА"  onPress={() => navigation.navigate('Home')} />
        <TabItem icon="👔"  label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
        <TabItem icon="✦"   label="СТИЛЬ"    active />
        <TabItem icon="🕐"  label="ЖУРНАЛ"   onPress={() => navigation.navigate('RecommendationHistory')} />
        <TabItem icon="👤"  label="ПРОФІЛЬ"  onPress={() => navigation.navigate('Profile')} />
      </View>
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

  // ══ FLAT LAY BOARD ══
  flatLayBoard: {
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

  // ── Flat lay content ──
  flatLayContent: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 0,
  },

  // Main zone (OUTERWEAR / TOPS / BOTTOMS)
  mainZone: {
    alignItems: 'center',
    gap: 8,
  },
  zoneLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  zoneImagesRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  mainZoneImageWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER,
  },
  mainZoneImage: {
    backgroundColor: CARD2,
  },

  // Small zones (SHOES / ACCESSORIES)
  smallZonesRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  smallZone: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  smallZoneImageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  smallZoneImage: {
    backgroundColor: CARD2,
  },

  // Name tag on image
  imageNameTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  imageNameTagText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Zone connector
  zoneConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  zoneConnectorLine: {
    width: 1,
    height: 16,
    backgroundColor: BORDER,
  },
  zoneConnectorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GOLD + '88',
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
  tabItem:       { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  tabIcon:       { fontSize: 20, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel:      { color: MUTED, fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  tabLabelActive:{ color: GOLD },
});
