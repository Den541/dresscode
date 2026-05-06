import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GenerateRecommendationV2Dto } from './dto/generate-recommendation-v2.dto';
import { join } from 'path';

type WardrobeCategory = 'OUTERWEAR' | 'TOPS' | 'BOTTOMS' | 'SHOES' | 'ACCESSORIES';

@Injectable()
export class RecommendationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    async generate(userId: string, dto: GenerateRecommendationV2Dto) {
        const db = this.prisma as any;

        const recentFeedbackRows = await db.recommendation.findMany({
            where: {
                userId,
                OR: [
                    { userComment: { not: null } },
                    { userRating: { not: null } },
                ],
            },
            orderBy: { commentedAt: 'desc' },
            take: 5,
            select: {
                userComment: true,
                userRating: true,
            },
        });

        const recentFeedback = recentFeedbackRows.map((row: { userComment?: string | null; userRating?: number | null }) => ({
            comment: typeof row.userComment === 'string' ? row.userComment.trim() : '',
            rating: typeof row.userRating === 'number' ? row.userRating : null,
        }));

        const recentComments = recentFeedback.map((row) => row.comment).filter(Boolean);

        const feedbackProfile = this.buildFeedbackProfile(recentFeedback);

        const profile = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                preferences: {
                    select: {
                        style: true,
                        coldSensitivity: true,
                        favoriteCats: true,
                    },
                },
                wardrobeItems: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        imageUrl: true,
                        imageUrlNoBg: true,
                        aiAnalysis: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!profile) {
            throw new NotFoundException('User not found');
        }

        const weatherSnapshot = {
            city: dto.city,
            temperature: dto.temperature,
            feelsLike: dto.feelsLike,
            windSpeed: dto.windSpeed,
            precipitationMm: dto.precipitationMm,
            description: dto.description,
        };

        const preferencesSnapshot = {
            style: profile.preferences?.style ?? 'CASUAL',
            coldSensitivity: profile.preferences?.coldSensitivity ?? 0,
            favoriteCats: Array.isArray(profile.preferences?.favoriteCats)
                ? (profile.preferences.favoriteCats as string[])
                : [],
        };

        const requiredCategories = this.buildRequiredCategories(
            weatherSnapshot,
            preferencesSnapshot.coldSensitivity,
            feedbackProfile,
        );
        const adjustedTemperature =
            (weatherSnapshot.feelsLike ?? weatherSnapshot.temperature ?? 18) -
            (preferencesSnapshot.coldSensitivity ?? 0) -
            (feedbackProfile?.prefersWarmer ? 2 : feedbackProfile?.prefersLighter ? -2 : 0);

        const { fromWardrobeItems, selectedCategories } = this.pickWardrobeItems(
            profile.wardrobeItems,
            requiredCategories,
            adjustedTemperature,
        );

        const missingCategories = requiredCategories.filter((category) => !selectedCategories.has(category));
        const missingItems = missingCategories.map((category) => ({
            category,
            label: this.categoryLabel(category),
            suggestion: this.categorySuggestion(category, weatherSnapshot.temperature, weatherSnapshot.precipitationMm),
        }));

        const recommended = requiredCategories.map((category) =>
            this.recommendedLine(category, weatherSnapshot.temperature, weatherSnapshot.precipitationMm),
        );

        const reasons = this.buildReasons(
            weatherSnapshot,
            preferencesSnapshot.coldSensitivity,
            requiredCategories,
            fromWardrobeItems.length,
            feedbackProfile,
            recentComments,
        );

        // Generate outfit image via GPT-4o Vision → DALL-E 3 (non-blocking on failure)
        let outfitImageUrl: string | null = null;
        if (fromWardrobeItems.length > 0) {
            const imageItems = fromWardrobeItems
                .filter((i) => i.imageUrl)
                .map((i) => ({
                    name: i.name,
                    category: i.category,
                    imagePath: join(process.cwd(), 'uploads', i.imageUrl.split('/').pop()!),
                }));

            outfitImageUrl = await this.aiService.generateOutfitImage(imageItems).catch(() => null);
        }

        const saved = await db.recommendation.create({
            data: {
                userId,
                city: dto.city,
                weatherSnapshot,
                preferencesSnapshot,
                recommendedItems: recommended,
                fromWardrobeItems,
                missingItems,
                reasons,
                selectedWardrobeItemIds: fromWardrobeItems.map((item) => item.id),
                outfitImageUrl,
                userRating: null,
                feedbackAt: null,
            },
        });

        return {
            id: saved.id,
            createdAt: saved.createdAt,
            city: dto.city,
            weatherSnapshot,
            preferencesSnapshot,
            recommended,
            fromWardrobe: fromWardrobeItems,
            missing: missingItems,
            reasons,
            outfitImageUrl,
            userComment: null,
            userRating: null,
            saved: true,
        };
    }

    async listHistory(userId: string, limit?: number) {
        const db = this.prisma as any;
        const rows = await db.recommendation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit ?? 20,
            select: {
                id: true,
                city: true,
                createdAt: true,
                recommendedItems: true,
                outfitImageUrl: true,
                userComment: true,
                userRating: true,
            },
        });

        return rows.map((row) => ({
            id: row.id,
            city: row.city,
            createdAt: row.createdAt,
            summary: this.normalizeStringArray(row.recommendedItems).slice(0, 2),
            outfitImageUrl: typeof row.outfitImageUrl === 'string' ? row.outfitImageUrl : null,
            hasComment: typeof row.userComment === 'string' && row.userComment.trim().length > 0,
            userRating: typeof row.userRating === 'number' ? row.userRating : null,
        }));
    }

    async getHistoryDetails(userId: string, recommendationId: string) {
        const db = this.prisma as any;
        const row = await db.recommendation.findFirst({
            where: {
                id: recommendationId,
                userId,
            },
            select: {
                id: true,
                city: true,
                createdAt: true,
                weatherSnapshot: true,
                preferencesSnapshot: true,
                recommendedItems: true,
                fromWardrobeItems: true,
                missingItems: true,
                reasons: true,
                outfitImageUrl: true,
                userComment: true,
                userRating: true,
            },
        });

        if (!row) {
            throw new NotFoundException('Recommendation history record not found');
        }

        return {
            id: row.id,
            city: row.city,
            createdAt: row.createdAt,
            weatherSnapshot: row.weatherSnapshot,
            preferencesSnapshot: row.preferencesSnapshot,
            recommended: this.normalizeStringArray(row.recommendedItems),
            fromWardrobe: this.normalizeObjectArray(row.fromWardrobeItems),
            missing: this.normalizeObjectArray(row.missingItems),
            reasons: this.normalizeStringArray(row.reasons),
            outfitImageUrl: typeof row.outfitImageUrl === 'string' ? row.outfitImageUrl : null,
            userComment: typeof row.userComment === 'string' ? row.userComment : null,
            userRating: typeof row.userRating === 'number' ? row.userRating : null,
        };
    }

    async deleteOne(userId: string, recommendationId: string) {
        const db = this.prisma as any;
        const row = await db.recommendation.findFirst({
            where: { id: recommendationId, userId },
            select: { id: true },
        });

        if (!row) {
            throw new NotFoundException('Recommendation history record not found');
        }

        await db.recommendation.delete({ where: { id: recommendationId } });
        return { deleted: 1 };
    }

    async clearHistory(userId: string) {
        const db = this.prisma as any;
        const result = await db.recommendation.deleteMany({ where: { userId } });
        return { deleted: result.count };
    }

    async saveComment(userId: string, recommendationId: string, comment: string, rating?: number) {
        const db = this.prisma as any;
        const normalizedComment = comment.trim();

        const row = await db.recommendation.findFirst({
            where: {
                id: recommendationId,
                userId,
            },
            select: { id: true },
        });

        if (!row) {
            throw new NotFoundException('Recommendation history record not found');
        }

        const updated = await db.recommendation.update({
            where: {
                id: recommendationId,
            },
            data: {
                userComment: normalizedComment,
                userRating: typeof rating === 'number' ? rating : null,
                commentedAt: new Date(),
                feedbackAt: new Date(),
            },
            select: {
                id: true,
                userComment: true,
                userRating: true,
                commentedAt: true,
                feedbackAt: true,
            },
        });

        return {
            id: updated.id,
            userComment: updated.userComment,
            userRating: updated.userRating,
            commentedAt: updated.commentedAt,
            feedbackAt: updated.feedbackAt,
            saved: true,
        };
    }

    private buildRequiredCategories(
        weather: {
            temperature?: number;
            feelsLike?: number;
            windSpeed?: number;
            precipitationMm?: number;
        },
        coldSensitivity: number,
        feedbackProfile?: { prefersWarmer: boolean; prefersLighter: boolean; dislikesRainExposure: boolean },
    ): WardrobeCategory[] {
        const baseTemperature = weather.feelsLike ?? weather.temperature ?? 18;
        const feedbackColdOffset = feedbackProfile?.prefersWarmer ? 2 : feedbackProfile?.prefersLighter ? -2 : 0;
        const adjustedTemperature = baseTemperature - coldSensitivity - feedbackColdOffset;
        const windSpeed = weather.windSpeed ?? 0;
        const precipitationMm = weather.precipitationMm ?? 0;

        const required = new Set<WardrobeCategory>(['TOPS', 'BOTTOMS', 'SHOES']);

        if (adjustedTemperature <= 14 || windSpeed >= 8 || precipitationMm > 0.3 || feedbackProfile?.dislikesRainExposure) {
            required.add('OUTERWEAR');
        }

        if (adjustedTemperature <= 6 || windSpeed >= 12) {
            required.add('ACCESSORIES');
        }

        if (adjustedTemperature >= 24 && required.has('OUTERWEAR')) {
            required.delete('OUTERWEAR');
        }

        return Array.from(required);
    }

    private pickWardrobeItems(
        wardrobeItems: Array<{
            id: string;
            name: string;
            category: WardrobeCategory;
            imageUrl: string;
            imageUrlNoBg?: string | null;
            aiAnalysis?: unknown;
        }>,
        requiredCategories: WardrobeCategory[],
        adjustedTemperature: number,
    ) {
        type ItemWithNoBg = { id: string; name: string; category: WardrobeCategory; imageUrl: string; imageUrlNoBg?: string | null };

        // idealWarmth: -10°C→10, 0°C→8, 10°C→6, 20°C→4, 30°C→2
        const idealWarmth = Math.max(1, Math.min(10, 10 - (adjustedTemperature + 10) * 0.2));

        const fallbackWarmth: Record<WardrobeCategory, number> = {
            OUTERWEAR: 8, TOPS: 4, BOTTOMS: 4, SHOES: 5, ACCESSORIES: 3,
        };

        const getWarmth = (item: { category: WardrobeCategory; aiAnalysis?: unknown }): number => {
            const analysis = item.aiAnalysis as Record<string, unknown> | null | undefined;
            const level = analysis?.warmthLevel;
            return typeof level === 'number' && level >= 0 && level <= 10
                ? level
                : fallbackWarmth[item.category] ?? 4;
        };

        const byCategory = new Map<WardrobeCategory, Array<ItemWithNoBg>>();

        for (const item of wardrobeItems) {
            const existing = byCategory.get(item.category) ?? [];
            existing.push(item);
            byCategory.set(item.category, existing);
        }

        const fromWardrobeItems: Array<ItemWithNoBg> = [];
        const selectedCategories = new Set<WardrobeCategory>();

        for (const category of requiredCategories) {
            const candidates = byCategory.get(category);
            if (!candidates?.length) continue;

            // Sort by closeness to idealWarmth — pick the best-matched item
            const best = candidates.slice().sort(
                (a, b) => Math.abs(getWarmth(a) - idealWarmth) - Math.abs(getWarmth(b) - idealWarmth),
            )[0];

            fromWardrobeItems.push(best);
            selectedCategories.add(category);
        }

        return { fromWardrobeItems, selectedCategories };
    }

    private buildReasons(
        weather: {
            temperature?: number;
            feelsLike?: number;
            windSpeed?: number;
            precipitationMm?: number;
            description?: string;
        },
        coldSensitivity: number,
        requiredCategories: WardrobeCategory[],
        fromWardrobeCount: number,
        feedbackProfile?: { prefersWarmer: boolean; prefersLighter: boolean; dislikesRainExposure: boolean },
        recentComments?: string[],
    ) {
        const baseTemperature = weather.feelsLike ?? weather.temperature;
        const lines: string[] = [];

        if (typeof baseTemperature === 'number') {
            lines.push(`Відчутна температура: ${baseTemperature.toFixed(1)}°C.`);
        }

        if (typeof weather.windSpeed === 'number' && weather.windSpeed > 0) {
            lines.push(`Швидкість вітру: ${weather.windSpeed.toFixed(1)} м/с.`);
        }

        if (typeof weather.precipitationMm === 'number' && weather.precipitationMm > 0) {
            lines.push(`Опади: ${weather.precipitationMm.toFixed(1)} мм, тому додано захист від вологи.`);
        }

        lines.push(`Холодочутливість: ${coldSensitivity > 0 ? '+' : ''}${coldSensitivity}.`);

        if (feedbackProfile?.prefersWarmer) {
            lines.push('Враховано ваші попередні коментарі: додаємо тепліші шари.');
        }

        if (feedbackProfile?.prefersLighter) {
            lines.push('Враховано ваші попередні коментарі: зменшуємо зайві теплі шари.');
        }

        if (feedbackProfile?.dislikesRainExposure) {
            lines.push('Враховано ваші попередні коментарі щодо опадів: додаємо захист від вологи.');
        }

        if (recentComments && recentComments.length > 0) {
            lines.push(`Використано ${Math.min(recentComments.length, 5)} останніх коментарів для персоналізації.`);
        }

        lines.push(`Потрібні категорії: ${requiredCategories.map((category) => this.categoryLabel(category)).join(', ')}.`);
        lines.push(`Із гардеробу підібрано ${fromWardrobeCount} позицій.`);

        return lines;
    }

    private categoryLabel(category: WardrobeCategory) {
        const labels: Record<WardrobeCategory, string> = {
            OUTERWEAR: 'Куртка / верхній шар',
            TOPS: 'Верх (футболка/худі/сорочка)',
            BOTTOMS: 'Низ (штани/джинси)',
            SHOES: 'Взуття',
            ACCESSORIES: 'Аксесуари',
        };

        return labels[category];
    }

    private categorySuggestion(
        category: WardrobeCategory,
        temperature?: number,
        precipitationMm?: number,
    ) {
        if (category === 'OUTERWEAR') {
            if ((precipitationMm ?? 0) > 0.3) {
                return 'Додай вітро- та вологостійку куртку.';
            }
            if ((temperature ?? 18) <= 8) {
                return 'Додай теплу куртку або пуховик.';
            }
            return 'Додай легку куртку або вітровку.';
        }

        if (category === 'TOPS') {
            return 'Додай базовий верх: футболку, лонгслів або худі.';
        }

        if (category === 'BOTTOMS') {
            return 'Додай універсальні штани або джинси.';
        }

        if (category === 'SHOES') {
            return (precipitationMm ?? 0) > 0.3
                ? 'Додай закрите водостійке взуття.'
                : 'Додай зручне повсякденне взуття.';
        }

        return 'Додай аксесуари для тепла та комфорту (шапка, шарф, рукавички).';
    }

    private recommendedLine(
        category: WardrobeCategory,
        temperature?: number,
        precipitationMm?: number,
    ) {
        if (category === 'OUTERWEAR') {
            if ((precipitationMm ?? 0) > 0.3) {
                return 'Верхній шар: вітро- та вологостійка куртка.';
            }
            if ((temperature ?? 18) <= 8) {
                return 'Верхній шар: тепла куртка або пуховик.';
            }
            return 'Верхній шар: легка куртка/вітровка.';
        }

        if (category === 'TOPS') {
            return 'Базовий верх: футболка/лонгслів/худі.';
        }

        if (category === 'BOTTOMS') {
            return 'Низ: зручні штани або джинси.';
        }

        if (category === 'SHOES') {
            return (precipitationMm ?? 0) > 0.3
                ? 'Взуття: закрите, бажано водостійке.'
                : 'Взуття: закрите повсякденне.';
        }

        return 'Аксесуари: за потреби шапка/шарф/рукавички.';
    }

    private normalizeStringArray(value: unknown): string[] {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
    }

    private normalizeObjectArray(value: unknown): Array<Record<string, unknown>> {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>;
    }

    private buildFeedbackProfile(feedbackRows: Array<{ comment: string; rating: number | null }>) {
        const normalized = feedbackRows.map((row) => row.comment.toLowerCase()).join(' ');
        const avgRating = this.averageRating(feedbackRows.map((row) => row.rating).filter((rating): rating is number => typeof rating === 'number'));

        const warmSignals = ['холодно', 'прохолодно', 'замерз', 'мерзну', 'тепліше', 'замерзла'];
        const lightSignals = ['жарко', 'спекотно', 'занадто тепло', 'легше', 'перегрів'];
        const rainSignals = ['дощ', 'мокро', 'промок', 'промокли', 'волог', 'калюж'];

        const hasAny = (signals: string[]) => signals.some((signal) => normalized.includes(signal));

        const lowRatingBias = typeof avgRating === 'number' && avgRating > 0 && avgRating <= 2.5;
        const highRatingBias = typeof avgRating === 'number' && avgRating >= 4.2;

        return {
            prefersWarmer: hasAny(warmSignals) || lowRatingBias,
            prefersLighter: hasAny(lightSignals) || highRatingBias,
            dislikesRainExposure: hasAny(rainSignals) || lowRatingBias,
            avgRating,
        };
    }

    private averageRating(ratings: number[]) {
        if (ratings.length === 0) {
            return null;
        }

        const total = ratings.reduce((sum, rating) => sum + rating, 0);
        return total / ratings.length;
    }
}
