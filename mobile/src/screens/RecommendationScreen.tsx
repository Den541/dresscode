import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { getRecommendationUA } from '../logic/recommendations';

export default function RecommendationScreen({ route }: any) {
  const weather = route?.params?.weather;

  // "regen" просто змушує перерахувати (навіть з тих самих даних)
  const [regenKey, setRegenKey] = useState(0);

  const rec = useMemo(() => {
    return getRecommendationUA(weather);
  }, [weather, regenKey]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Рекомендація</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Що вдягнути</Text>
        <FlatList
          data={rec.items}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <Text style={styles.item}>• {item}</Text>}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Чому</Text>
        <FlatList
          data={rec.reasons}
          keyExtractor={(item, idx) => `${idx}-${item}`}
          renderItem={({ item }) => <Text style={styles.reason}>• {item}</Text>}
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

  btn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#000', fontWeight: '700' },
});