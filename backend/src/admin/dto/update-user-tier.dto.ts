import { Tier } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserTierDto {
  @IsEnum(Tier)
  tier: Tier;
}
