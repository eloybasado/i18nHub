import { ProjectRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class AddProjectMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
