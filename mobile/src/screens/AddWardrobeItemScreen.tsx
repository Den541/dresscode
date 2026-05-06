import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Image,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = '#C9961A';
const BG = '#0D0D0D';
const CARD = '#141414';
const BORDER = '#252525';
const WHITE = '#FFFFFF';
const GRAY = '#888888';
const MUTED = '#444444';
const RED = '#FF6B6B';

type Props = { navigation: any };

export default function AddWardrobeItemScreen({ navigation }: Props) {
    const { accessToken } = useAuth();
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const pickFromGallery = async () => {
        setError('');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { setError('Потрібен доступ до галереї'); return; }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
    };

    const takePhoto = async () => {
        setError('');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setError('Потрібен доступ до камери'); return; }

        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
    };

    const handleSave = async () => {
        try {
            setError('');
            if (!accessToken) { setError('Не авторизовано'); return; }
            if (!imageUri) { setError('Додайте фото'); return; }
            setSaving(true);

            const fileName = imageUri.split('/').pop() || `item-${Date.now()}.jpg`;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

            const formData = new FormData();
            if (name.trim()) formData.append('name', name.trim());
            formData.append('image', { uri: imageUri, name: fileName, type: mimeType } as any);

            const response = await fetch(`${API_BASE_URL}/wardrobe`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.message || 'Не вдалося зберегти річ');
            }

            navigation.goBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося зберегти річ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor={BG} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={22} color={WHITE} />
                </Pressable>
                <Text style={styles.headerTitle}>Нова річ</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Image picker zone */}
                    <Pressable
                        style={({ pressed }) => [styles.imagePicker, pressed && { opacity: 0.85 }]}
                        onPress={pickFromGallery}
                        disabled={saving}
                    >
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="image-outline" size={48} color={MUTED} />
                                <Text style={styles.imagePlaceholderText}>Натисни, щоб вибрати фото</Text>
                                <Text style={styles.imagePlaceholderSub}>або скористайся кнопками нижче</Text>
                            </View>
                        )}
                    </Pressable>

                    {/* Photo action buttons */}
                    <View style={styles.photoRow}>
                        <Pressable
                            style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.75 }]}
                            onPress={takePhoto}
                            disabled={saving}
                        >
                            <Ionicons name="camera-outline" size={18} color={GOLD} />
                            <Text style={styles.photoBtnText}>Камера</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.75 }]}
                            onPress={pickFromGallery}
                            disabled={saving}
                        >
                            <Ionicons name="images-outline" size={18} color={GOLD} />
                            <Text style={styles.photoBtnText}>Галерея</Text>
                        </Pressable>
                    </View>

                    {/* Name field */}
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>НАЗВА</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={t => { setName(t); setError(''); }}
                            placeholder="Наприклад: Чорна футболка"
                            placeholderTextColor={MUTED}
                            editable={!saving}
                        />
                        <Text style={styles.fieldHint}>
                            Можна лишити порожньою — AI сам визначить назву і характеристики з фото
                        </Text>
                    </View>

                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBanner}>
                            <Ionicons name="warning-outline" size={16} color={RED} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Save button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.saveBtn,
                            saving && { opacity: 0.6 },
                            pressed && { opacity: 0.85 },
                        ]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.saveBtnText}>✦  Зберегти та проаналізувати</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },

    // ── HEADER ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: CARD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: WHITE,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

    // ── CONTENT ──
    content: {
        padding: 20,
        gap: 20,
        paddingBottom: 40,
    },

    // ── IMAGE PICKER ──
    imagePicker: {
        width: '100%',
        height: 280,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: CARD,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: BORDER,
        borderStyle: 'dashed',
        margin: 1,
    },
    imagePlaceholderText: {
        color: GRAY,
        fontSize: 15,
        fontWeight: '600',
    },
    imagePlaceholderSub: {
        color: MUTED,
        fontSize: 12,
    },

    // ── PHOTO BUTTONS ──
    photoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    photoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: GOLD + '55',
        backgroundColor: GOLD + '12',
    },
    photoBtnText: {
        color: GOLD,
        fontSize: 14,
        fontWeight: '600',
    },

    // ── FIELD ──
    field: { gap: 8 },
    fieldLabel: {
        color: MUTED,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    input: {
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: WHITE,
        fontSize: 15,
    },
    fieldHint: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 17,
    },

    // ── ERROR ──
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: RED + '15',
        borderWidth: 1,
        borderColor: RED + '40',
        borderRadius: 12,
        padding: 12,
    },
    errorText: {
        color: RED,
        fontSize: 13,
        flex: 1,
    },

    // ── SAVE BUTTON ──
    saveBtn: {
        backgroundColor: GOLD,
        borderRadius: 16,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.2,
    },
});
