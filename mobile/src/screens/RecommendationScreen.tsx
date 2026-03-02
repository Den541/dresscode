import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  navigation: any;
};

export default function RecommendationScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendation</Text>
      <Text style={styles.subtitle}>Поки заглушка для Week 1.</Text>

      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: '#0b0b0b' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#aaa' },
  btn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});