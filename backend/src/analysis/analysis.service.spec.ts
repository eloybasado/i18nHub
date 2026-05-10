import { BadRequestException } from '@nestjs/common';
import { IssueType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
    },
    translationFile: {
      findMany: jest.fn(),
    },
    analysisReport: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const service = new AnalysisService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates report and persists all issue types for one file group', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
      ],
      fileGroups: [{ id: 'group-1', name: 'home' }],
    });

    const translationFileFindMany = jest.fn().mockResolvedValue([
      {
        languageId: 'lang-en',
        content: {
          home: {
            title: 'Hello {name}',
            onlyRef: 'Just ref',
          },
        },
      },
      {
        languageId: 'lang-es',
        content: {
          home: {
            title: 'Hola {nombre}',
            onlyTarget: 'Solo destino',
          },
        },
      },
    ]);

    const analysisReportCreate = jest
      .fn()
      .mockResolvedValue({ id: 'report-1' });
    const analysisIssueCreateMany = jest.fn().mockResolvedValue({ count: 3 });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: translationFileFindMany,
        },
        analysisReport: {
          create: analysisReportCreate,
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        analysisIssue: {
          createMany: analysisIssueCreateMany,
        },
      }),
    );

    const result = await service.run('project-1', {});

    expect(result.reportsCreated).toBe(1);
    expect(result.issuesCreated).toBe(3);
    expect(analysisIssueCreateMany).toHaveBeenCalledTimes(1);

    const payload = analysisIssueCreateMany.mock.calls[0][0].data;
    expect(payload).toHaveLength(3);
    expect(
      payload.map((issue: { type: IssueType }) => issue.type).sort(),
    ).toEqual(
      [
        IssueType.INTERPOLATION_MISMATCH,
        IssueType.MISSING_KEY,
        IssueType.UNUSED_KEY,
      ].sort(),
    );
  });

  it('marks all keys as missing when target language file does not exist', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-fr', code: 'fr' },
      ],
      fileGroups: [{ id: 'group-1', name: 'default' }],
    });

    const translationFileFindMany = jest.fn().mockResolvedValue([
      {
        languageId: 'lang-en',
        content: {
          a: 'A',
          b: 'B',
        },
      },
    ]);

    const analysisIssueCreateMany = jest.fn().mockResolvedValue({ count: 2 });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: translationFileFindMany,
        },
        analysisReport: {
          create: jest.fn().mockResolvedValue({ id: 'report-1' }),
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        analysisIssue: {
          createMany: analysisIssueCreateMany,
        },
      }),
    );

    const result = await service.run('project-1', {});

    expect(result.issuesCreated).toBe(2);
    const payload = analysisIssueCreateMany.mock.calls[0][0].data;
    expect(
      payload.every(
        (issue: { type: IssueType }) => issue.type === IssueType.MISSING_KEY,
      ),
    ).toBe(true);
  });

  it('creates issues for each non-reference language when project has 3 languages', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
        { id: 'lang-fr', code: 'fr' },
      ],
      fileGroups: [{ id: 'group-1', name: 'home' }],
    });

    const analysisIssueCreateMany = jest.fn().mockResolvedValue({ count: 4 });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: jest.fn().mockResolvedValue([
            {
              languageId: 'lang-en',
              content: {
                title: 'Hello {name}',
                subtitle: 'Welcome',
              },
            },
            {
              languageId: 'lang-es',
              content: {
                title: 'Hola {nombre}',
              },
            },
            {
              languageId: 'lang-fr',
              content: {
                title: 'Bonjour {name}',
                extra: 'Supprime',
              },
            },
          ]),
        },
        analysisReport: {
          create: jest.fn().mockResolvedValue({ id: 'report-1' }),
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        analysisIssue: {
          createMany: analysisIssueCreateMany,
        },
      }),
    );

    const result = await service.run('project-1', {});

    expect(result.issuesCreated).toBe(4);

    const payload = analysisIssueCreateMany.mock.calls[0][0].data as Array<{
      type: IssueType;
      languageId: string;
      key: string;
    }>;

    expect(payload.filter((issue) => issue.languageId === 'lang-es')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: IssueType.MISSING_KEY,
          key: 'subtitle',
        }),
        expect.objectContaining({
          type: IssueType.INTERPOLATION_MISMATCH,
          key: 'title',
        }),
      ]),
    );

    expect(payload.filter((issue) => issue.languageId === 'lang-fr')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: IssueType.MISSING_KEY,
          key: 'subtitle',
        }),
        expect.objectContaining({ type: IssueType.UNUSED_KEY, key: 'extra' }),
      ]),
    );
  });

  it('detects incorrectly nested keys instead of reporting them as missing', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
      ],
      fileGroups: [{ id: 'group-1', name: 'home' }],
    });

    const analysisIssueCreateMany = jest.fn().mockResolvedValue({ count: 1 });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: jest.fn().mockResolvedValue([
            {
              languageId: 'lang-en',
              content: {
                home: {
                  title: 'Hello',
                },
              },
            },
            {
              languageId: 'lang-es',
              content: {
                title: 'Hola',
              },
            },
          ]),
        },
        analysisReport: {
          create: jest.fn().mockResolvedValue({ id: 'report-1' }),
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        analysisIssue: {
          createMany: analysisIssueCreateMany,
        },
      }),
    );

    const result = await service.run('project-1', {});

    expect(result.issuesCreated).toBe(1);
    const payload = analysisIssueCreateMany.mock.calls[0][0].data;
    expect(payload).toEqual([
      expect.objectContaining({
        type: IssueType.INCORRECT_NESTING,
        key: 'home.title',
      }),
    ]);
  });

  it('throws when reference file is missing in a file group', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
      ],
      fileGroups: [{ id: 'group-1', name: 'home' }],
    });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: jest.fn().mockResolvedValue([
            {
              languageId: 'lang-es',
              content: {
                home: {
                  findMany: jest.fn().mockResolvedValue([]),
                  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
                  title: 'Hola',
                },
              },
            },
          ]),
        },
        analysisReport: {
          create: jest.fn(),
        },
        analysisIssue: {
          createMany: jest.fn(),
        },
      }),
    );

    await expect(service.run('project-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns empty latest run payload when project has no persisted analyses', async () => {
    prismaMock.analysisReport.findFirst = jest.fn().mockResolvedValue(null);

    const result = await service.getLatestRun('project-1');

    expect(result).toEqual({
      reportsCreated: 0,
      issuesCreated: 0,
      createdAt: null,
      reports: [],
    });
  });

  it('returns the latest persisted analysis run grouped by latest createdAt', async () => {
    const createdAt = new Date('2026-04-30T10:00:00.000Z');

    prismaMock.analysisReport.findFirst = jest.fn().mockResolvedValue({
      createdAt,
    });

    prismaMock.analysisReport.findMany = jest.fn().mockResolvedValue([
      {
        id: 'report-1',
        fileGroupId: 'group-1',
        fileGroup: { id: 'group-1', name: 'home' },
        _count: { issues: 3 },
      },
      {
        id: 'report-2',
        fileGroupId: 'group-2',
        fileGroup: { id: 'group-2', name: 'common' },
        _count: { issues: 1 },
      },
    ]);

    const result = await service.getLatestRun('project-1');

    expect(prismaMock.analysisReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-1',
          createdAt,
        },
      }),
    );

    expect(result).toEqual({
      reportsCreated: 2,
      issuesCreated: 4,
      createdAt,
      reports: [
        {
          id: 'report-1',
          fileGroupId: 'group-1',
          fileGroupName: 'home',
          issuesCreated: 3,
        },
        {
          id: 'report-2',
          fileGroupId: 'group-2',
          fileGroupName: 'common',
          issuesCreated: 1,
        },
      ],
    });
  });

  it('uses the same createdAt for all reports created in one run', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
      ],
      fileGroups: [
        { id: 'group-1', name: 'home' },
        { id: 'group-2', name: 'common' },
      ],
    });

    const analysisReportCreate = jest
      .fn()
      .mockResolvedValueOnce({ id: 'report-1' })
      .mockResolvedValueOnce({ id: 'report-2' });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: jest.fn().mockResolvedValue([
            {
              languageId: 'lang-en',
              content: {
                key: 'Hello',
              },
            },
            {
              languageId: 'lang-es',
              content: {
                key: 'Hola',
              },
            },
          ]),
        },
        analysisReport: {
          create: analysisReportCreate,
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        analysisIssue: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );

    await service.run('project-1', {});

    expect(analysisReportCreate).toHaveBeenCalledTimes(2);

    const firstCreatedAt = analysisReportCreate.mock.calls[0][0].data
      .createdAt as Date;
    const secondCreatedAt = analysisReportCreate.mock.calls[1][0].data
      .createdAt as Date;

    expect(firstCreatedAt).toBeInstanceOf(Date);
    expect(secondCreatedAt).toBeInstanceOf(Date);
    expect(firstCreatedAt.toISOString()).toBe(secondCreatedAt.toISOString());
  });

  it('keeps only the latest two analysis runs per project', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en' },
        { id: 'lang-es', code: 'es' },
      ],
      fileGroups: [{ id: 'group-1', name: 'home' }],
    });

    const analysisReportCreate = jest
      .fn()
      .mockResolvedValue({ id: 'report-4' });
    const analysisReportFindMany = jest
      .fn()
      .mockResolvedValue([
        { createdAt: new Date('2026-05-09T12:00:00.000Z') },
        { createdAt: new Date('2026-05-08T12:00:00.000Z') },
        { createdAt: new Date('2026-05-07T12:00:00.000Z') },
      ]);
    const analysisReportDeleteMany = jest.fn().mockResolvedValue({ count: 2 });

    prismaMock.$transaction = jest.fn().mockImplementation(async (callback) =>
      callback({
        translationFile: {
          findMany: jest.fn().mockResolvedValue([
            {
              languageId: 'lang-en',
              content: {
                key: 'Hello',
              },
            },
            {
              languageId: 'lang-es',
              content: {
                key: 'Hola',
              },
            },
          ]),
        },
        analysisReport: {
          create: analysisReportCreate,
          findMany: analysisReportFindMany,
          deleteMany: analysisReportDeleteMany,
        },
        analysisIssue: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );

    await service.run('project-1', {});

    expect(analysisReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-1' },
        distinct: ['createdAt'],
        orderBy: { createdAt: 'desc' },
      }),
    );

    expect(analysisReportDeleteMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
        createdAt: {
          lt: new Date('2026-05-08T12:00:00.000Z'),
        },
      },
    });
  });

  it('computes per-language coverage with untranslated and interpolation mismatches', async () => {
    prismaMock.project.findUnique = jest.fn().mockResolvedValue({
      id: 'project-1',
      referenceLanguageId: 'lang-en',
      languages: [
        { id: 'lang-en', code: 'en', name: 'English' },
        { id: 'lang-es', code: 'es', name: 'Español' },
      ],
      fileGroups: [{ id: 'group-1' }],
    });

    prismaMock.translationFile.findMany = jest.fn().mockResolvedValue([
      {
        languageId: 'lang-en',
        fileGroupId: 'group-1',
        content: {
          home: {
            title: 'Hello {name}',
            subtitle: 'Welcome',
            cta: 'Start now',
          },
        },
      },
      {
        languageId: 'lang-es',
        fileGroupId: 'group-1',
        content: {
          home: {
            title: 'Hola {nombre}',
            subtitle: '',
          },
        },
      },
    ]);

    const result = await service.getLanguageCoverage('project-1');

    const es = result.languages.find((item) => item.languageId === 'lang-es');
    expect(es).toBeDefined();
    expect(es).toEqual(
      expect.objectContaining({
        totalKeys: 3,
        correctKeys: 0,
        missingKeys: 1,
        untranslatedKeys: 1,
        interpolationMismatchKeys: 1,
        incorrectNestingKeys: 0,
        completionPercent: 0,
      }),
    );
  });
});
