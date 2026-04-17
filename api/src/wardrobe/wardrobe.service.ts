import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWardrobeDto } from './dto/create-wardrobe.dto';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class WardrobeService {
    constructor(private prisma: PrismaService) { }

    async createItem(
        userId: string,
        createWardrobeDto: CreateWardrobeDto,
        imageFilename: string,
    ) {
        const imageUrl = `/uploads/${imageFilename}`;
        const parsedTags = createWardrobeDto.tags
            ? createWardrobeDto.tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [];

        return this.prisma.wardrobeItem.create({
            data: {
                userId,
                name: createWardrobeDto.name,
                category: createWardrobeDto.category,
                tags: parsedTags,
                imageUrl,
            },
        });
    }

    async getUserItems(userId: string) {
        return this.prisma.wardrobeItem.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                category: true,
                tags: true,
                imageUrl: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteItem(userId: string, itemId: string) {
        const item = await this.prisma.wardrobeItem.findFirst({
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
        return this.prisma.wardrobeItem.delete({
            where: { id: itemId },
        });
    }
}
