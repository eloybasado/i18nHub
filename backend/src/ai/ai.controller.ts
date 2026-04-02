import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
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
import { AiService } from './ai.service';
import { SuggestTranslationsDto } from './dto/suggest-translations.dto';

@Controller('projects/:projectId/ai')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggestions/batch')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  suggestBatch(
    @Param('projectId', new ParseUUIDPipe()) _projectId: string,
    @Body() dto: SuggestTranslationsDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.aiService.suggestTranslations(request.user, dto);
  }
}
