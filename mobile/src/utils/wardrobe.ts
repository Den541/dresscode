import { API_BASE_URL, toAbsoluteUrl } from '../config';
import { fetchWithTimeout } from './fetchWithTimeout';

export type WardrobeCategory =
    | 'OUTERWEAR'
    | 'TOPS'
    | 'BOTTOMS'
    | 'SHOES'
    | 'ACCESSORIES';

export const WARDROBE_CATEGORY_LABELS: Record<WardrobeCategory, string> = {
    OUTERWEAR: 'Куртки',
    TOPS: 'Верхній одяг',
    BOTTOMS: 'Штани',
    SHOES: 'Взуття',
    ACCESSORIES: 'Аксесуари',
};

export type WardrobeItem = {
    id: string;
    name: string;
    category: WardrobeCategory;
    tags: string[];
    imageUrl: string;
    aiAnalysis?: {
        suggestedName?: string;
        suggestedCategory?: WardrobeCategory;
        summary?: string;
        styleTags?: string[];
        seasonTags?: string[];
        warmthLevel?: number;
        colorTags?: string[];
        recommendationNotes?: string[];
    } | null;
    aiAnalyzedAt?: string | null;
    createdAt: string;
};

export function normalizeWardrobeItem(item: any): WardrobeItem {
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        tags: Array.isArray(item.tags) ? item.tags : [],
        imageUrl: toAbsoluteUrl(item.imageUrl),
        aiAnalysis: item.aiAnalysis ?? null,
        aiAnalyzedAt: item.aiAnalyzedAt ?? null,
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

export async function reanalyzeWardrobeItem(
    accessToken: string,
    itemId: string,
    comment?: string,
): Promise<Pick<WardrobeItem, 'id' | 'name' | 'category' | 'aiAnalysis' | 'aiAnalyzedAt'>> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/ai/wardrobe-items/${itemId}/analyze`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                ...(comment?.trim() ? { comment: comment.trim() } : {}),
            }),
        },
        20000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to reanalyze item');
    }

    const payload = await response.json();
    return {
        id: payload?.id,
        name: payload?.name,
        category: payload?.category,
        aiAnalysis: payload?.aiAnalysis ?? null,
        aiAnalyzedAt: payload?.aiAnalyzedAt ?? null,
    };
}
