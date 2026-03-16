import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '@prisma/client';
import { JwtPayload } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import { PROJECT_ROLES_KEY } from '../decorators/project-roles.decorator';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      params?: { id?: string; projectId?: string };
      body?: { projectId?: string };
    }>();

    const userId = request.user?.sub;
    const projectId =
      request.params?.id ??
      request.params?.projectId ??
      request.body?.projectId;

    if (!userId || !projectId) {
      throw new ForbiddenException('Missing project context');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('Project not accessible');
    }

    const effectiveRole: ProjectRole | null =
      project.ownerId === userId
        ? ProjectRole.OWNER
        : (project.members[0]?.role ?? null);

    if (!effectiveRole || !requiredRoles.includes(effectiveRole)) {
      throw new ForbiddenException('Insufficient project role');
    }

    return true;
  }
}
