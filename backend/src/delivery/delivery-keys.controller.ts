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
import { DeliveryService } from './delivery.service';
import { CreateDeliveryKeyDto } from './dto/create-delivery-key.dto';

@Controller('projects/:projectId/delivery-keys')
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
@ProjectRoles(ProjectRole.OWNER, ProjectRole.EDITOR)
export class DeliveryKeysController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  create(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateDeliveryKeyDto,
  ) {
    return this.deliveryService.createKey(projectId, dto);
  }

  @Get()
  list(@Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return this.deliveryService.listKeys(projectId);
  }

  @Delete(':keyId')
  revoke(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('keyId', new ParseUUIDPipe()) keyId: string,
  ) {
    return this.deliveryService.revokeKey(projectId, keyId);
  }
}
