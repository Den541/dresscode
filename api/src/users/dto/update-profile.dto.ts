import { Style } from '@prisma/client';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(80)
    name?: string;

    @IsOptional()
    @IsEnum(Style)
    style?: Style;

    @IsOptional()
    @IsInt()
    @Min(-5)
    @Max(5)
    coldSensitivity?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    favoriteCats?: string[];
}
