import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    FlatList,
    Image,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { deleteWardrobeItem, fetchWardrobeItems, WardrobeItem } from '../utils/wardrobe';

type Props = { navigation: any };

export default function WardrobeScreen({ navigation }: Props) {
    const { accessToken, refreshAccessToken } = useAuth();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadItems = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            if (!accessToken) {
                setError('Not authenticated');
                return;
            }

            try {
                const data = await fetchWardrobeItems(accessToken);
                setItems(data);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load wardrobe';
                const isUnauthorized = message.toLowerCase().includes('unauthorized');

                if (isUnauthorized) {
                    const nextAccessToken = await refreshAccessToken();
                    if (!nextAccessToken) {
                        setError('Session expired. Please login again.');
                        return;
                    }

                    const data = await fetchWardrobeItems(nextAccessToken);
                    setItems(data);
                    return;
                }

                throw err;
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load wardrobe';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [accessToken, refreshAccessToken]);

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [loadItems]),
    );

    const handleDelete = (item: WardrobeItem) => {
        Alert.alert('Видалити?', `Видалити "${item.name}"?`, [
            { text: 'Скасувати', style: 'cancel' },
            {
                text: 'Видалити',
                style: 'destructive',
                onPress: async () => {
                    if (!accessToken) {
                        setError('Not authenticated');
                        return;
                    }

                    try {
                        setDeletingId(item.id);
                        try {
                            await deleteWardrobeItem(accessToken, item.id);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'Failed to delete item';
                            const isUnauthorized = message.toLowerCase().includes('unauthorized');

                            if (!isUnauthorized) {
                                throw err;
                            }

                            const nextAccessToken = await refreshAccessToken();
                            if (!nextAccessToken) {
                                setError('Session expired. Please login again.');
                                return;
                            }

                            await deleteWardrobeItem(nextAccessToken, item.id);
                        }

                        setItems((prev) => prev.filter((x) => x.id !== item.id));
                    } catch (err) {
                        const message = err instanceof Error ? err.message : 'Failed to delete item';
                        setError(message);
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.actionBtn} onPress={loadItems}>
                    <Text style={styles.actionBtnText}>Retry</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Wardrobe</Text>
                <Pressable
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddWardrobeItem')}
                >
                    <Text style={styles.addBtnText}>Add item</Text>
                </Pressable>
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>У вас ще немає речей — додайте першу</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.itemCard}>
                            <Image source={{ uri: item.imageUrl }} style={styles.image} />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>{item.category}</Text>
                            </View>
                            <Pressable
                                style={[styles.deleteBtn, deletingId === item.id && styles.disabledBtn]}
                                disabled={deletingId === item.id}
                                onPress={() => handleDelete(item)}
                            >
                                <Text style={styles.deleteBtnText}>
                                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                                </Text>
                            </Pressable>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#0b0b0b' },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b0b0b',
        padding: 16,
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: { color: '#fff', fontSize: 24, fontWeight: '700' },
    addBtn: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    addBtnText: { color: '#fff', fontWeight: '700' },
    listContent: { gap: 10, paddingBottom: 16 },
    itemCard: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        backgroundColor: '#121212',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    image: {
        width: 64,
        height: 64,
        borderRadius: 10,
        backgroundColor: '#1c1c1c',
    },
    itemInfo: { flex: 1, gap: 4 },
    itemName: { color: '#fff', fontWeight: '700', fontSize: 16 },
    itemMeta: { color: '#aaa', fontSize: 12 },
    deleteBtn: {
        borderWidth: 1,
        borderColor: '#ff6b6b',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    deleteBtnText: { color: '#ff6b6b', fontWeight: '700' },
    disabledBtn: { opacity: 0.6 },
    emptyBox: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        backgroundColor: '#121212',
        padding: 16,
    },
    emptyText: { color: '#aaa' },
    errorText: { color: '#ff6b6b', textAlign: 'center' },
    actionBtn: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    actionBtnText: { color: '#000', fontWeight: '700' },
});
