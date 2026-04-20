import { API_BASE_URL } from '../config';
import { fetchWithTimeout } from './fetchWithTimeout';
import { toAbsoluteUrl } from '../config';
import type { WardrobeCategory } from './wardrobe';

export type RecommendationFromWardrobeItem = {
    id: string;
    name: string;
    category: WardrobeCategory | string;
    imageUrl: string;
};

export type RecommendationMissingItem = {
    category: WardrobeCategory | string;
    label: string;
    suggestion: string;
};

export type AiRecommendationResponse = {
    id: string;
    createdAt: string;
    city: string;
    recommended: string[];
    fromWardrobe: RecommendationFromWardrobeItem[];
    missing: RecommendationMissingItem[];
    reasons: string[];
    userComment?: string | null;
    userRating?: number | null;
};

export type RecommendationHistoryItem = {
    id: string;
    city: string;
    createdAt: string;
    summary: string[];
    hasComment: boolean;
    userRating: number | null;
};

export async function fetchAiRecommendation(
    accessToken: string,
    weather: {
        city?: string;
        temperature?: number;
        feelsLike?: number;
        windSpeed?: number;
        precipitationMm?: number;
        description?: string;
    },
): Promise<AiRecommendationResponse> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/recommendations/generate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                city: weather.city?.trim() || 'Unknown',
                temperature: weather.temperature,
                feelsLike: weather.feelsLike,
                windSpeed: weather.windSpeed,
                precipitationMm: weather.precipitationMm,
                description: weather.description,
            }),
        },
        15000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to load AI recommendation');
    }

    const payload = await response.json();

    const normalizeList = (value: unknown): string[] => {
        if (Array.isArray(value)) {
            return value
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean)
                .slice(0, 10);
        }

        if (typeof value === 'string') {
            return value
                .split(/\n|;|\.|•|\*/g)
                .map((item) => item.trim())
                .filter((item) => item.length > 1)
                .slice(0, 10);
        }

        return [];
    };

    const normalizeFromWardrobe = (value: unknown): RecommendationFromWardrobeItem[] => {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((item) => {
                if (!item || typeof item !== 'object') {
                    return null;
                }

                const candidate = item as Record<string, unknown>;
                const id = typeof candidate.id === 'string' ? candidate.id : '';
                const name = typeof candidate.name === 'string' ? candidate.name : '';
                const category = typeof candidate.category === 'string' ? candidate.category : 'TOPS';
                const imageUrl = typeof candidate.imageUrl === 'string' ? toAbsoluteUrl(candidate.imageUrl) : '';

                if (!id || !name) {
                    return null;
                }

                return {
                    id,
                    name,
                    category,
                    imageUrl,
                };
            })
            .filter((item): item is RecommendationFromWardrobeItem => Boolean(item));
    };

    const normalizeMissing = (value: unknown): RecommendationMissingItem[] => {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((item) => {
                if (!item || typeof item !== 'object') {
                    return null;
                }

                const candidate = item as Record<string, unknown>;
                const category = typeof candidate.category === 'string' ? candidate.category : 'TOPS';
                const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
                const suggestion = typeof candidate.suggestion === 'string' ? candidate.suggestion.trim() : '';

                return {
                    category,
                    label: label || 'Рекомендована категорія',
                    suggestion: suggestion || 'Додай базову річ у цій категорії.',
                };
            })
            .filter((item): item is RecommendationMissingItem => Boolean(item));
    };

    return {
        id: typeof payload?.id === 'string' ? payload.id : '',
        createdAt: typeof payload?.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
        city: typeof payload?.city === 'string' ? payload.city : weather.city?.trim() || 'Unknown',
        recommended: normalizeList(payload?.recommended),
        fromWardrobe: normalizeFromWardrobe(payload?.fromWardrobe),
        missing: normalizeMissing(payload?.missing),
        reasons: normalizeList(payload?.reasons),
        userComment: typeof payload?.userComment === 'string' ? payload.userComment : null,
        userRating: typeof payload?.userRating === 'number' ? payload.userRating : null,
    };
}

export async function fetchRecommendationHistory(
    accessToken: string,
    limit = 20,
): Promise<RecommendationHistoryItem[]> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/recommendations/history?limit=${encodeURIComponent(String(limit))}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        15000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to load recommendation history');
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const row = item as Record<string, unknown>;
            const id = typeof row.id === 'string' ? row.id : '';
            if (!id) {
                return null;
            }

            const summary = Array.isArray(row.summary)
                ? row.summary.map((line) => (typeof line === 'string' ? line.trim() : '')).filter(Boolean)
                : [];

            return {
                id,
                city: typeof row.city === 'string' ? row.city : 'Unknown',
                createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
                summary,
                hasComment: Boolean(row.hasComment),
                userRating: typeof row.userRating === 'number' ? row.userRating : null,
            };
        })
        .filter((item): item is RecommendationHistoryItem => Boolean(item));
}

export async function fetchRecommendationHistoryDetails(
    accessToken: string,
    recommendationId: string,
): Promise<AiRecommendationResponse> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/recommendations/history/${recommendationId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        15000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to load recommendation details');
    }

    const payload = await response.json();

    return {
        id: typeof payload?.id === 'string' ? payload.id : recommendationId,
        createdAt: typeof payload?.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
        city: typeof payload?.city === 'string' ? payload.city : 'Unknown',
        recommended: Array.isArray(payload?.recommended)
            ? payload.recommended.map((line: unknown) => (typeof line === 'string' ? line.trim() : '')).filter(Boolean)
            : [],
        fromWardrobe: Array.isArray(payload?.fromWardrobe)
            ? payload.fromWardrobe
                .map((item: unknown) => {
                    if (!item || typeof item !== 'object') {
                        return null;
                    }

                    const row = item as Record<string, unknown>;
                    const id = typeof row.id === 'string' ? row.id : '';
                    const name = typeof row.name === 'string' ? row.name : '';
                    if (!id || !name) {
                        return null;
                    }

                    return {
                        id,
                        name,
                        category: typeof row.category === 'string' ? row.category : 'TOPS',
                        imageUrl: toAbsoluteUrl(typeof row.imageUrl === 'string' ? row.imageUrl : ''),
                    };
                })
                .filter((item: RecommendationFromWardrobeItem | null): item is RecommendationFromWardrobeItem => Boolean(item))
            : [],
        missing: Array.isArray(payload?.missing)
            ? payload.missing
                .map((item: unknown) => {
                    if (!item || typeof item !== 'object') {
                        return null;
                    }

                    const row = item as Record<string, unknown>;
                    return {
                        category: typeof row.category === 'string' ? row.category : 'TOPS',
                        label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : 'Рекомендована категорія',
                        suggestion:
                            typeof row.suggestion === 'string' && row.suggestion.trim()
                                ? row.suggestion.trim()
                                : 'Додай базову річ у цій категорії.',
                    };
                })
                .filter((item: RecommendationMissingItem | null): item is RecommendationMissingItem => Boolean(item))
            : [],
        reasons: Array.isArray(payload?.reasons)
            ? payload.reasons.map((line: unknown) => (typeof line === 'string' ? line.trim() : '')).filter(Boolean)
            : [],
        userComment: typeof payload?.userComment === 'string' ? payload.userComment : null,
        userRating: typeof payload?.userRating === 'number' ? payload.userRating : null,
    };
}

export async function saveRecommendationFeedback(
    accessToken: string,
    recommendationId: string,
    comment: string,
    rating?: number | null,
): Promise<{ id: string; userComment: string | null; userRating: number | null; commentedAt: string | null; feedbackAt: string | null; saved: boolean }> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/recommendations/${recommendationId}/comment`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ comment, rating }),
        },
        15000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save recommendation comment');
    }

    const payload = await response.json();

    return {
        id: typeof payload?.id === 'string' ? payload.id : recommendationId,
        userComment: typeof payload?.userComment === 'string' ? payload.userComment : null,
        userRating: typeof payload?.userRating === 'number' ? payload.userRating : null,
        commentedAt: typeof payload?.commentedAt === 'string' ? payload.commentedAt : null,
        feedbackAt: typeof payload?.feedbackAt === 'string' ? payload.feedbackAt : null,
        saved: Boolean(payload?.saved),
    };
}
