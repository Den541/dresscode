import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { API_BASE_URL } from '../config';

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

export default function HomeScreen({ navigation }: Props) {
  const [city, setCity] = useState('Lviv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [weather, setWeather] = useState<WeatherDto | null>(null);

  const getWeather = async () => {
    const cleanCity = city.trim();
    if (!cleanCity) {
      setError('Enter a city name');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/weather?city=${encodeURIComponent(cleanCity)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setWeather(null);
        setError(data?.message ?? `Weather error: ${res.status}`);
        return;
      }

      setWeather(data);
    } catch (e: any) {
      setWeather(null);
      setError(e?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const [pingStatus, setPingStatus] = useState<string>('Idle');
  const pingApi = async () => {
    try {
      setPingStatus('Loading...');
      const res = await fetch(`${API_BASE_URL}/health`);
      const data = await res.json();
      setPingStatus(`OK: ${JSON.stringify(data)}`);
    } catch (e: any) {
      setPingStatus(`ERROR: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DressCode</Text>
      <Text style={styles.subtitle}>Home</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>City</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Enter city..."
          placeholderTextColor="#777"
          style={styles.input}
        />

        <Pressable style={styles.primaryBtn} onPress={getWeather} disabled={loading}>
          <Text style={styles.primaryBtnText}>
            {loading ? 'Loading...' : 'Get Weather'}
          </Text>
        </Pressable>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {weather && (
          <View style={styles.weatherBox}>
            <Text style={styles.weatherTitle}>{weather.city}</Text>
            <Text style={styles.weatherText}>Temp: {weather.temperature}°C</Text>
            <Text style={styles.weatherText}>Feels like: {weather.feelsLike}°C</Text>
            <Text style={styles.weatherText}>Humidity: {weather.humidity}%</Text>
            <Text style={styles.weatherText}>Wind: {weather.windSpeed} m/s</Text>
            <Text style={styles.weatherText}>
              Precipitation: {weather.precipitationMm} mm
            </Text>
            <Text style={styles.weatherText}>Desc: {weather.description}</Text>
          </View>
        )}
      </View>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('Recommendation')}
      >
        <Text style={styles.secondaryBtnText}>Go to Recommendation</Text>
      </Pressable>

      {/* Dev block */}
      <View style={styles.devCard}>
        <Text style={styles.devTitle}>Dev: API connectivity</Text>

        <Pressable style={styles.secondaryBtn} onPress={pingApi}>
          <Text style={styles.secondaryBtnText}>Ping API (/health)</Text>
        </Pressable>

        <Text style={styles.status}>{pingStatus}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0b' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, color: '#aaa' },

  card: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#121212',
    gap: 10,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    backgroundColor: '#0f0f0f',
  },

  primaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '700' },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600' },

  errorText: { color: '#ff6b6b' },

  weatherBox: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 10,
    gap: 4,
  },
  weatherTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  weatherText: { color: '#bbb' },

  devCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#121212',
    gap: 10,
  },
  devTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  status: { color: '#fff', fontFamily: 'Menlo' },
});