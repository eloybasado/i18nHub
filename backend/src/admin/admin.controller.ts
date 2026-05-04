import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateProjectDto } from '../projects/dto/update-project.dto';
import { AdminService } from './admin.service';
import { UpdateUserTierDto } from './dto/update-user-tier.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('q') q?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const pp = perPage ? Math.max(1, parseInt(perPage, 10) || 20) : 20;
    return this.adminService.listUsers({ page: p, perPage: pp, q: q?.trim() });
  }

  @Patch('users/:userId/tier')
  updateUserTier(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserTierDto,
  ) {
    return this.adminService.updateUserTier(userId, dto);
  }

  @Get('projects')
  listProjects(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('q') q?: string,
  ) {
    const p = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const pp = perPage ? Math.max(1, parseInt(perPage, 10) || 20) : 20;
    return this.adminService.listProjects({
      page: p,
      perPage: pp,
      q: q?.trim(),
    });
  }

  @Patch('projects/:projectId')
  updateProject(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.adminService.updateProject(projectId, dto);
  }

  @Delete('projects/:projectId')
  deleteProject(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.adminService.deleteProject(projectId);
  }
}
