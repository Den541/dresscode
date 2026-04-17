import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    FlatList,
    Image,
    Alert,
    ScrollView,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
    deleteWardrobeItem,
    fetchWardrobeItems,
    reanalyzeWardrobeItem,
    WardrobeItem,
    WardrobeCategory,
    WARDROBE_CATEGORY_LABELS,
} from '../utils/wardrobe';

type Props = { navigation: any };

type FilterValue = 'ALL' | WardrobeCategory;

const FILTERS: Array<{ label: string; value: FilterValue }> = [
    { label: 'Увесь одяг', value: 'ALL' },
    { label: 'Верхній одяг', value: 'TOPS' },
    { label: 'Куртки', value: 'OUTERWEAR' },
    { label: 'Штани', value: 'BOTTOMS' },
    { label: 'Взуття', value: 'SHOES' },
    { label: 'Аксесуари', value: 'ACCESSORIES' },
];

export default function WardrobeScreen({ navigation }: Props) {
    const { accessToken, refreshAccessToken } = useAuth();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterValue>('ALL');
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [analysisComment, setAnalysisComment] = useState('');
    const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

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

    const visibleItems = useMemo(() => {
        if (selectedFilter === 'ALL') {
            return items;
        }

        return items.filter((item) => item.category === selectedFilter);
    }, [items, selectedFilter]);

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

    const handleOpenItem = (item: WardrobeItem) => {
        setSelectedItem(item);
        setAnalysisComment('');
    };

    const handleReanalyze = async () => {
        if (!selectedItem) {
            return;
        }

        if (!accessToken) {
            setError('Not authenticated');
            return;
        }

        try {
            setReanalyzingId(selectedItem.id);

            let tokenToUse = accessToken;

            const run = async (token: string) =>
                reanalyzeWardrobeItem(token, selectedItem.id, analysisComment);

            let updatedItem: Pick<WardrobeItem, 'id' | 'name' | 'category' | 'aiAnalysis' | 'aiAnalyzedAt'>;
            try {
                updatedItem = await run(tokenToUse);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to reanalyze item';
                const isUnauthorized = message.toLowerCase().includes('unauthorized');
                if (!isUnauthorized) {
                    throw err;
                }

                const nextAccessToken = await refreshAccessToken();
                if (!nextAccessToken) {
                    throw new Error('Session expired. Please login again.');
                }

                tokenToUse = nextAccessToken;
                updatedItem = await run(tokenToUse);
            }

            setItems((prev) =>
                prev.map((item) =>
                    item.id === selectedItem.id
                        ? {
                              ...item,
                              name: updatedItem.name,
                              category: updatedItem.category,
                              aiAnalysis: updatedItem.aiAnalysis ?? null,
                              aiAnalyzedAt: updatedItem.aiAnalyzedAt ?? null,
                          }
                        : item,
                ),
            );

            setSelectedItem((prev) =>
                prev
                    ? {
                          ...prev,
                          name: updatedItem.name,
                          category: updatedItem.category,
                          aiAnalysis: updatedItem.aiAnalysis ?? null,
                          aiAnalyzedAt: updatedItem.aiAnalyzedAt ?? null,
                      }
                    : prev,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reanalyze item';
            setError(message);
        } finally {
            setReanalyzingId(null);
        }
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

    const renderHeader = () => (
        <>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Гардероб</Text>
                <Pressable
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddWardrobeItem')}
                >
                    <Text style={styles.addBtnText}>Додати річ</Text>
                </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
                {FILTERS.map((filter) => (
                    <Pressable
                        key={filter.value}
                        style={[
                            styles.filterChip,
                            selectedFilter === filter.value && styles.filterChipActive,
                        ]}
                        onPress={() => setSelectedFilter(filter.value)}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                selectedFilter === filter.value && styles.filterChipTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={visibleItems}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>
                            {selectedFilter === 'ALL'
                                ? 'У вас ще немає речей — додайте першу'
                                : 'У цій категорії поки немає речей'}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustContentInsets={false}
                renderItem={({ item }) => (
                    <View style={styles.itemCard}>
                        <Pressable style={styles.itemMain} onPress={() => handleOpenItem(item)}>
                            <Image source={{ uri: item.imageUrl }} style={styles.image} />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemMeta}>
                                    {WARDROBE_CATEGORY_LABELS[item.category] ?? item.category}
                                </Text>
                                {item.aiAnalysis?.summary ? (
                                    <Text style={styles.aiText} numberOfLines={2}>
                                        AI: {item.aiAnalysis.summary}
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
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

            <Modal
                visible={Boolean(selectedItem)}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedItem(null)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.modalKeyboardWrap}
                        >
                    <View style={styles.modalCard}>
                        {selectedItem ? (
                            <>
                                <Image source={{ uri: selectedItem.imageUrl }} style={styles.modalImage} />
                                <Text style={styles.modalTitle} numberOfLines={2}>{selectedItem.name}</Text>
                                <Text style={styles.modalMeta}>
                                    {WARDROBE_CATEGORY_LABELS[selectedItem.category] ?? selectedItem.category}
                                </Text>

                                <ScrollView
                                    style={styles.modalScroll}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled
                                    contentContainerStyle={styles.modalScrollContent}
                                >
                                    {selectedItem.aiAnalysis?.summary ? (
                                        <Text style={styles.modalText}>Опис: {selectedItem.aiAnalysis.summary}</Text>
                                    ) : (
                                        <Text style={styles.modalText}>Опис поки недоступний.</Text>
                                    )}

                                    {selectedItem.aiAnalysis?.styleTags?.length ? (
                                        <Text style={styles.modalText}>
                                            Стиль: {selectedItem.aiAnalysis.styleTags.join(', ')}
                                        </Text>
                                    ) : null}

                                    {selectedItem.aiAnalysis?.seasonTags?.length ? (
                                        <Text style={styles.modalText}>
                                            Сезонність: {selectedItem.aiAnalysis.seasonTags.join(', ')}
                                        </Text>
                                    ) : null}

                                    {typeof selectedItem.aiAnalysis?.warmthLevel === 'number' ? (
                                        <Text style={styles.modalText}>
                                            Рівень тепла: {selectedItem.aiAnalysis.warmthLevel}/10
                                        </Text>
                                    ) : null}

                                    {selectedItem.aiAnalysis?.colorTags?.length ? (
                                        <Text style={styles.modalText}>
                                            Кольори: {selectedItem.aiAnalysis.colorTags.join(', ')}
                                        </Text>
                                    ) : null}

                                    {selectedItem.aiAnalysis?.recommendationNotes?.length ? (
                                        <Text style={styles.modalText}>
                                            Нотатки: {selectedItem.aiAnalysis.recommendationNotes.join('; ')}
                                        </Text>
                                    ) : null}

                                    <Text style={styles.modalSectionTitle}>Коментар для AI</Text>
                                    <TextInput
                                        style={styles.commentInput}
                                        value={analysisComment}
                                        onChangeText={setAnalysisComment}
                                        placeholder="Наприклад: це спортивна кофта, тонка, носиться поверх футболки"
                                        placeholderTextColor="#777"
                                        multiline
                                        editable={reanalyzingId !== selectedItem.id}
                                    />
                                    <Text style={styles.modalHint}>
                                        Додай уточнення, якщо AI некоректно визначив тип або характеристики.
                                    </Text>
                                </ScrollView>

                                <Pressable
                                    style={[styles.modalSecondaryBtn, reanalyzingId === selectedItem.id && styles.disabledBtn]}
                                    onPress={handleReanalyze}
                                    disabled={reanalyzingId === selectedItem.id}
                                >
                                    <Text style={styles.modalSecondaryBtnText}>
                                        {reanalyzingId === selectedItem.id ? 'Оновлення...' : 'Оновити характеристику AI'}
                                    </Text>
                                </Pressable>

                                <Pressable style={styles.modalBtn} onPress={() => setSelectedItem(null)}>
                                    <Text style={styles.modalBtnText}>Закрити</Text>
                                </Pressable>
                            </>
                        ) : null}
                    </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    filtersRow: {
        gap: 8,
        paddingBottom: 6,
        alignItems: 'center',
        marginBottom: 2,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 999,
        paddingHorizontal: 16,
        height: 42,
        backgroundColor: '#121212',
        marginRight: 8,
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    filterChipText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
    filterChipTextActive: { color: '#000' },
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
    itemMain: {
        flex: 1,
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
    aiText: { color: '#9bd1ff', fontSize: 12, lineHeight: 16 },
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    modalKeyboardWrap: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        maxHeight: '82%',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    modalImage: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        backgroundColor: '#1c1c1c',
        marginBottom: 12,
    },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
    modalMeta: { color: '#9bd1ff', fontSize: 13, marginTop: 4, marginBottom: 10 },
    modalScroll: { maxHeight: 260 },
    modalScrollContent: { paddingBottom: 4 },
    modalText: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 8 },
    modalSectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 6 },
    commentInput: {
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 10,
        color: '#fff',
        backgroundColor: '#0f0f0f',
        minHeight: 74,
        textAlignVertical: 'top',
    },
    modalHint: { color: '#9aa0a6', fontSize: 12, marginTop: 6, lineHeight: 16 },
    modalSecondaryBtn: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#0f0f0f',
    },
    modalSecondaryBtnText: { color: '#fff', fontWeight: '700' },
    modalBtn: {
        marginTop: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 12,
    },
    modalBtnText: { color: '#000', fontWeight: '700' },
});
