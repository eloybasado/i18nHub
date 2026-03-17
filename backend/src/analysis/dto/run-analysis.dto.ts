import { IsOptional, IsUUID } from 'class-validator';

export class RunAnalysisDto {
  @IsOptional()
  @IsUUID()
  fileGroupId?: string;
}