import { Body, Controller, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { AnalyzeWardrobeItemDto } from './dto/analyze-wardrobe-item.dto';
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto';
import { join } from 'path';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('wardrobe-items/:id/analyze')
  async analyzeItem(
    @CurrentUser() user: any,
    @Param('id') itemId: string,
    @Body() dto: AnalyzeWardrobeItemDto,
  ) {
    const db = this.prisma as any;
    const item = await db.wardrobeItem.findFirst({
      where: { id: itemId, userId: user.userId },
    });

    if (!item) {
      throw new NotFoundException('Wardrobe item not found');
    }

    const aiAnalysis = await this.aiService.analyzeWardrobeItem({
      name: item.name,
      category: item.category,
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      imagePath: join(process.cwd(), 'uploads', item.imageUrl.split('/').pop() ?? ''),
      existingNames: [],
      userComment: dto.comment,
      weather: {
        temperature: dto.temperature,
        description: dto.description,
      },
    });

    const updated = await db.wardrobeItem.update({
      where: { id: item.id },
      data: {
        name: aiAnalysis.suggestedName,
        category: aiAnalysis.suggestedCategory,
        aiAnalysis,
        aiAnalyzedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      aiAnalysis: updated.aiAnalysis,
      aiAnalyzedAt: updated.aiAnalyzedAt,
    };
  }

  @Post('recommendation')
  async generateRecommendation(
    @CurrentUser() user: any,
    @Body() dto: GenerateRecommendationDto,
  ) {
    const db = this.prisma as any;
    const profile: any = await db.user.findUnique({
      where: { id: user.userId },
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
            name: true,
            category: true,
            tags: true,
            aiAnalysis: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    const favoriteCats = Array.isArray(profile.preferences?.favoriteCats)
      ? (profile.preferences.favoriteCats as string[])
      : [];

    const recommendation = await this.aiService.generateRecommendation({
      weather: {
        temperature: dto.temperature,
        description: dto.description,
        windSpeed: dto.windSpeed,
        precipitationMm: dto.precipitationMm,
      },
      wardrobeItems: profile.wardrobeItems.map((item) => ({
        name: item.name,
        category: item.category,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        aiAnalysis: item.aiAnalysis as any,
      })),
      userPreferences: {
        style: profile.preferences?.style,
        coldSensitivity: profile.preferences?.coldSensitivity,
        favoriteCats,
      },
    });

    return {
      wardrobeCount: profile.wardrobeItems.length,
      recommendation,
    };
  }
}
