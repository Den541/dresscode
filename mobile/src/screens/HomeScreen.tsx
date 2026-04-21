import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

// ─── Design tokens ───────────────────────────────────────────────────────────
const GOLD   = '#C9961A';
const BG     = '#0D0D0D';
const CARD   = '#141414';
const CARD2  = '#1A1A1A';
const BORDER = '#252525';
const WHITE  = '#FFFFFF';
const GRAY   = '#888888';
const MUTED  = '#444444';

type Props = { navigation: any };

type WeatherDto = {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationMm: number;
  description: string;
  icon: string;
};

type RecentLook = {
  id: string;
  city: string;
  createdAt: string;
  summary: string[];
  userRating: number | null;
};

const LAST_CITY_KEY = 'dresscode:lastCity';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeatherEmoji(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('thunder'))                                return '⛈️';
  if (d.includes('snow') || d.includes('blizzard'))        return '❄️';
  if (d.includes('rain') || d.includes('drizzle'))         return '🌧️';
  if (d.includes('fog') || d.includes('mist'))             return '🌫️';
  if (d.includes('overcast'))                              return '☁️';
  if (d.includes('cloud'))                                 return '⛅';
  if (d.includes('clear') || d.includes('sunny'))         return '☀️';
  return '🌤️';
}

function getWeatherLabel(description: string, temp: number): string {
  const d = description.toLowerCase();
  let condition = 'Ясно';
  if (d.includes('thunder'))                     condition = 'Гроза';
  else if (d.includes('snow'))                   condition = 'Сніжно';
  else if (d.includes('rain') || d.includes('drizzle')) condition = 'Дощ';
  else if (d.includes('fog') || d.includes('mist'))    condition = 'Туман';
  else if (d.includes('overcast') || d.includes('cloud')) condition = 'Хмарно';

  let feel = '';
  if (temp < 0)       feel = 'та Морозно';
  else if (temp < 8)  feel = 'та Холодно';
  else if (temp < 15) feel = 'та Прохолодно';
  else if (temp < 22) feel = 'та Тепло';
  else if (temp < 28) feel = 'та Спекотно';
  else                feel = 'та Дуже Жарко';

  return `${condition} ${feel}`;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Ідеально для ранку';
  if (h < 18) return 'Ідеально для дня';
  return 'Ідеально для вечора';
}

function getInitials(name?: string | null, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getDate() - d.getDate();
  if (diff === 0) return `Сьогодні • ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (diff === 1) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { user, accessToken } = useAuth();

  const [city, setCity]         = useState('Kyiv');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [weather, setWeather]   = useState<WeatherDto | null>(null);

  const [wardrobeCount, setWardrobeCount]   = useState<number | null>(null);
  const [recentLooks, setRecentLooks]       = useState<RecentLook[]>([]);

  // ── Load saved city ──
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_CITY_KEY);
        if (saved?.trim()) setCity(saved);
      } catch {}
    })();
  }, []);

  // ── Load wardrobe count + recent looks ──
  useEffect(() => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };

    fetchWithTimeout(`${API_BASE_URL}/wardrobe`, { headers }, 8000)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setWardrobeCount(d.length))
      .catch(() => {});

    fetchWithTimeout(`${API_BASE_URL}/recommendations/history?limit=3`, { headers }, 8000)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setRecentLooks(d))
      .catch(() => {});
  }, [accessToken]);

  // ── Fetch weather ──
  const getWeather = useCallback(async () => {
    const cleanCity = city.trim();
    if (!cleanCity) { setError('Введи назву міста'); return; }
    try {
      setError('');
      setLoading(true);
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/weather?city=${encodeURIComponent(cleanCity)}`,
        { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
        10000,
      );
      const data = await res.json();
      if (!res.ok) { setWeather(null); setError(data?.message ?? 'Помилка'); return; }
      setWeather(data);
      await AsyncStorage.setItem(LAST_CITY_KEY, cleanCity);
    } catch (e: any) {
      setWeather(null);
      setError(e?.message ?? 'Помилка мережі');
    } finally {
      setLoading(false);
    }
  }, [city, accessToken]);

  const goToOutfit = () => {
    if (!weather) { setError('Спочатку отримай погоду'); return; }
    navigation.navigate('Recommendation', { weather });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>ТВІЙ ПЕРСОНАЛЬНИЙ СТИЛІСТ</Text>
            <Text style={styles.headerLogo}>DressCode</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.name, user?.email)}
            </Text>
          </Pressable>
        </View>

        {/* ══ SEARCH BAR ══════════════════════════════════════════ */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <TextInput
              value={city}
              onChangeText={t => { setCity(t); setError(''); }}
              placeholder="Введи місто..."
              placeholderTextColor={MUTED}
              style={styles.searchInput}
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              returnKeyType="search"
              onSubmitEditing={getWeather}
            />
            <Text style={styles.searchWindIcon}>🌬️</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.8 }, loading && { opacity: 0.6 }]}
            onPress={getWeather}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.searchBtnIcon}>🌦️</Text>
            }
          </Pressable>
        </View>

        {/* ══ ERROR ════════════════════════════════════════════════ */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        )}

        {/* ══ WEATHER CARD ════════════════════════════════════════ */}
        {weather ? (
          <View style={styles.weatherCard}>
            {/* Top row */}
            <View style={styles.weatherTopRow}>
              <View>
                <Text style={styles.weatherCity}>{weather.city}, Україна</Text>
                <Text style={styles.weatherLabel}>
                  {getWeatherLabel(weather.description, weather.temperature)}
                </Text>
              </View>
              <View style={styles.weatherIconBox}>
                <Text style={styles.weatherIconEmoji}>
                  {getWeatherEmoji(weather.description)}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.weatherStats}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>ВІДЧУВАЄТЬСЯ</Text>
                <Text style={styles.statValue}>{Math.round(weather.feelsLike)}°C</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>ВІТЕР</Text>
                <Text style={styles.statValue}>{(weather.windSpeed * 3.6).toFixed(0)} км/г</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>ВОЛОГІСТЬ</Text>
                <Text style={styles.statValue}>{weather.humidity}%</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.weatherDivider} />

            {/* Bottom row */}
            <View style={styles.weatherBottom}>
              <Text style={styles.weatherTimeOfDay}>{getTimeOfDay()}</Text>
              <Pressable
                style={({ pressed }) => [styles.outfitBtn, pressed && { opacity: 0.85 }]}
                onPress={goToOutfit}
              >
                <Text style={styles.outfitBtnText}>Підібрати образ →</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          !loading && !error && (
            <View style={styles.emptyWeather}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyTitle}>Яка погода сьогодні?</Text>
              <Text style={styles.emptyDesc}>
                Введи місто, щоб дізнатись погоду та отримати рекомендацію образу від AI
              </Text>
            </View>
          )
        )}

        {/* ══ QUICK CARDS ═════════════════════════════════════════ */}
        <View style={styles.quickGrid}>
          <Pressable
            style={({ pressed }) => [styles.quickCard, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('Wardrobe')}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>👔</Text>
            </View>
            <Text style={styles.quickLabel}>Гардероб</Text>
            <Text style={styles.quickSub}>
              {wardrobeCount != null ? `${wardrobeCount} РЕЧЕЙ` : 'МОЇ РЕЧІ'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.quickCard, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('RecommendationHistory')}
          >
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>✦</Text>
            </View>
            <Text style={styles.quickLabel}>Аналітика</Text>
            <Text style={styles.quickSub}>
              {recentLooks.length > 0 ? `${recentLooks.length} ОБРАЗІВ` : 'ОГЛЯД СТИЛЮ'}
            </Text>
          </Pressable>
        </View>

        {/* ══ RECENT LOOKS ════════════════════════════════════════ */}
        {recentLooks.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ОСТАННІ ОБРАЗИ</Text>
              <Pressable onPress={() => navigation.navigate('RecommendationHistory')}>
                <Text style={styles.sectionLink}>Всі</Text>
              </Pressable>
            </View>

            <View style={styles.looksList}>
              {recentLooks.map(look => (
                <Pressable
                  key={look.id}
                  style={({ pressed }) => [styles.lookCard, pressed && styles.cardPressed]}
                  onPress={() => navigation.navigate('RecommendationHistoryDetails', { id: look.id })}
                >
                  <View style={styles.lookThumb}>
                    <Text style={styles.lookThumbEmoji}>
                      {getWeatherEmoji(look.summary?.[0] ?? '')}
                    </Text>
                  </View>
                  <View style={styles.lookInfo}>
                    <Text style={styles.lookTitle} numberOfLines={1}>
                      {look.summary?.[0] ?? 'Образ'}
                    </Text>
                    <Text style={styles.lookMeta}>
                      {formatDate(look.createdAt)} • {look.city}
                    </Text>
                  </View>
                  <Text style={styles.lookDots}>•••</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ══ BOTTOM TAB BAR ══════════════════════════════════════ */}
      <View style={styles.tabBar}>
        <TabItem icon="🌬️" label="ГОЛОВНА"  active onPress={() => {}} />
        <TabItem icon="👔"  label="ГАРДЕРОБ" onPress={() => navigation.navigate('Wardrobe')} />
        <TabItem icon="✦"   label="СТИЛЬ"    onPress={goToOutfit} />
        <TabItem icon="🕐"  label="ЖУРНАЛ"   onPress={() => navigation.navigate('RecommendationHistory')} />
        <TabItem icon="👤"  label="ПРОФІЛЬ"  onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

// ─── Tab item ─────────────────────────────────────────────────────────────────
function TabItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
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
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 16,
    gap: 14,
  },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerEyebrow: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  headerLogo: {
    color: GOLD,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 40,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD2,
    borderWidth: 1.5,
    borderColor: GOLD + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarText: {
    color: GOLD,
    fontSize: 17,
    fontWeight: '700',
  },

  // ── SEARCH ──
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    height: 54,
  },
  searchInput: {
    flex: 1,
    color: WHITE,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchWindIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  searchBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnIcon: {
    fontSize: 22,
  },

  // ── ERROR ──
  errorBanner: {
    backgroundColor: '#FF4D4D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4D4D33',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
  },

  // ── WEATHER CARD ──
  weatherCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  weatherCity: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  weatherLabel: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
    maxWidth: 200,
  },
  weatherIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherIconEmoji: {
    fontSize: 26,
  },
  weatherStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statValue: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: BORDER,
    marginHorizontal: 12,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 16,
  },
  weatherBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherTimeOfDay: {
    color: GRAY,
    fontSize: 13,
  },
  outfitBtn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 50,
  },
  outfitBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: -0.2,
  },

  // ── EMPTY WEATHER ──
  emptyWeather: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  emptyTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyDesc: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // ── QUICK CARDS ──
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 6,
  },
  quickIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: GOLD + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickIcon: {
    fontSize: 20,
  },
  quickLabel: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickSub: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  cardPressed: {
    opacity: 0.65,
  },

  // ── SECTION HEADER ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
  },
  sectionLink: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── LOOK CARDS ──
  looksList: {
    gap: 10,
  },
  lookCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lookThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookThumbEmoji: {
    fontSize: 22,
  },
  lookInfo: {
    flex: 1,
    gap: 4,
  },
  lookTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  lookMeta: {
    color: GRAY,
    fontSize: 12,
  },
  lookDots: {
    color: MUTED,
    fontSize: 14,
    letterSpacing: 2,
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
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  tabLabelActive: {
    color: GOLD,
  },
});
