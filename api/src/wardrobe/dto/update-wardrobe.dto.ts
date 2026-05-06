import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateWardrobeDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    warmthLevel?: number;
}
