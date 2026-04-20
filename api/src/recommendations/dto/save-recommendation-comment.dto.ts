import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MaxLength, MinLength } from 'class-validator';

export class SaveRecommendationCommentDto {
    @IsString()
    @MinLength(2)
    @MaxLength(500)
    comment: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;
}
