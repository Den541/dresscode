import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { extname } from 'path';

const WARDROBE_CATEGORIES = ['OUTERWEAR', 'TOPS', 'BOTTOMS', 'SHOES', 'ACCESSORIES'] as const;
type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export type AiItemAnalysis = {
    suggestedName: string;
    suggestedCategory: WardrobeCategory;
    summary: string;
    styleTags: string[];
    seasonTags: string[];
    warmthLevel: number;
    colorTags: string[];
    recommendationNotes: string[];
};

export type AiRecommendation = {
    outfitSummary: string;
    chosenItems: string[];
    reasoning: string[];
    weatherFit: string;
    wardrobeFit: string;
};

@Injectable()
export class AiService {
    private readonly client: OpenAI | null;
    private readonly model: string;
    private readonly allowedCategories = WARDROBE_CATEGORIES;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        this.model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
        this.client = apiKey ? new OpenAI({ apiKey }) : null;
    }

    async analyzeWardrobeItem(input: {
        name?: string;
        category?: string;
        tags?: string[];
        imagePath?: string;
        existingNames?: string[];
        userComment?: string;
        weather?: {
            temperature?: number;
            description?: string;
        };
    }): Promise<AiItemAnalysis> {
        if (!this.client || !input.imagePath) {
            return this.buildFallbackItemAnalysis(input);
        }

        const client = this.getClient();
        const imageDataUrl = await this.toImageDataUrl(input.imagePath);
        const existingNamesText = (input.existingNames ?? []).slice(0, 30).join(', ') || 'none';

        const prompt = [
            'Проаналізуй фото одного предмета одягу та поверни лише JSON.',
            'Потрібні ключі: suggestedName, suggestedCategory, summary, styleTags, seasonTags, warmthLevel, colorTags, recommendationNotes.',
            'suggestedName має бути короткою, природною і не дублювати вже наявні назви у гардеробі.',
            'suggestedCategory має бути лише одним із: OUTERWEAR, TOPS, BOTTOMS, SHOES, ACCESSORIES.',
            'Якщо на фото штани, джинси, брюки, шорти, легінси або спідниця — обов’язково вибирай BOTTOMS.',
            'Якщо на фото футболка, сорочка, світшот, худі, светр або топ — вибирай TOPS.',
            'Якщо фото нечітке, обирай найбільш імовірну категорію, але не вигадуй зайвого.',
            'warmthLevel має бути цілим числом від 0 до 10.',
            'Усі текстові значення повертай українською, крім коду категорії.',
            `Name hint: ${input.name?.trim() || 'none'}`,
            `Category hint: ${input.category?.trim() || 'none'}`,
            `Tags: ${(input.tags ?? []).join(', ') || 'none'}`,
            `Existing wardrobe names to avoid: ${existingNamesText}`,
            input.userComment?.trim() ? `Коментар користувача (має високий пріоритет): ${input.userComment.trim()}` : '',
            input.weather?.temperature !== undefined ? `Weather temperature context: ${input.weather.temperature}` : '',
            input.weather?.description ? `Weather description context: ${input.weather.description}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        try {
            const response = await client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Ти фешн-аналітик. Повертаєш лише компактний JSON. Відповідай українською.',
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageDataUrl } },
                        ] as any,
                    },
                ],
                response_format: { type: 'json_object' },
            } as any);

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return this.buildFallbackItemAnalysis(input);
            }

            return this.normalizeItemAnalysis(this.safeParseJson<Partial<AiItemAnalysis>>(content, 'item analysis'), input);
        } catch (error) {
            return this.buildFallbackItemAnalysis(input);
        }
    }

    async generateRecommendation(input: {
        weather: {
            temperature?: number;
            description?: string;
            windSpeed?: number;
            precipitationMm?: number;
        };
        wardrobeItems: Array<{
            name: string;
            category: string;
            tags?: string[];
            aiAnalysis?: AiItemAnalysis | null;
        }>;
        userPreferences?: {
            style?: string;
            coldSensitivity?: number;
            favoriteCats?: string[];
        };
    }): Promise<AiRecommendation> {
        if (!this.client) {
            return this.buildFallbackRecommendation(input);
        }

        const client = this.getClient();

        const prompt = [
            'Згенеруй чітку, живу і практичну рекомендацію образу лише у форматі JSON.',
            'Потрібні ключі: outfitSummary, chosenItems, reasoning, weatherFit, wardrobeFit.',
            'Використовуй лише речі з переданого гардеробу.',
            'chosenItems мають бути точними назвами речей із гардеробу, від найважливішої до менш важливої.',
            'Результат має бути повністю українською, зрозумілий і без англійських фраз.',
            'Обов’язково враховуй холодочутливість: додатнє значення означає, що людині холодніше, від’ємне — тепліше.',
            `Пояснення по coldSensitivity: ${this.getColdSensitivityGuidance(input.userPreferences?.coldSensitivity)}`,
            `Weather: ${JSON.stringify(input.weather)}`,
            `Preferences: ${JSON.stringify(input.userPreferences ?? {})}`,
            `Wardrobe items: ${JSON.stringify(input.wardrobeItems)}`,
        ].join('\n');

        try {
            const response = await client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Ти стиліст. Повертаєш лише компактний JSON і пишеш українською.',
                    },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
            } as any);

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return this.buildFallbackRecommendation(input);
            }

            return this.normalizeRecommendation(
                this.safeParseJson<Partial<AiRecommendation>>(content, 'recommendation'),
                input,
            );
        } catch (error) {
            return this.buildFallbackRecommendation(input);
        }
    }

    private getClient(): OpenAI {
        if (!this.client) {
            throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
        }

        return this.client;
    }

    private buildFallbackItemAnalysis(input: {
        name?: string;
        category?: string;
        tags?: string[];
        imagePath?: string;
        existingNames?: string[];
        weather?: {
            temperature?: number;
            description?: string;
        };
    }): AiItemAnalysis {
        const warmthByCategory: Record<string, number> = {
            OUTERWEAR: 8,
            TOPS: 4,
            BOTTOMS: 4,
            SHOES: 5,
            ACCESSORIES: 3,
        };

        const category = this.normalizeCategory(input.category);
        const tags = input.tags ?? [];
        const baseName = input.name?.trim() || this.buildReadableFallbackName(category);
        const uniqueName = this.makeUniqueName(baseName, input.existingNames ?? []);

        return {
            suggestedName: uniqueName,
            suggestedCategory: category,
            summary: `${uniqueName} is categorized as ${category.toLowerCase()} and can be used in everyday outfits.`,
            styleTags: tags.length > 0 ? tags.slice(0, 3) : [category.toLowerCase()],
            seasonTags: ['all-season'],
            warmthLevel: warmthByCategory[category] ?? 4,
            colorTags: [],
            recommendationNotes: ['Generated via local fallback analyzer.'],
        };
    }

    private buildFallbackRecommendation(input: {
        weather: {
            temperature?: number;
            description?: string;
            windSpeed?: number;
            precipitationMm?: number;
        };
        wardrobeItems: Array<{
            name: string;
            category: string;
            tags?: string[];
            aiAnalysis?: AiItemAnalysis | null;
        }>;
        userPreferences?: {
            style?: string;
            coldSensitivity?: number;
            favoriteCats?: string[];
        };
    }): AiRecommendation {
        const grouped = new Map<string, string[]>();

        for (const item of input.wardrobeItems) {
            const key = item.category.toUpperCase();
            const existing = grouped.get(key) ?? [];
            existing.push(item.name);
            grouped.set(key, existing);
        }

        const pick = (category: string) => grouped.get(category)?.[0];
        const chosenItems = [
            pick('OUTERWEAR'),
            pick('TOPS'),
            pick('BOTTOMS'),
            pick('SHOES'),
            pick('ACCESSORIES'),
        ].filter((item): item is string => Boolean(item));

        const temperature = input.weather.temperature ?? 20;
        const coldSensitivity = input.userPreferences?.coldSensitivity ?? 0;
        const adjustedTemperature = temperature - coldSensitivity;
        const weatherFit =
            adjustedTemperature <= 5
                ? 'Надворі холодно — зроби акцент на теплих шарах і верхньому одязі.'
                : adjustedTemperature <= 15
                    ? 'Прохолодна погода — найкраще працюють легкі шари.'
                    : 'Тепла погода — обирай легкі та дихаючі речі.';

        return {
            outfitSummary:
                chosenItems.length > 0
                    ? `Одягни ${chosenItems.slice(0, 3).join(', ')} — це збалансований образ для поточної погоди.`
                    : 'У гардеробі ще немає достатньо речей для повного образу. Додай ще кілька позицій.',
            chosenItems,
            reasoning: [
                weatherFit,
                `Холодочутливість: ${coldSensitivity > 0 ? '+' : ''}${coldSensitivity} (скоригована температура: ${adjustedTemperature.toFixed(1)}°C).`,
                `Використано ${input.wardrobeItems.length} речей із гардеробу як кандидати для образу.`,
                'Рекомендацію згенеровано локально як резервний варіант.',
            ],
            weatherFit,
            wardrobeFit:
                chosenItems.length > 0
                    ? 'Рекомендація побудована на доступних категоріях гардеробу.'
                    : 'Гардероб замалий для повного підбору образу.',
        };
    }

    private safeParseJson<T>(content: string, label: string): T {
        try {
            return JSON.parse(content) as T;
        } catch (error) {
            throw new InternalServerErrorException(`Failed to parse AI ${label} response`);
        }
    }

    private normalizeItemAnalysis(
        analysis: Partial<AiItemAnalysis>,
        input: {
            name?: string;
            category?: string;
            existingNames?: string[];
        },
    ): AiItemAnalysis {
        const inferredCategory = this.inferCategoryFromText(
            [analysis.suggestedName, analysis.summary, ...(analysis.recommendationNotes ?? []), input.name, input.category]
                .filter(Boolean)
                .join(' '),
        );
        const category = inferredCategory ?? this.normalizeCategory(analysis.suggestedCategory ?? input.category);
        const suggestedName = this.makeUniqueName(
            analysis.suggestedName?.trim() || input.name?.trim() || this.buildReadableFallbackName(category),
            input.existingNames ?? [],
        );

        return {
            suggestedName,
            suggestedCategory: category,
            summary: analysis.summary?.trim() || `${suggestedName} fits well into a modern wardrobe.`,
            styleTags: this.normalizeStringArray(analysis.styleTags, [category.toLowerCase()]),
            seasonTags: this.normalizeStringArray(analysis.seasonTags, ['all-season']),
            warmthLevel: this.normalizeWarmthLevel(analysis.warmthLevel, category),
            colorTags: this.normalizeStringArray(analysis.colorTags, []),
            recommendationNotes: this.normalizeStringArray(
                analysis.recommendationNotes,
                ['AI analyzed from photo.'],
            ),
        };
    }

    private normalizeCategory(value?: string): WardrobeCategory {
        const normalized = (value ?? 'TOPS').toUpperCase();
        return this.allowedCategories.includes(normalized as WardrobeCategory)
            ? (normalized as WardrobeCategory)
            : 'TOPS';
    }

    private normalizeWarmthLevel(value: unknown, category: WardrobeCategory): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.min(10, Math.max(0, Math.round(value)));
        }

        const warmthByCategory: Record<WardrobeCategory, number> = {
            OUTERWEAR: 8,
            TOPS: 4,
            BOTTOMS: 4,
            SHOES: 5,
            ACCESSORIES: 3,
        };

        return warmthByCategory[category] ?? 4;
    }

    private normalizeStringArray(value: unknown, fallback: string[]): string[] {
        if (!Array.isArray(value)) {
            return fallback;
        }

        const normalized = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
            .slice(0, 6);

        return normalized.length > 0 ? normalized : fallback;
    }

    private normalizeRecommendation(
        recommendation: Partial<AiRecommendation>,
        input: {
            weather: {
                temperature?: number;
                description?: string;
                windSpeed?: number;
                precipitationMm?: number;
            };
            wardrobeItems: Array<{
                name: string;
                category: string;
                tags?: string[];
                aiAnalysis?: AiItemAnalysis | null;
            }>;
            userPreferences?: {
                style?: string;
                coldSensitivity?: number;
                favoriteCats?: string[];
            };
        },
    ): AiRecommendation {
        const wardrobeNames = new Set(input.wardrobeItems.map((item) => item.name.trim()));
        const chosenItems = this.normalizeTextList(recommendation.chosenItems, [])
            .map((name) => name.trim())
            .filter((name) => wardrobeNames.has(name));

        const fallback = this.buildFallbackRecommendation(input);

        return {
            outfitSummary: (recommendation.outfitSummary ?? '').trim() || fallback.outfitSummary,
            chosenItems: chosenItems.length > 0 ? chosenItems : fallback.chosenItems,
            reasoning: this.normalizeTextList(recommendation.reasoning, fallback.reasoning),
            weatherFit: (recommendation.weatherFit ?? '').trim() || fallback.weatherFit,
            wardrobeFit: (recommendation.wardrobeFit ?? '').trim() || fallback.wardrobeFit,
        };
    }

    private getColdSensitivityGuidance(coldSensitivity?: number): string {
        const value = coldSensitivity ?? 0;

        if (value >= 4) {
            return 'Дуже чутлива до холоду: додавай теплі шари раніше, навіть за помірної температури.';
        }

        if (value >= 2) {
            return 'Чутлива до холоду: бажано тепліший верх і додатковий шар.';
        }

        if (value <= -4) {
            return 'Добре переносить холод: можна легший верх порівняно зі стандартною рекомендацією.';
        }

        if (value <= -2) {
            return 'Менш чутлива до холоду: допускається полегшений образ.';
        }

        return 'Нейтральна чутливість: стандартний підбір за температурою.';
    }

    private normalizeTextList(value: unknown, fallback: string[]): string[] {
        if (Array.isArray(value)) {
            const normalized = value
                .map((item) => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean)
                .slice(0, 10);

            return normalized.length > 0 ? normalized : fallback;
        }

        if (typeof value === 'string') {
            const normalized = value
                .split(/\n|;|\.|•|\*/g)
                .map((item) => item.trim())
                .filter((item) => item.length > 1)
                .slice(0, 10);

            return normalized.length > 0 ? normalized : fallback;
        }

        return fallback;
    }

    private buildReadableFallbackName(category: WardrobeCategory): string {
        const names: Record<WardrobeCategory, string> = {
            OUTERWEAR: 'Куртка',
            TOPS: 'Футболка',
            BOTTOMS: 'Штани',
            SHOES: 'Взуття',
            ACCESSORIES: 'Аксесуар',
        };

        return names[category] ?? 'Річ';
    }

    private makeUniqueName(baseName: string, existingNames: string[]): string {
        const normalizedExisting = new Set(existingNames.map((name) => name.toLowerCase().trim()));
        let candidate = baseName.trim() || 'Річ';

        if (!normalizedExisting.has(candidate.toLowerCase())) {
            return candidate;
        }

        let suffix = 2;
        while (normalizedExisting.has(`${candidate} ${suffix}`.toLowerCase())) {
            suffix += 1;
        }

        return `${candidate} ${suffix}`;
    }

    private inferCategoryFromText(text: string): WardrobeCategory | null {
        const normalized = text.toLowerCase();

        const buckets: Array<{ category: WardrobeCategory; keywords: string[] }> = [
            {
                category: 'BOTTOMS',
                keywords: [
                    'штани',
                    'брюки',
                    'джинси',
                    'джинс',
                    'легінс',
                    'легінси',
                    'шорти',
                    'спідниц',
                    'trouser',
                    'pant',
                    'jean',
                    'legging',
                    'short',
                    'skirt',
                ],
            },
            {
                category: 'TOPS',
                keywords: [
                    'футболк',
                    'сорочк',
                    'светр',
                    'кофт',
                    'худі',
                    'світшот',
                    'майк',
                    'топ',
                    'shirt',
                    'tee',
                    't-shirt',
                    'sweater',
                    'hoodie',
                    'top',
                ],
            },
            {
                category: 'OUTERWEAR',
                keywords: ['куртк', 'пальт', 'пуховик', 'жакет', 'блейзер', 'coat', 'jacket', 'parka', 'blazer'],
            },
            {
                category: 'SHOES',
                keywords: ['взутт', 'кросівк', 'кеди', 'черевик', 'ботин', 'shoe', 'sneaker', 'boot'],
            },
            {
                category: 'ACCESSORIES',
                keywords: ['аксесуар', 'шапк', 'шарф', 'ремінь', 'сумк', 'cap', 'hat', 'scarf', 'belt', 'bag'],
            },
        ];

        for (const bucket of buckets) {
            if (bucket.keywords.some((keyword) => normalized.includes(keyword))) {
                return bucket.category;
            }
        }

        return null;
    }

    private async toImageDataUrl(imagePath: string): Promise<string> {
        const fileBuffer = await readFile(imagePath);
        const mimeType = this.getMimeType(imagePath);
        return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }

    private getMimeType(imagePath: string): string {
        const ext = extname(imagePath).toLowerCase();
        if (ext === '.png') {
            return 'image/png';
        }

        return 'image/jpeg';
    }
}
