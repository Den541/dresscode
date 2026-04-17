import { IsString, IsEnum, IsOptional } from 'class-validator';
import { WardrobeCategory } from '@prisma/client';

export class CreateWardrobeDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(WardrobeCategory)
    category?: WardrobeCategory;

    @IsOptional()
    @IsString()
    tags?: string;
}
