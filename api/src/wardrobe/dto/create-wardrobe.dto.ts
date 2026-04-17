import { IsString, IsEnum, IsOptional } from 'class-validator';
import { WardrobeCategory } from '@prisma/client';

export class CreateWardrobeDto {
    @IsString()
    name: string;

    @IsEnum(WardrobeCategory)
    category: WardrobeCategory;

    @IsOptional()
    @IsString()
    tags?: string;
}
