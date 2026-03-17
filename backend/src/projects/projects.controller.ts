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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types';
import { ProjectRoles } from '../common/decorators/project-roles.decorator';
import { ProjectRoleGuard } from '../common/guards/project-role.guard';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateProjectDto) {
    const user = req.user as JwtPayload;
    return this.projectsService.create(user.sub, dto);
  }

  @Get()
  list(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.projectsService.listForUser(user.sub);
  }

  @Get(':id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Post(':id/members')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  addMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(id, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.remove(id);
  }
}
