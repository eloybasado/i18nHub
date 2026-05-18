import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryKeyDto } from './dto/create-delivery-key.dto';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Key management ──────────────────────────────────────────────────────────

  async createKey(projectId: string, dto: CreateDeliveryKeyDto) {
    const raw = `dlv_${randomBytes(24).toString('base64url')}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    const keyPrefix = raw.substring(0, 12);

    const record = await this.prisma.deliveryApiKey.create({
      data: { projectId, name: dto.name, keyHash: hash, keyPrefix },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return { key: raw, record };
  }

  async listKeys(projectId: string) {
    return this.prisma.deliveryApiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async revokeKey(projectId: string, keyId: string) {
    const deleted = await this.prisma.deliveryApiKey.deleteMany({
      where: { id: keyId, projectId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  // ─── Public delivery ─────────────────────────────────────────────────────────

  private async resolveProjectId(rawKey: string): Promise<string> {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const record = await this.prisma.deliveryApiKey.findUnique({
      where: { keyHash: hash },
      select: { id: true, projectId: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Fire-and-forget lastUsedAt update
    void this.prisma.deliveryApiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return record.projectId;
  }

  async getMeta(rawKey: string) {
    const projectId = await this.resolveProjectId(rawKey);

    const fileGroups = await this.prisma.fileGroup.findMany({
      where: { projectId },
      select: {
        name: true,
        translationFiles: {
          select: {
            language: { select: { code: true, name: true } },
          },
        },
      },
    });

    const languageMap = new Map<string, string>();
    for (const fg of fileGroups) {
      for (const tf of fg.translationFiles) {
        languageMap.set(tf.language.code, tf.language.name);
      }
    }

    return {
      languages: Array.from(languageMap.entries()).map(([code, name]) => ({
        code,
        name,
      })),
      fileGroups: fileGroups.map((fg) => ({ name: fg.name })),
    };
  }

  async getTranslations(
    rawKey: string,
    languageCode: string,
    fileGroupName?: string,
  ) {
    const projectId = await this.resolveProjectId(rawKey);

    const language = await this.prisma.language.findUnique({
      where: { projectId_code: { projectId, code: languageCode } },
      select: { id: true },
    });

    if (!language) {
      throw new NotFoundException(`Language '${languageCode}' not found`);
    }

    const files = await this.prisma.translationFile.findMany({
      where: {
        languageId: language.id,
        fileGroup: fileGroupName
          ? { projectId, name: fileGroupName }
          : { projectId },
      },
      select: {
        content: true,
        fileGroup: { select: { name: true } },
      },
    });

    if (files.length === 0) {
      throw new NotFoundException('No translation files found');
    }

    if (fileGroupName) {
      return files[0].content;
    }

    // Merge all file groups into a single object
    const merged: Record<string, unknown> = {};
    for (const file of files) {
      Object.assign(merged, file.content);
    }
    return merged;
  }
}
