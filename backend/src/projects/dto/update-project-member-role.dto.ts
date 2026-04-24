import { ProjectRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProjectMemberRoleDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
