import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateProjectVersionHistoryLimitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  versionHistoryLimit!: number;
}
