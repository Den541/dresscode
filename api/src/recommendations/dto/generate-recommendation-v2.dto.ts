import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateRecommendationV2Dto {
    @IsString()
    @MinLength(1)
    city: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    temperature?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    feelsLike?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    windSpeed?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    precipitationMm?: number;

    @IsOptional()
    @IsString()
    description?: string;
}
