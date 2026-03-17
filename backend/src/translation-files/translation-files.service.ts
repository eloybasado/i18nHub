import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nPattern, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestTranslationFilesDto } from './dto/ingest-translation-files.dto';

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
}
