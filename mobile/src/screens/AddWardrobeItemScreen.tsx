import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

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
        if (!permission.granted) {
            setError('Потрібен доступ до галереї');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        setError('');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            setError('Потрібен доступ до камери');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        try {
            setError('');

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }
            if (!imageUri) {
                setError('Додайте фото');
                return;
            }

            setSaving(true);

            const fileName = imageUri.split('/').pop() || `item-${Date.now()}.jpg`;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

            const formData = new FormData();
            if (name.trim()) {
                formData.append('name', name.trim());
            }
            formData.append('image', {
                uri: imageUri,
                name: fileName,
                type: mimeType,
            } as any);

            const response = await fetch(`${API_BASE_URL}/wardrobe`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.message || 'Не вдалося зберегти річ');
            }

            navigation.goBack();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Не вдалося зберегти річ';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Додати річ</Text>

            <View style={styles.card}>
                <Text style={styles.label}>Назва</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Наприклад: Червона футболка"
                    placeholderTextColor="#777"
                    style={styles.input}
                    editable={!saving}
                />

                <Text style={styles.helperText}>
                    Назву можна лишити порожньою — ChatGPT сам придумає її і визначить характеристики з фото.
                </Text>

                <View style={styles.photoActions}>
                    <Pressable style={styles.secondaryBtn} onPress={takePhoto} disabled={saving}>
                        <Text style={styles.secondaryBtnText}>Камера</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={pickFromGallery} disabled={saving}>
                        <Text style={styles.secondaryBtnText}>Галерея</Text>
                    </Pressable>
                </View>

                {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                    style={[styles.saveBtn, saving && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Зберегти</Text>}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0b0b0b' },
    title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
    card: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        padding: 14,
        backgroundColor: '#121212',
        gap: 10,
    },
    label: { color: '#fff', fontSize: 14, fontWeight: '600' },
    helperText: { color: '#9bd1ff', fontSize: 12, lineHeight: 18 },
    input: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        backgroundColor: '#0f0f0f',
    },
    photoActions: { flexDirection: 'row', gap: 8 },
    secondaryBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 10,
        alignItems: 'center',
        paddingVertical: 10,
    },
    secondaryBtnText: { color: '#fff', fontWeight: '600' },
    preview: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        backgroundColor: '#1c1c1c',
    },
    errorText: { color: '#ff6b6b' },
    saveBtn: {
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 12,
    },
    saveBtnText: { color: '#000', fontWeight: '700' },
    disabledBtn: { opacity: 0.7 },
});
