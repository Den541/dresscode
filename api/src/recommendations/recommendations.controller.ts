import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { RecommendationsService } from './recommendations.service';
import { GenerateRecommendationV2Dto } from './dto/generate-recommendation-v2.dto';
import { ListHistoryDto } from './dto/list-history.dto';
import { SaveRecommendationCommentDto } from './dto/save-recommendation-comment.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
    constructor(private readonly recommendationsService: RecommendationsService) { }

    @Post('generate')
    generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateRecommendationV2Dto) {
        return this.recommendationsService.generate(user.userId, dto);
    }

    @Get('history')
    listHistory(@CurrentUser() user: AuthUser, @Query() query: ListHistoryDto) {
        return this.recommendationsService.listHistory(user.userId, query.limit);
    }

    @Get('history/:id')
    getHistoryDetails(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.recommendationsService.getHistoryDetails(user.userId, id);
    }

    @Post(':id/comment')
    saveComment(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() dto: SaveRecommendationCommentDto,
    ) {
        return this.recommendationsService.saveComment(user.userId, id, dto.comment, dto.rating);
    }
}
