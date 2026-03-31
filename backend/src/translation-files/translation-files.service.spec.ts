import { BadRequestException, NotFoundException } from '@nestjs/common';
import { I18nPattern } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationFilesService } from './translation-files.service';

describe('TranslationFilesService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
    },
    language: {
      findFirst: jest.fn(),
    },
    translationFile: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const txMock = {
    fileGroup: {
      upsert: jest.fn(),
    },
    translationFile: {
      upsert: jest.fn(),
    },
  };

  const service = new TranslationFilesService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
    });
    prismaMock.language.findFirst = jest.fn().mockResolvedValue({
      id: 'lang-fr',
      code: 'fr',
    });
    prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue(null);
    prismaMock.translationFile.upsert = jest
      .fn()
      .mockImplementation(async (args) => ({
        id: 'tf-cloned',
        filename: args.create.filename,
        uploadedAt: new Date('2026-03-31T00:00:00.000Z'),
        language: {
          id: 'lang-fr',
          code: 'fr',
          name: 'French',
        },
        fileGroup: {
          id: 'group-1',
          name: 'home',
        },
      }));

    txMock.fileGroup.upsert.mockImplementation(
      async (args: { where: { projectId_name: { name: string } } }) => ({
        id: `group-${args.where.projectId_name.name}`,
        name: args.where.projectId_name.name,
      }),
    );
    txMock.translationFile.upsert.mockResolvedValue({});

    prismaMock.$transaction = jest
      .fn()
      .mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );
  });

  it('ingest stores files in default group for SINGLE_FILE pattern', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.SINGLE_FILE,
      languages: [
        { id: 'lang-es', code: 'es' },
        { id: 'lang-en', code: 'en' },
      ],
    });

    const result = await service.ingest('project-1', {
      files: [
        { path: 'locales/es.json', content: { home: { title: 'Hola' } } },
        { path: 'locales/en.json', content: { home: { title: 'Hello' } } },
      ],
    });

    expect(txMock.fileGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_name: {
            projectId: 'project-1',
            name: 'default',
          },
        },
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        filesIngested: 2,
        fileGroupsAffected: 1,
        pattern: I18nPattern.SINGLE_FILE,
      }),
    );
  });

  it('ingest stores files by namespace for FOLDER_PER_LOCALE pattern', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.FOLDER_PER_LOCALE,
      languages: [
        { id: 'lang-es', code: 'es' },
        { id: 'lang-en', code: 'en' },
      ],
    });

    const result = await service.ingest('project-1', {
      files: [
        { path: 'locales/es/home.json', content: { title: 'Inicio' } },
        { path: 'locales/en/home.json', content: { title: 'Home' } },
      ],
    });

    expect(txMock.fileGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_name: {
            projectId: 'project-1',
            name: 'home',
          },
        },
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-es',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'home.json',
        }),
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-en',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'home.json',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        filesIngested: 2,
        fileGroupsAffected: 1,
        pattern: I18nPattern.FOLDER_PER_LOCALE,
      }),
    );
  });

  it('ingest stores files grouped by base name for SUFFIX pattern', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.SUFFIX,
      languages: [
        { id: 'lang-es', code: 'es' },
        { id: 'lang-en', code: 'en' },
      ],
    });

    const result = await service.ingest('project-1', {
      files: [
        { path: 'home_es.json', content: { title: 'Inicio' } },
        { path: 'home_en.json', content: { title: 'Home' } },
      ],
    });

    expect(txMock.fileGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_name: {
            projectId: 'project-1',
            name: 'home',
          },
        },
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-es',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'home_es.json',
        }),
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-en',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'home_en.json',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        filesIngested: 2,
        fileGroupsAffected: 1,
        pattern: I18nPattern.SUFFIX,
      }),
    );
  });

  it('ingest stores files grouped by base name for PREFIX pattern', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.PREFIX,
      languages: [
        { id: 'lang-es', code: 'es' },
        { id: 'lang-en', code: 'en' },
      ],
    });

    const result = await service.ingest('project-1', {
      files: [
        { path: 'es_home.json', content: { title: 'Inicio' } },
        { path: 'en_home.json', content: { title: 'Home' } },
      ],
    });

    expect(txMock.fileGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_name: {
            projectId: 'project-1',
            name: 'home',
          },
        },
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-es',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'es_home.json',
        }),
      }),
    );
    expect(txMock.translationFile.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          languageId_fileGroupId: {
            languageId: 'lang-en',
            fileGroupId: 'group-home',
          },
        },
        create: expect.objectContaining({
          filename: 'en_home.json',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        filesIngested: 2,
        fileGroupsAffected: 1,
        pattern: I18nPattern.PREFIX,
      }),
    );
  });

  it('ingest throws when file language does not exist in project', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      i18nPattern: I18nPattern.SINGLE_FILE,
      languages: [{ id: 'lang-es', code: 'es' }],
    });

    await expect(
      service.ingest('project-1', {
        files: [
          { path: 'locales/en.json', content: { home: { title: 'Hello' } } },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ingest throws when project does not exist', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      service.ingest('missing-project', {
        files: [{ path: 'locales/es.json', content: { x: 'y' } }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    {
      pattern: I18nPattern.SINGLE_FILE,
      sourceFilename: 'en.json',
      sourceCode: 'en',
      groupName: 'default',
      expectedFilename: 'fr.json',
    },
    {
      pattern: I18nPattern.FOLDER_PER_LOCALE,
      sourceFilename: 'home.json',
      sourceCode: 'en',
      groupName: 'home',
      expectedFilename: 'home.json',
    },
    {
      pattern: I18nPattern.SUFFIX,
      sourceFilename: 'home_en.json',
      sourceCode: 'en',
      groupName: 'home',
      expectedFilename: 'home_fr.json',
    },
    {
      pattern: I18nPattern.PREFIX,
      sourceFilename: 'en_home.json',
      sourceCode: 'en',
      groupName: 'home',
      expectedFilename: 'fr_home.json',
    },
  ])(
    'cloneToLanguage builds expected filename for $pattern pattern',
    async ({
      pattern,
      sourceFilename,
      sourceCode,
      groupName,
      expectedFilename,
    }) => {
      prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue({
        id: 'tf-source',
        filename: sourceFilename,
        languageId: 'lang-en',
        fileGroupId: 'group-1',
        language: {
          code: sourceCode,
        },
        fileGroup: {
          name: groupName,
          project: {
            i18nPattern: pattern,
          },
        },
        content: {
          title: 'Home',
          nested: {
            value: 'Welcome',
          },
        },
      });

      await service.cloneToLanguage('project-1', {
        sourceTranslationFileId: 'tf-source',
        targetLanguageId: 'lang-fr',
        clearValues: false,
      });

      expect(prismaMock.translationFile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            filename: expectedFilename,
          }),
          update: expect.objectContaining({
            filename: expectedFilename,
          }),
        }),
      );
    },
  );
});
