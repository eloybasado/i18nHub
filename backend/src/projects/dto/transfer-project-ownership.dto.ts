import { IsUUID } from 'class-validator';

export class TransferProjectOwnershipDto {
  @IsUUID()
  newOwnerUserId!: string;
}
