import { BadRequestException } from '@nestjs/common';
import { IssueType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
    },
    analysisReport: {
      findFirst: jest.fn(),
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

    const payload = (analysisIssueCreateMany as jest.Mock).mock.calls[0][0].data;
    expect(payload).toHaveLength(3);
    expect(payload.map((issue: { type: IssueType }) => issue.type).sort()).toEqual(
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
        },
        analysisIssue: {
          createMany: analysisIssueCreateMany,
        },
      }),
    );

    const result = await service.run('project-1', {});

    expect(result.issuesCreated).toBe(2);
    const payload = (analysisIssueCreateMany as jest.Mock).mock.calls[0][0].data;
    expect(payload.every((issue: { type: IssueType }) => issue.type === IssueType.MISSING_KEY)).toBe(true);
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
});