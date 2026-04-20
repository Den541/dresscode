import React, { useEffect, useState } from 'react';
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

const LAST_CITY_KEY = 'dresscode:lastCity';

function getWeatherEmoji(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('snow') || d.includes('blizzard')) return '❄️';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return '🌧️';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️';
  if (d.includes('overcast')) return '☁️';
  if (d.includes('cloud')) return '⛅';
  if (d.includes('clear') || d.includes('sunny')) return '☀️';
  return '🌤️';
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Доброї ночі';
  if (h < 12) return 'Доброго ранку';
  if (h < 18) return 'Доброго дня';
  return 'Доброго вечора';
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { user, accessToken } = useAuth();
  const [city, setCity] = useState('Lviv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<WeatherDto | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const savedCity = await AsyncStorage.getItem(LAST_CITY_KEY);
        if (savedCity?.trim()) setCity(savedCity);
      } catch {}
    })();
  }, []);

  const getWeather = async () => {
    const cleanCity = city.trim();
    if (!cleanCity) {
      setError('Введи назву міста');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/weather?city=${encodeURIComponent(cleanCity)}`,
        { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
        10000,
      );
      const data = await res.json();
      if (!res.ok) {
        setWeather(null);
        setError(data?.message ?? `Помилка: ${res.status}`);
        return;
      }
      setWeather(data);
      await AsyncStorage.setItem(LAST_CITY_KEY, cleanCity);
    } catch (e: any) {
      setWeather(null);
      setError(e?.message ?? 'Помилка мережі');
    } finally {
      setLoading(false);
    }
  };

  const goToRecommendation = () => {
    if (!weather) {
      setError('Спочатку отримай погоду');
      return;
    }
    navigation.navigate('Recommendation', { weather });
  };

  const displayName =
    user?.name?.trim() || user?.email?.split('@')[0] || 'Користувач';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userName}>{displayName} 👋</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.name, user?.email)}
            </Text>
          </Pressable>
        </View>

        {/* ── CITY SEARCH ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchPinIcon}>📍</Text>
            <TextInput
              value={city}
              onChangeText={t => {
                setCity(t);
                setError('');
              }}
              placeholder="Введи місто..."
              placeholderTextColor="#444"
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
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchBtn,
              loading && styles.searchBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={getWeather}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.searchBtnText}>Знайти</Text>
            )}
          </Pressable>
        </View>

        {/* ── ERROR BANNER ── */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── WEATHER CARD ── */}
        {weather ? (
          <View style={styles.weatherCard}>
            <View style={styles.weatherTop}>
              <View style={styles.weatherMeta}>
                <Text style={styles.weatherCity}>{weather.city}</Text>
                <Text style={styles.weatherDesc}>
                  {weather.description.charAt(0).toUpperCase() +
                    weather.description.slice(1)}
                </Text>
              </View>
              <Text style={styles.weatherEmoji}>
                {getWeatherEmoji(weather.description)}
              </Text>
            </View>

            <Text style={styles.weatherTemp}>
              {Math.round(weather.temperature)}°
            </Text>

            <View style={styles.weatherDivider} />

            <View style={styles.weatherStats}>
              <WeatherStat
                icon="🌡️"
                label="Відчувається"
                value={`${Math.round(weather.feelsLike)}°C`}
              />
              <View style={styles.statDivider} />
              <WeatherStat
                icon="💧"
                label="Вологість"
                value={`${weather.humidity}%`}
              />
              <View style={styles.statDivider} />
              <WeatherStat
                icon="💨"
                label="Вітер"
                value={`${weather.windSpeed} м/с`}
              />
              {weather.precipitationMm > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <WeatherStat
                    icon="🌧️"
                    label="Опади"
                    value={`${weather.precipitationMm} мм`}
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          !loading &&
          !error && (
            <View style={styles.emptyWeather}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={styles.emptyTitle}>Яка погода сьогодні?</Text>
              <Text style={styles.emptyDesc}>
                Введи своє місто, щоб дізнатись погоду та отримати рекомендацію образу від AI
              </Text>
            </View>
          )
        )}

        {/* ── PRIMARY ACTION ── */}
        <Pressable
          style={({ pressed }) => [
            styles.recommendBtn,
            !weather && styles.recommendBtnDisabled,
            pressed && weather && { opacity: 0.85 },
          ]}
          onPress={goToRecommendation}
        >
          <View style={styles.recommendBtnInner}>
            <Text style={styles.recommendBtnIcon}>✨</Text>
            <View>
              <Text style={styles.recommendBtnTitle}>Підібрати образ</Text>
              <Text style={styles.recommendBtnSub}>
                {weather
                  ? `На основі погоди у ${weather.city}`
                  : 'Спочатку отримай погоду'}
              </Text>
            </View>
          </View>
          <Text style={styles.recommendArrow}>→</Text>
        </Pressable>

        {/* ── SECTION TITLE ── */}
        <Text style={styles.sectionTitle}>Розділи</Text>

        {/* ── NAV CARDS ── */}
        <View style={styles.navRow}>
          <Pressable
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}
            onPress={() => navigation.navigate('Wardrobe')}
          >
            <Text style={styles.navCardEmoji}>👗</Text>
            <Text style={styles.navCardLabel}>Гардероб</Text>
            <Text style={styles.navCardDesc}>Мої речі</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}
            onPress={() => navigation.navigate('RecommendationHistory')}
          >
            <Text style={styles.navCardEmoji}>🗂️</Text>
            <Text style={styles.navCardLabel}>Історія</Text>
            <Text style={styles.navCardDesc}>Минулі образи</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 48,
    gap: 16,
  },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingBlock: {
    gap: 2,
  },
  greetingText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '400',
  },
  userName: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1C1C1C',
    borderWidth: 1.5,
    borderColor: '#2E2E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  searchPinIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
  },
  searchBtn: {
    height: 52,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 85,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
  searchBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: -0.2,
  },

  // ── ERROR ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B33',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  errorEmoji: {
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // ── WEATHER CARD ──
  weatherCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    padding: 22,
    gap: 0,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weatherMeta: {
    gap: 3,
  },
  weatherCity: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weatherDesc: {
    fontSize: 13,
    color: '#666',
  },
  weatherEmoji: {
    fontSize: 52,
    lineHeight: 58,
  },
  weatherTemp: {
    fontSize: 80,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -3,
    lineHeight: 90,
    marginTop: 4,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginTop: 16,
    marginBottom: 16,
  },
  weatherStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1E1E1E',
  },
  statIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  statLabel: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
  },

  // ── EMPTY STATE ──
  emptyWeather: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 56,
    lineHeight: 64,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyDesc: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // ── PRIMARY CTA ──
  recommendBtn: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendBtnDisabled: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
  },
  recommendBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  recommendBtnIcon: {
    fontSize: 26,
    lineHeight: 32,
  },
  recommendBtnTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  recommendBtnSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  recommendArrow: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },

  // ── SECTION TITLE ──
  sectionTitle: {
    color: '#3A3A3A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── NAV CARDS ──
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    padding: 18,
    gap: 4,
  },
  navCardPressed: {
    opacity: 0.65,
  },
  navCardEmoji: {
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 6,
  },
  navCardLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  navCardDesc: {
    color: '#555',
    fontSize: 12,
  },
});
