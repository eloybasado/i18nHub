import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalRole, I18nPattern, Tier } from '@prisma/client';
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
      update: jest.fn(),
    },
    translationFileVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const txMock = {
    fileGroup: {
      upsert: jest.fn(),
    },
    translationFile: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    translationFileVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
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
    prismaMock.translationFile.update = jest.fn().mockResolvedValue({
      id: 'tf-1',
      filename: 'home_es.json',
      content: { title: 'Nuevo' },
      uploadedAt: new Date('2026-03-31T00:00:00.000Z'),
      language: {
        id: 'lang-es',
        code: 'es',
        name: 'Spanish',
      },
      fileGroup: {
        id: 'group-home',
        name: 'home',
      },
    });
    prismaMock.translationFileVersion.findFirst = jest.fn().mockResolvedValue(null);
    prismaMock.translationFileVersion.create = jest.fn().mockResolvedValue({});
    prismaMock.translationFileVersion.findMany = jest.fn().mockResolvedValue([]);

    txMock.fileGroup.upsert.mockImplementation(
      async (args: { where: { projectId_name: { name: string } } }) => ({
        id: `group-${args.where.projectId_name.name}`,
        name: args.where.projectId_name.name,
      }),
    );
    txMock.translationFile.upsert.mockResolvedValue({});
    txMock.translationFile.update.mockResolvedValue({
      id: 'tf-1',
      filename: 'home_es.json',
      content: { title: 'Nuevo' },
      uploadedAt: new Date('2026-03-31T00:00:00.000Z'),
      language: {
        id: 'lang-es',
        code: 'es',
        name: 'Spanish',
      },
      fileGroup: {
        id: 'group-home',
        name: 'home',
      },
    });
    txMock.translationFileVersion.findFirst.mockResolvedValue(null);
    txMock.translationFileVersion.create.mockResolvedValue({});

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

  it('updateContent creates a new version for PRO users before updating', async () => {
    prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue({
      id: 'tf-1',
      content: {
        title: 'Anterior',
      },
    });
    txMock.translationFileVersion.findFirst.mockResolvedValue({
      versionNumber: 3,
    });

    await service.updateContent(
      'project-1',
      'tf-1',
      {
        content: {
          title: 'Nuevo',
        },
      },
      {
        sub: 'user-pro',
        email: 'pro@test.com',
        role: GlobalRole.MEMBER,
        tier: Tier.PRO,
      },
    );

    expect(txMock.translationFileVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translationFileId: 'tf-1',
          versionNumber: 4,
          createdById: 'user-pro',
        }),
      }),
    );
    expect(txMock.translationFile.update).toHaveBeenCalled();
  });

  it('updateContent does not create versions for FREE users', async () => {
    prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue({
      id: 'tf-1',
      content: {
        title: 'Anterior',
      },
    });

    await service.updateContent(
      'project-1',
      'tf-1',
      {
        content: {
          title: 'Nuevo',
        },
      },
      {
        sub: 'user-free',
        email: 'free@test.com',
        role: GlobalRole.MEMBER,
        tier: Tier.FREE,
      },
    );

    expect(prismaMock.translationFile.update).toHaveBeenCalled();
    expect(txMock.translationFileVersion.create).not.toHaveBeenCalled();
  });

  it('listVersions returns versions for PRO users', async () => {
    prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue({
      id: 'tf-1',
    });
    prismaMock.translationFileVersion.findMany = jest.fn().mockResolvedValue([
      {
        id: 'v2',
        versionNumber: 2,
      },
      {
        id: 'v1',
        versionNumber: 1,
      },
    ]);

    const result = await service.listVersions('project-1', 'tf-1', {
      sub: 'user-pro',
      email: 'pro@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
    });

    expect(result).toHaveLength(2);
    expect(prismaMock.translationFileVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          translationFileId: 'tf-1',
        },
      }),
    );
  });

  it('listVersions throws for FREE users', async () => {
    await expect(
      service.listVersions('project-1', 'tf-1', {
        sub: 'user-free',
        email: 'free@test.com',
        role: GlobalRole.MEMBER,
        tier: Tier.FREE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('restoreVersion restores selected version for PRO users and snapshots current content', async () => {
    prismaMock.translationFile.findFirst = jest.fn().mockResolvedValue({
      id: 'tf-1',
      content: {
        title: 'Actual',
      },
    });
    prismaMock.translationFileVersion.findFirst = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'version-1',
        versionNumber: 1,
        content: {
          title: 'Version antigua',
        },
      });
    txMock.translationFileVersion.findFirst.mockResolvedValue({ versionNumber: 4 });

    await service.restoreVersion('project-1', 'tf-1', 'version-1', {
      sub: 'user-pro',
      email: 'pro@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
    });

    expect(txMock.translationFileVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translationFileId: 'tf-1',
          versionNumber: 5,
          createdById: 'user-pro',
        }),
      }),
    );
    expect(txMock.translationFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tf-1' },
        data: {
          content: {
            title: 'Version antigua',
          },
        },
      }),
    );
  });

  it('restoreVersion throws for FREE users', async () => {
    await expect(
      service.restoreVersion('project-1', 'tf-1', 'version-1', {
        sub: 'user-free',
        email: 'free@test.com',
        role: GlobalRole.MEMBER,
        tier: Tier.FREE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
