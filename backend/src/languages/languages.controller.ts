import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CreateLanguageDto } from './dto/create-language.dto';
import { SetReferenceLanguageDto } from './dto/set-reference-language.dto';
import { LanguagesService } from './languages.service';

@Controller('projects/:projectId/languages')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateLanguageDto,
  ) {
    return this.languagesService.create(projectId, dto);
  }

  @Get()
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  list(@Param('projectId') projectId: string) {
    return this.languagesService.listByProject(projectId);
  }

  @Patch('reference')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  setReference(
    @Param('projectId') projectId: string,
    @Body() dto: SetReferenceLanguageDto,
  ) {
    return this.languagesService.setReferenceLanguage(
      projectId,
      dto.languageId,
    );
  }
}
