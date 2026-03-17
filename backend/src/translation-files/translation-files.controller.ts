import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { IngestTranslationFilesDto } from './dto/ingest-translation-files.dto';
import { TranslationFilesService } from './translation-files.service';

@Controller('projects/:projectId/translation-files')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class TranslationFilesController {
  constructor(
    private readonly translationFilesService: TranslationFilesService,
  ) {}

  @Post('ingest')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  ingest(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: IngestTranslationFilesDto,
  ) {
    return this.translationFilesService.ingest(projectId, dto);
  }

  @Get()
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  list(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.translationFilesService.listByProject(projectId);
  }

  @Delete(':translationFileId')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  remove(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('translationFileId', new ParseUUIDPipe()) translationFileId: string,
  ) {
    return this.translationFilesService.remove(projectId, translationFileId);
  }
}
