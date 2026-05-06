import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [RecommendationsController],
    providers: [RecommendationsService],
})
export class RecommendationsModule { }
