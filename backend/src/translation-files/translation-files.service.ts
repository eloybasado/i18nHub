import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nPattern, Prisma, Tier } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import { pruneTranslationFileVersions } from '../common/version-retention';
import { PrismaService } from '../prisma/prisma.service';
import { CloneTranslationFileDto } from './dto/clone-translation-file.dto';
import { IngestTranslationFilesDto } from './dto/ingest-translation-files.dto';
import { UpdateTranslationFileContentDto } from './dto/update-translation-file-content.dto';

type ParsedFile = {
  path: string;
  filename: string;
  localeCode: string;
  fileGroupName: string;
  content: Prisma.InputJsonValue;
};

@Injectable()
export class TranslationFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(projectId: string, translationFileId: string) {
    await this.ensureProjectExists(projectId);

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
        filename: true,
        content: true,
        uploadedAt: true,
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    return translationFile;
  }

  async listByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.translationFile.findMany({
      where: {
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
        filename: true,
        uploadedAt: true,
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          fileGroup: {
            name: 'asc',
          },
        },
        {
          language: {
            code: 'asc',
          },
        },
      ],
    });
  }

  async listVersions(
    projectId: string,
    translationFileId: string,
    user: JwtPayload,
  ) {
    await this.ensureProjectExists(projectId);

    if (user.tier !== Tier.PRO) {
      throw new ForbiddenException(
        'Version history is available for PRO users only',
      );
    }

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    return this.prisma.translationFileVersion.findMany({
      where: {
        translationFileId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        comment: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async restoreVersion(
    projectId: string,
    translationFileId: string,
    versionId: string,
    user: JwtPayload,
  ) {
    await this.ensureProjectExists(projectId);

    if (user.tier !== Tier.PRO) {
      throw new ForbiddenException(
        'Version history is available for PRO users only',
      );
    }

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    const version = await this.prisma.translationFileVersion.findFirst({
      where: {
        id: versionId,
        translationFileId,
      },
      select: {
        id: true,
        versionNumber: true,
        content: true,
      },
    });

    if (!version) {
      throw new NotFoundException(
        'Version not found for this translation file',
      );
    }

    return this.prisma.translationFile.update({
      where: {
        id: translationFileId,
      },
      data: {
        content: this.toInputJson(version.content),
      },
      select: {
        id: true,
        filename: true,
        content: true,
        uploadedAt: true,
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getVersionContent(
    projectId: string,
    translationFileId: string,
    versionId: string,
    user: JwtPayload,
  ) {
    await this.ensureProjectExists(projectId);

    if (user.tier !== Tier.PRO) {
      throw new ForbiddenException(
        'Version history is available for PRO users only',
      );
    }

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    const version = await this.prisma.translationFileVersion.findFirst({
      where: {
        id: versionId,
        translationFileId,
      },
      select: {
        id: true,
        versionNumber: true,
        content: true,
      },
    });

    if (!version) {
      throw new NotFoundException(
        'Version not found for this translation file',
      );
    }

    return {
      id: version.id,
      versionNumber: version.versionNumber,
      content: version.content,
    };
  }

  async ingest(projectId: string, dto: IngestTranslationFilesDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        i18nPattern: true,
        languages: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.languages.length === 0) {
      throw new BadRequestException('Project has no languages configured');
    }

    const languageByCode = new Map(
      project.languages.map((language) => [
        language.code.toLowerCase(),
        language.id,
      ]),
    );

    const parsedFiles = dto.files.map((file) =>
      this.parseByPattern(project.i18nPattern, file.path, file.content),
    );

    const unknownLanguages = parsedFiles
      .map((file) => file.localeCode)
      .filter((code) => !languageByCode.has(code));

    if (unknownLanguages.length > 0) {
      throw new BadRequestException(
        `Unknown language codes in files: ${Array.from(new Set(unknownLanguages)).join(', ')}`,
      );
    }

    const uniqueGroupNames = Array.from(
      new Set(parsedFiles.map((file) => file.fileGroupName)),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const fileGroupIds = new Map<string, string>();

      for (const groupName of uniqueGroupNames) {
        const fileGroup = await tx.fileGroup.upsert({
          where: {
            projectId_name: {
              projectId,
              name: groupName,
            },
          },
          create: {
            projectId,
            name: groupName,
          },
          update: {},
          select: { id: true, name: true },
        });

        fileGroupIds.set(fileGroup.name, fileGroup.id);
      }

      for (const file of parsedFiles) {
        const languageId = languageByCode.get(file.localeCode);
        const fileGroupId = fileGroupIds.get(file.fileGroupName);

        if (!languageId || !fileGroupId) {
          throw new BadRequestException(
            'Failed to map file to language/file group',
          );
        }

        await tx.translationFile.upsert({
          where: {
            languageId_fileGroupId: {
              languageId,
              fileGroupId,
            },
          },
          create: {
            languageId,
            fileGroupId,
            filename: file.filename,
            content: file.content,
          },
          update: {
            filename: file.filename,
            content: file.content,
          },
        });
      }

      return {
        filesIngested: parsedFiles.length,
        fileGroupsAffected: uniqueGroupNames.length,
      };
    });

    return {
      ...result,
      pattern: project.i18nPattern,
    };
  }

  async remove(projectId: string, translationFileId: string) {
    await this.ensureProjectExists(projectId);

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: { id: true },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    await this.prisma.translationFile.delete({
      where: { id: translationFileId },
    });

    return { deleted: true };
  }

  async updateContent(
    projectId: string,
    translationFileId: string,
    dto: UpdateTranslationFileContentDto,
    user: JwtPayload,
  ) {
    await this.ensureProjectExists(projectId);

    const translationFile = await this.prisma.translationFile.findFirst({
      where: {
        id: translationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found in project');
    }

    // Fetch project owner to check if versioning is enabled for this project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        owner: {
          select: { tier: true },
        },
        versionHistoryLimit: true,
      },
    });

    if (project?.owner.tier === Tier.PRO) {
      return this.prisma.$transaction(async (tx) => {
        const latestVersion = await tx.translationFileVersion.findFirst({
          where: {
            translationFileId,
          },
          orderBy: {
            versionNumber: 'desc',
          },
          select: {
            versionNumber: true,
          },
        });

        await tx.translationFileVersion.create({
          data: {
            translationFileId,
            content: this.toInputJson(translationFile.content),
            versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
            createdById: user.sub,
            comment: 'Auto snapshot before content update',
          },
        });

        await pruneTranslationFileVersions(
          tx,
          translationFileId,
          project.versionHistoryLimit,
        );

        return tx.translationFile.update({
          where: { id: translationFileId },
          data: {
            content: dto.content as Prisma.InputJsonValue,
          },
          select: {
            id: true,
            filename: true,
            content: true,
            uploadedAt: true,
            language: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            fileGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });
    }

    return this.prisma.translationFile.update({
      where: { id: translationFileId },
      data: {
        content: dto.content as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        filename: true,
        content: true,
        uploadedAt: true,
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async cloneToLanguage(projectId: string, dto: CloneTranslationFileDto) {
    await this.ensureProjectExists(projectId);

    const source = await this.prisma.translationFile.findFirst({
      where: {
        id: dto.sourceTranslationFileId,
        fileGroup: {
          projectId,
        },
      },
      select: {
        id: true,
        filename: true,
        languageId: true,
        fileGroupId: true,
        language: {
          select: {
            code: true,
          },
        },
        fileGroup: {
          select: {
            name: true,
            project: {
              select: {
                i18nPattern: true,
              },
            },
          },
        },
        content: true,
      },
    });

    if (!source) {
      throw new NotFoundException(
        'Source translation file not found in project',
      );
    }

    if (source.languageId === dto.targetLanguageId) {
      throw new BadRequestException('Target language must be different');
    }

    const targetLanguage = await this.prisma.language.findFirst({
      where: {
        id: dto.targetLanguageId,
        projectId,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!targetLanguage) {
      throw new NotFoundException('Target language not found in project');
    }

    const clonedContent = this.toInputJson(
      dto.clearValues ? this.clearStringValues(source.content) : source.content,
    );

    const targetFilename = this.buildFilenameForLanguage({
      pattern: source.fileGroup.project.i18nPattern,
      sourceFilename: source.filename,
      fileGroupName: source.fileGroup.name,
      sourceLanguageCode: source.language.code,
      targetLanguageCode: targetLanguage.code,
    });

    const result = await this.prisma.translationFile.upsert({
      where: {
        languageId_fileGroupId: {
          languageId: dto.targetLanguageId,
          fileGroupId: source.fileGroupId,
        },
      },
      create: {
        languageId: dto.targetLanguageId,
        fileGroupId: source.fileGroupId,
        filename: targetFilename,
        content: clonedContent,
      },
      update: {
        filename: targetFilename,
        content: clonedContent,
      },
      select: {
        id: true,
        filename: true,
        uploadedAt: true,
        language: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return result;
  }

  private buildFilenameForLanguage(params: {
    pattern: I18nPattern;
    sourceFilename: string;
    fileGroupName: string;
    sourceLanguageCode: string;
    targetLanguageCode: string;
  }): string {
    const {
      pattern,
      sourceFilename,
      fileGroupName,
      sourceLanguageCode,
      targetLanguageCode,
    } = params;

    if (pattern === I18nPattern.SINGLE_FILE) {
      return `${targetLanguageCode}.json`;
    }

    if (pattern === I18nPattern.FOLDER_PER_LOCALE) {
      return `${fileGroupName}.json`;
    }

    const stem = sourceFilename.endsWith('.json')
      ? sourceFilename.slice(0, -'.json'.length)
      : sourceFilename;

    if (pattern === I18nPattern.SUFFIX) {
      const match = stem.match(
        /^(.*?)([._-])([a-zA-Z]{2,}(?:[-_][a-zA-Z0-9]+)*)$/,
      );

      if (match && match[1] && match[2]) {
        return `${match[1]}${match[2]}${targetLanguageCode}.json`;
      }

      return `${fileGroupName}_${targetLanguageCode}.json`;
    }

    if (pattern === I18nPattern.PREFIX) {
      const escapedSourceCode = sourceLanguageCode.replace(
        /[-/\\^$*+?.()|[\]{}]/g,
        '\\$&',
      );
      const match = stem.match(
        new RegExp(`^(${escapedSourceCode})([._-])(.+)$`, 'i'),
      );

      if (match && match[2] && match[3]) {
        return `${targetLanguageCode}${match[2]}${match[3]}.json`;
      }

      return `${targetLanguageCode}_${fileGroupName}.json`;
    }

    return sourceFilename;
  }

  private parseByPattern(
    pattern: I18nPattern,
    rawPath: string,
    content: unknown,
  ): ParsedFile {
    if (!this.isJsonValue(content)) {
      throw new BadRequestException(
        `Invalid JSON content for file: ${rawPath}`,
      );
    }

    const normalizedPath = rawPath.replace(/\\/g, '/');
    const filename = normalizedPath.split('/').pop();

    if (!filename) {
      throw new BadRequestException(`Invalid file path: ${rawPath}`);
    }

    const stem = filename.endsWith('.json')
      ? filename.slice(0, -'.json'.length)
      : filename;

    if (!stem) {
      throw new BadRequestException(`Invalid file name: ${rawPath}`);
    }

    if (pattern === I18nPattern.SINGLE_FILE) {
      return {
        path: rawPath,
        filename,
        localeCode: stem.toLowerCase(),
        fileGroupName: 'default',
        content,
      };
    }

    if (pattern === I18nPattern.FOLDER_PER_LOCALE) {
      const parts = normalizedPath.split('/').filter(Boolean);
      const localeCode = parts.at(-2);

      if (!localeCode) {
        throw new BadRequestException(
          `Cannot parse locale from folder path: ${rawPath}`,
        );
      }

      return {
        path: rawPath,
        filename,
        localeCode: localeCode.toLowerCase(),
        fileGroupName: stem,
        content,
      };
    }

    if (pattern === I18nPattern.SUFFIX) {
      const match = stem.match(
        /^(.*?)[._-]([a-zA-Z]{2,}(?:[-_][a-zA-Z0-9]+)*)$/,
      );
      if (!match || !match[1] || !match[2]) {
        throw new BadRequestException(
          `Cannot parse SUFFIX pattern file: ${rawPath}`,
        );
      }

      return {
        path: rawPath,
        filename,
        localeCode: match[2].toLowerCase(),
        fileGroupName: match[1],
        content,
      };
    }

    if (pattern === I18nPattern.PREFIX) {
      const match = stem.match(
        /^([a-zA-Z]{2,}(?:[-_][a-zA-Z0-9]+)*)[._-](.+)$/,
      );
      if (!match || !match[1] || !match[2]) {
        throw new BadRequestException(
          `Cannot parse PREFIX pattern file: ${rawPath}`,
        );
      }

      return {
        path: rawPath,
        filename,
        localeCode: match[1].toLowerCase(),
        fileGroupName: match[2],
        content,
      };
    }

    throw new BadRequestException(
      `Unsupported i18n pattern for file: ${rawPath}`,
    );
  }

  private isJsonValue(value: unknown): value is Prisma.InputJsonValue {
    return typeof value === 'object' && value !== null;
  }

  private clearStringValues(value: Prisma.JsonValue): Prisma.JsonValue {
    if (typeof value === 'string') {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.clearStringValues(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          this.clearStringValues(nestedValue as Prisma.JsonValue),
        ]),
      );
    }

    return value;
  }

  private toInputJson(
    value: Prisma.JsonValue,
  ): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  async listFileGroups(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.fileGroup.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        _count: { select: { translationFiles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async deleteFileGroup(projectId: string, fileGroupId: string) {
    const fileGroup = await this.prisma.fileGroup.findFirst({
      where: { id: fileGroupId, projectId },
      select: { id: true },
    });

    if (!fileGroup) {
      throw new NotFoundException('File group not found in project');
    }

    await this.prisma.fileGroup.delete({ where: { id: fileGroupId } });
    return { deleted: true };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
