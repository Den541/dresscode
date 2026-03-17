import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { getRecommendationUA, UserPreferences } from '../logic/recommendations';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function RecommendationScreen({ route }: any) {
  const weather = route?.params?.weather;
  const { accessToken } = useAuth();

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [regenKey, setRegenKey] = useState(0);

  // Load user preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError('');

      if (!accessToken) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(msg);
      // Continue with default preferences
      setPreferences({ style: 'CASUAL', coldSensitivity: 0 });
    } finally {
      setLoading(false);
    }
  };

  const rec = useMemo(() => {
    return getRecommendationUA(weather, preferences || undefined);
  }, [weather, preferences, regenKey]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Рекомендація</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {preferences && (
        <Text style={styles.infoText}>
          Враховано: стиль "{preferences.style}", чутливість до холоду {preferences.coldSensitivity}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Що вдягнути</Text>
        <FlatList
          data={rec.items}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <Text style={styles.item}>• {item}</Text>}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Чому</Text>
        <FlatList
          data={rec.reasons}
          keyExtractor={(item, idx) => `${idx}-${item}`}
          renderItem={({ item }) => <Text style={styles.reason}>• {item}</Text>}
          scrollEnabled={false}
        />
      </View>

      <Pressable style={styles.btn} onPress={() => setRegenKey((x) => x + 1)}>
        <Text style={styles.btnText}>Оновити рекомендацію</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0b' },
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

  infoText: { color: '#aaa', fontSize: 12, marginBottom: 8 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginBottom: 8 },

  btn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#000', fontWeight: '700' },
});