import React, { useState } from 'react';
import { SafeAreaView, Text, View, Button, StyleSheet } from 'react-native';

export default function App() {
  const [status, setStatus] = useState<string>('Idle');

  const pingApi = async () => {
    try {
      setStatus('Loading...');

      // IMPORTANT:
      // - Android emulator uses http://10.0.2.2:3000
      // - iOS simulator can use http://localhost:3000
      // - Real phone needs your laptop IP (we’ll fix after first test)
      const res = await fetch('http://192.168.0.100:3000/health');
      const data = await res.json();

      setStatus(`OK: ${JSON.stringify(data)}`);
    } catch (e: any) {
      setStatus(`ERROR: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>DressCode</Text>
        <Text style={styles.subtitle}>API connectivity check</Text>

        <Button title="Ping API (/health)" onPress={pingApi} />
        <Text style={styles.status}>{status}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0b0b0b', // щоб точно не було "чорне по чорному"
  },
  card: { gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, opacity: 0.8, color: '#fff' },
  status: { marginTop: 12, fontFamily: 'Menlo', color: '#fff' }, // ключове
});