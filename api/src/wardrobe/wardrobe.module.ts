import { Module } from '@nestjs/common';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';
import { BgRemovalService } from './bg-removal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [PrismaModule, AiModule],
    controllers: [WardrobeController],
    providers: [WardrobeService, BgRemovalService],
})
export class WardrobeModule { }
