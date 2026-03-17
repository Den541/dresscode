import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

type Props = { navigation: any };

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const { register, loading, error: authError } = useAuth();
  const [localError, setLocalError] = useState<string>('');

  const handleRegister = async () => {
    try {
      setLocalError('');

      if (!email.trim() || !password.trim()) {
        setLocalError('Email and password are required');
        return;
      }

      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters');
        return;
      }

      if (password !== passwordConfirm) {
        setLocalError('Passwords do not match');
        return;
      }

      if (!email.includes('@')) {
        setLocalError('Please enter a valid email');
        return;
      }

      await register(email.toLowerCase(), password, name || undefined);
      // Navigation will happen automatically via nav guard
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setLocalError(msg);
    }
  };

  const displayError = localError || authError;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.title}>DressCode</Text>
          <Text style={styles.subtitle}>Sign Up</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#666"
            style={styles.input}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCorrect={false}
            spellCheck={false}
            editable={!loading}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="••••••••"
            placeholderTextColor="#666"
            style={styles.input}
            secureTextEntry
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCorrect={false}
            spellCheck={false}
            editable={!loading}
          />

          {displayError && (
            <Text style={styles.errorText}>{displayError}</Text>
          )}

          <Pressable
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.registerBtnText}>Sign Up</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },

  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#0b0b0b',
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 4,
  },

  card: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#121212',
    gap: 12,
  },

  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    backgroundColor: '#0f0f0f',
    fontSize: 14,
  },

  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },

  registerBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  btnDisabled: {
    opacity: 0.6,
  },

  registerBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },

  footerText: {
    color: '#aaa',
    fontSize: 14,
  },

  linkText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
