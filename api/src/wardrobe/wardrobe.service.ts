import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWardrobeDto } from './dto/create-wardrobe.dto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AiService, AiItemAnalysis } from '../ai/ai.service';
import { BgRemovalService } from './bg-removal.service';

const WARDROBE_CATEGORIES = ['OUTERWEAR', 'TOPS', 'BOTTOMS', 'SHOES', 'ACCESSORIES'] as const;
type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

@Injectable()
export class WardrobeService {
    constructor(
        private prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly bgRemovalService: BgRemovalService,
    ) { }

    async createItem(
        userId: string,
        createWardrobeDto: CreateWardrobeDto,
        imageFilename: string,
    ) {
        const db = this.prisma as any;
        const imageUrl = `/uploads/${imageFilename}`;
        const imagePath = join(process.cwd(), 'uploads', imageFilename);
        const parsedTags = createWardrobeDto.tags
            ? createWardrobeDto.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [];

        const existingItems = await db.wardrobeItem.findMany({
            where: { userId },
            select: { name: true },
        });
        const existingNames = existingItems.map((item) => item.name).filter(Boolean);

        const fallbackAnalysis: AiItemAnalysis = {
            suggestedName: createWardrobeDto.name?.trim() || 'Річ',
            suggestedCategory: this.resolveCategory(createWardrobeDto.category),
            summary: `${createWardrobeDto.name?.trim() || 'Річ'} — item for everyday outfits.`,
            styleTags: [this.resolveCategory(createWardrobeDto.category).toLowerCase()],
            seasonTags: ['all-season'],
            warmthLevel: this.resolveCategory(createWardrobeDto.category) === 'OUTERWEAR' ? 8 : 4,
            colorTags: [],
            recommendationNotes: ['Added from manual wardrobe upload.'],
        };

        let aiAnalysis = fallbackAnalysis;

        try {
            aiAnalysis = await this.aiService.analyzeWardrobeItem({
                name: createWardrobeDto.name,
                category: createWardrobeDto.category,
                tags: parsedTags,
                imagePath,
                existingNames,
            });
        } catch (error) {
            console.warn('AI item analysis failed, using fallback analysis:', error);
        }

        const resolvedCategory = this.resolveCategory(
            createWardrobeDto.category ?? aiAnalysis.suggestedCategory,
        );
        const resolvedName = this.makeUniqueName(
            createWardrobeDto.name?.trim() || aiAnalysis.suggestedName,
            existingNames,
        );

        const imageUrlNoBg = await this.bgRemovalService.removeBackground(imagePath);

        return db.wardrobeItem.create({
            data: {
                userId,
                name: resolvedName,
                category: resolvedCategory,
                tags: parsedTags,
                imageUrl,
                imageUrlNoBg,
                aiAnalysis,
                aiAnalyzedAt: new Date(),
            },
        });
    }

    async getUserItems(userId: string) {
        const db = this.prisma as any;
        return db.wardrobeItem.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                category: true,
                tags: true,
                imageUrl: true,
                imageUrlNoBg: true,
                aiAnalysis: true,
                aiAnalyzedAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async processExistingBackgrounds(userId: string): Promise<{ processed: number; skipped: number; failed: number }> {
        const db = this.prisma as any;

        if (!this.bgRemovalService.isEnabled) {
            return { processed: 0, skipped: 0, failed: 0 };
        }

        const items = await db.wardrobeItem.findMany({
            where: { userId, imageUrlNoBg: null },
            select: { id: true, imageUrl: true },
        });

        let processed = 0;
        let failed = 0;

        for (const item of items) {
            const filename = item.imageUrl.split('/').pop();
            if (!filename) { failed++; continue; }

            const imagePath = join(process.cwd(), 'uploads', filename);
            const noBgUrl = await this.bgRemovalService.removeBackground(imagePath);

            if (noBgUrl) {
                await db.wardrobeItem.update({
                    where: { id: item.id },
                    data: { imageUrlNoBg: noBgUrl },
                });
                processed++;
            } else {
                failed++;
            }
        }

        return { processed, skipped: 0, failed };
    }

    async updateItem(userId: string, itemId: string, dto: { warmthLevel?: number }) {
        const db = this.prisma as any;
        const item = await db.wardrobeItem.findFirst({ where: { id: itemId, userId } });
        if (!item) throw new NotFoundException('Wardrobe item not found');

        const updatedAnalysis = {
            ...(item.aiAnalysis ?? {}),
            ...(typeof dto.warmthLevel === 'number' ? { warmthLevel: dto.warmthLevel } : {}),
        };

        return db.wardrobeItem.update({
            where: { id: itemId },
            data: { aiAnalysis: updatedAnalysis },
        });
    }

    async deleteItem(userId: string, itemId: string) {
        const db = this.prisma as any;
        const item = await db.wardrobeItem.findFirst({
            where: { id: itemId, userId },
        });

        if (!item) {
            return null;
        }

        // Delete file from upload directory
        if (item.imageUrl) {
            const filename = item.imageUrl.split('/').pop();
            if (filename) {
                const filePath = join(process.cwd(), 'uploads', filename);

                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    // Log but don't throw - file might already be deleted
                    console.warn(`Could not delete file: ${filePath}`, error);
                }
            }
        }

        // Delete DB record
        return db.wardrobeItem.delete({
            where: { id: itemId },
        });
    }

    private resolveCategory(category?: string): WardrobeCategory {
        const normalized = (category ?? 'TOPS').toUpperCase();
        return WARDROBE_CATEGORIES.includes(normalized as WardrobeCategory)
            ? (normalized as WardrobeCategory)
            : 'TOPS';
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
}
