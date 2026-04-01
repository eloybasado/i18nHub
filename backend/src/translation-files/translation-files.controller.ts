import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types';
import { ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { CloneTranslationFileDto } from './dto/clone-translation-file.dto';
import { IngestTranslationFilesDto } from './dto/ingest-translation-files.dto';
import { UpdateTranslationFileContentDto } from './dto/update-translation-file-content.dto';
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

  @Get(':translationFileId')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  getById(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('translationFileId', new ParseUUIDPipe()) translationFileId: string,
  ) {
    return this.translationFilesService.getById(projectId, translationFileId);
  }

  @Get(':translationFileId/versions')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  listVersions(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('translationFileId', new ParseUUIDPipe()) translationFileId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.translationFilesService.listVersions(
      projectId,
      translationFileId,
      request.user,
    );
  }

  @Patch(':translationFileId/versions/:versionId/restore')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  restoreVersion(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('translationFileId', new ParseUUIDPipe()) translationFileId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.translationFilesService.restoreVersion(
      projectId,
      translationFileId,
      versionId,
      request.user,
    );
  }

  @Patch(':translationFileId/content')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  updateContent(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('translationFileId', new ParseUUIDPipe()) translationFileId: string,
    @Body() dto: UpdateTranslationFileContentDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.translationFilesService.updateContent(
      projectId,
      translationFileId,
      dto,
      request.user,
    );
  }

  @Post('clone')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  clone(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CloneTranslationFileDto,
  ) {
    return this.translationFilesService.cloneToLanguage(projectId, dto);
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
