import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AnalyzeWardrobeItemDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    temperature?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    comment?: string;
}
