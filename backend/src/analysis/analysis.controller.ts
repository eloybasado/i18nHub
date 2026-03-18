import {
  Body,
  Controller,
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
import { AnalysisService } from './analysis.service';
import { RunAnalysisDto } from './dto/run-analysis.dto';

@Controller('projects/:projectId/analysis')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('run')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  run(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: RunAnalysisDto,
  ) {
    return this.analysisService.run(projectId, dto);
  }

  @Get('reports/:reportId')
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  getReport(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
  ) {
    return this.analysisService.getReport(projectId, reportId);
  }
}
