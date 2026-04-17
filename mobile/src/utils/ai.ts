import { API_BASE_URL } from '../config';
import { fetchWithTimeout } from './fetchWithTimeout';

export type AiRecommendationResponse = {
    wardrobeCount: number;
    recommendation: {
        outfitSummary: string;
        chosenItems: string[];
        reasoning: string[];
        weatherFit: string;
        wardrobeFit: string;
    };
};

export async function fetchAiRecommendation(
    accessToken: string,
    weather: {
        temperature?: number;
        feelsLike?: number;
        windSpeed?: number;
        precipitationMm?: number;
        description?: string;
    },
): Promise<AiRecommendationResponse> {
    const response = await fetchWithTimeout(
        `${API_BASE_URL}/ai/recommendation`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(weather),
        },
        15000,
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to load AI recommendation');
    }

    const payload = await response.json();
    const recommendation = payload?.recommendation ?? {};

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

    return {
        wardrobeCount: Number(payload?.wardrobeCount ?? 0),
        recommendation: {
            outfitSummary:
                typeof recommendation?.outfitSummary === 'string' && recommendation.outfitSummary.trim()
                    ? recommendation.outfitSummary.trim()
                    : 'Рекомендація формується на основі вашого гардеробу та погоди.',
            chosenItems: normalizeList(recommendation?.chosenItems),
            reasoning: normalizeList(recommendation?.reasoning),
            weatherFit:
                typeof recommendation?.weatherFit === 'string' && recommendation.weatherFit.trim()
                    ? recommendation.weatherFit.trim()
                    : 'Погода врахована у підборі образу.',
            wardrobeFit:
                typeof recommendation?.wardrobeFit === 'string' && recommendation.wardrobeFit.trim()
                    ? recommendation.wardrobeFit.trim()
                    : 'Гардероб врахований у рекомендації.',
        },
    };
}
