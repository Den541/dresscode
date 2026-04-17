import { API_BASE_URL, toAbsoluteUrl } from '../config';
import { fetchWithTimeout } from './fetchWithTimeout';

export type WardrobeCategory =
    | 'OUTERWEAR'
    | 'TOPS'
    | 'BOTTOMS'
    | 'SHOES'
    | 'ACCESSORIES';

export type WardrobeItem = {
    id: string;
    name: string;
    category: WardrobeCategory;
    tags: string[];
    imageUrl: string;
    createdAt: string;
};

export function normalizeWardrobeItem(item: any): WardrobeItem {
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        tags: Array.isArray(item.tags) ? item.tags : [],
        imageUrl: toAbsoluteUrl(item.imageUrl),
        createdAt: item.createdAt,
    };
}

export async function fetchWardrobeItems(accessToken: string): Promise<WardrobeItem[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/wardrobe`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }, 10000);

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to load wardrobe');
    }

    const items = await response.json();
    return Array.isArray(items) ? items.map(normalizeWardrobeItem) : [];
}

export async function deleteWardrobeItem(accessToken: string, itemId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/wardrobe/${itemId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }, 10000);

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete item');
    }
}
