import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateRecommendationDto {
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
