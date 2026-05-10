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
import { TransferProjectOwnershipDto } from './dto/transfer-project-ownership.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { UpdateProjectVersionHistoryLimitDto } from './dto/update-project-version-history-limit.dto';
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

  @Patch(':id/version-history-limit')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  updateVersionHistoryLimit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectVersionHistoryLimitDto,
  ) {
    return this.projectsService.updateVersionHistoryLimit(id, dto);
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

  @Get(':id/members')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  listMembers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.listMembers(id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  updateMemberRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateProjectMemberRoleDto,
  ) {
    return this.projectsService.updateMemberRole(id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.projectsService.removeMember(id, userId);
  }

  @Post(':id/members/leave')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.VIEWER)
  leaveProject(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = req.user as JwtPayload;
    return this.projectsService.leaveProject(id, user.sub);
  }

  @Post(':id/ownership/transfer')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  transferOwnership(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransferProjectOwnershipDto,
  ) {
    const user = req.user as JwtPayload;
    return this.projectsService.transferOwnership(id, user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectRoleGuard)
  @ProjectRoles(ProjectRole.OWNER)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.remove(id);
  }
}
