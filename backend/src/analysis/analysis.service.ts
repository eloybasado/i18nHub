import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  collectAllNodePaths,
  extractInterpolationVars,
  findMisnestedKey,
  flattenJsonToMap,
  hasInterpolationMismatch,
} from './analysis.utils';
import { RunAnalysisDto } from './dto/run-analysis.dto';

type PendingIssue = {
  type: IssueType;
  key: string;
  languageId: string;
  referenceLanguageId: string;
  details: Prisma.InputJsonValue;
};

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async run(projectId: string, dto: RunAnalysisDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        referenceLanguageId: true,
        languages: {
          select: {
            id: true,
            code: true,
          },
        },
        fileGroups: {
          where: dto.fileGroupId ? { id: dto.fileGroupId } : undefined,
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.referenceLanguageId) {
      throw new BadRequestException(
        'Project has no reference language configured',
      );
    }

    if (dto.fileGroupId && project.fileGroups.length === 0) {
      throw new NotFoundException('File group not found in project');
    }

    if (project.fileGroups.length === 0) {
      throw new BadRequestException('Project has no file groups to analyse');
    }

    const referenceLanguageId = project.referenceLanguageId;
    const targetLanguages = project.languages.filter(
      (language) => language.id !== referenceLanguageId,
    );

    if (targetLanguages.length === 0) {
      throw new BadRequestException(
        'Project needs at least one non-reference language',
      );
    }

    const runCreatedAt = new Date();

    const reports = await this.prisma.$transaction(async (tx) => {
      const createdReports: Array<{
        id: string;
        fileGroupId: string;
        fileGroupName: string;
        issuesCreated: number;
      }> = [];

      for (const fileGroup of project.fileGroups) {
        const pendingIssues = await this.buildIssuesForFileGroup({
          tx,
          fileGroupId: fileGroup.id,
          fileGroupName: fileGroup.name,
          referenceLanguageId,
          targetLanguageIds: targetLanguages.map((language) => language.id),
        });

        const report = await tx.analysisReport.create({
          data: {
            projectId,
            fileGroupId: fileGroup.id,
            createdAt: runCreatedAt,
          },
          select: {
            id: true,
          },
        });

        if (pendingIssues.length > 0) {
          await tx.analysisIssue.createMany({
            data: pendingIssues.map((issue) => ({
              reportId: report.id,
              type: issue.type,
              key: issue.key,
              languageId: issue.languageId,
              referenceLanguageId: issue.referenceLanguageId,
              details: issue.details,
            })),
          });
        }

        createdReports.push({
          id: report.id,
          fileGroupId: fileGroup.id,
          fileGroupName: fileGroup.name,
          issuesCreated: pendingIssues.length,
        });
      }

      const recentRuns = await tx.analysisReport.findMany({
        where: {
          projectId,
        },
        distinct: ['createdAt'],
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const retentionCutoff = recentRuns[1]?.createdAt;
      if (retentionCutoff) {
        await tx.analysisReport.deleteMany({
          where: {
            projectId,
            createdAt: {
              lt: retentionCutoff,
            },
          },
        });
      }

      return createdReports;
    });

    return {
      reportsCreated: reports.length,
      issuesCreated: reports.reduce(
        (acc, report) => acc + report.issuesCreated,
        0,
      ),
      reports,
    };
  }

  async getReport(projectId: string, reportId: string) {
    const report = await this.prisma.analysisReport.findFirst({
      where: {
        id: reportId,
        projectId,
      },
      include: {
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        issues: {
          orderBy: [{ languageId: 'asc' }, { key: 'asc' }],
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Analysis report not found');
    }

    return report;
  }

  async getLatestRun(projectId: string) {
    const latestReport = await this.prisma.analysisReport.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    if (!latestReport) {
      return {
        reportsCreated: 0,
        issuesCreated: 0,
        createdAt: null,
        reports: [],
      };
    }

    const reports = await this.prisma.analysisReport.findMany({
      where: {
        projectId,
        createdAt: latestReport.createdAt,
      },
      include: {
        fileGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            issues: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return {
      reportsCreated: reports.length,
      issuesCreated: reports.reduce(
        (acc, report) => acc + report._count.issues,
        0,
      ),
      createdAt: latestReport.createdAt,
      reports: reports.map((report) => ({
        id: report.id,
        fileGroupId: report.fileGroupId,
        fileGroupName: report.fileGroup?.name ?? 'Grupo sin identificar',
        issuesCreated: report._count.issues,
      })),
    };
  }

  async getLanguageCoverage(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        referenceLanguageId: true,
        languages: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        fileGroups: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.referenceLanguageId) {
      return {
        referenceLanguageId: null,
        languages: project.languages.map((language) => ({
          languageId: language.id,
          code: language.code,
          name: language.name,
          totalKeys: 0,
          correctKeys: 0,
          missingKeys: 0,
          untranslatedKeys: 0,
          interpolationMismatchKeys: 0,
          incorrectNestingKeys: 0,
          completionPercent: 0,
        })),
      };
    }

    const files = await this.prisma.translationFile.findMany({
      where: {
        fileGroup: {
          projectId,
        },
      },
      select: {
        languageId: true,
        fileGroupId: true,
        content: true,
      },
    });

    const fileByLanguageAndGroup = new Map<
      string,
      { content: Prisma.JsonValue }
    >();
    for (const file of files) {
      fileByLanguageAndGroup.set(`${file.languageId}:${file.fileGroupId}`, {
        content: file.content,
      });
    }

    const statsByLanguage = new Map(
      project.languages.map((language) => [
        language.id,
        {
          languageId: language.id,
          code: language.code,
          name: language.name,
          totalKeys: 0,
          correctKeys: 0,
          missingKeys: 0,
          untranslatedKeys: 0,
          interpolationMismatchKeys: 0,
          incorrectNestingKeys: 0,
        },
      ]),
    );

    for (const fileGroup of project.fileGroups) {
      const referenceFile = fileByLanguageAndGroup.get(
        `${project.referenceLanguageId}:${fileGroup.id}`,
      );

      if (!referenceFile) {
        continue;
      }

      const referenceMap = flattenJsonToMap(referenceFile.content);
      const referenceKeys = new Set(referenceMap.keys());

      for (const language of project.languages) {
        const stats = statsByLanguage.get(language.id);
        if (!stats) {
          continue;
        }

        if (language.id === project.referenceLanguageId) {
          stats.totalKeys += referenceKeys.size;
          stats.correctKeys += referenceKeys.size;
          continue;
        }

        const targetFile = fileByLanguageAndGroup.get(
          `${language.id}:${fileGroup.id}`,
        );

        if (!targetFile) {
          stats.totalKeys += referenceKeys.size;
          stats.missingKeys += referenceKeys.size;
          continue;
        }

        const targetMap = flattenJsonToMap(targetFile.content);
        const targetKeys = new Set(targetMap.keys());
        const targetAllPaths = collectAllNodePaths(targetFile.content);

        for (const key of referenceKeys) {
          stats.totalKeys += 1;

          if (targetKeys.has(key)) {
            const targetValue = targetMap.get(key) ?? '';
            if (!targetValue.trim()) {
              stats.untranslatedKeys += 1;
              continue;
            }

            const referenceValue = referenceMap.get(key) ?? '';
            if (hasInterpolationMismatch(referenceValue, targetValue)) {
              stats.interpolationMismatchKeys += 1;
              continue;
            }

            stats.correctKeys += 1;
            continue;
          }

          if (!targetAllPaths.has(key)) {
            stats.missingKeys += 1;
            continue;
          }

          const misnestedKey = findMisnestedKey(key, targetKeys);
          if (misnestedKey) {
            stats.incorrectNestingKeys += 1;
          } else {
            stats.missingKeys += 1;
          }
        }
      }
    }

    return {
      referenceLanguageId: project.referenceLanguageId,
      languages: Array.from(statsByLanguage.values()).map((stats) => ({
        ...stats,
        completionPercent:
          stats.totalKeys === 0
            ? 0
            : Math.round((stats.correctKeys / stats.totalKeys) * 100),
      })),
    };
  }

  private async buildIssuesForFileGroup(params: {
    tx: Prisma.TransactionClient;
    fileGroupId: string;
    fileGroupName: string;
    referenceLanguageId: string;
    targetLanguageIds: string[];
  }): Promise<PendingIssue[]> {
    const files = await params.tx.translationFile.findMany({
      where: {
        fileGroupId: params.fileGroupId,
        languageId: {
          in: [params.referenceLanguageId, ...params.targetLanguageIds],
        },
      },
      select: {
        languageId: true,
        content: true,
      },
    });

    const fileByLanguageId = new Map(
      files.map((file) => [file.languageId, file]),
    );
    const referenceFile = fileByLanguageId.get(params.referenceLanguageId);

    if (!referenceFile) {
      throw new BadRequestException(
        `Reference file is missing for file group: ${params.fileGroupName}`,
      );
    }

    const referenceMap = flattenJsonToMap(referenceFile.content);
    const referenceKeys = new Set(referenceMap.keys());
    const issues: PendingIssue[] = [];

    for (const targetLanguageId of params.targetLanguageIds) {
      const targetFile = fileByLanguageId.get(targetLanguageId);
      const targetMap = targetFile
        ? flattenJsonToMap(targetFile.content)
        : new Map<string, string>();
      const targetKeys = new Set(targetMap.keys());
      const misnestedTargetKeys = new Set<string>();

      // Includes intermediate nodes and empty containers so structural
      // differences don't produce false-positive MISSING_KEY reports.
      const targetAllPaths = targetFile
        ? collectAllNodePaths(targetFile.content)
        : new Set<string>();

      for (const key of referenceKeys) {
        if (targetKeys.has(key) || targetAllPaths.has(key)) {
          continue;
        }

        const misnestedKey = findMisnestedKey(key, targetKeys);
        if (misnestedKey) {
          misnestedTargetKeys.add(misnestedKey);
          issues.push({
            type: IssueType.INCORRECT_NESTING,
            key,
            languageId: targetLanguageId,
            referenceLanguageId: params.referenceLanguageId,
            details: {
              fileGroupName: params.fileGroupName,
              referenceValue: referenceMap.get(key) ?? '',
              expectedPath: key,
              foundPath: misnestedKey,
              foundValue: targetMap.get(misnestedKey) ?? '',
            },
          });

          continue;
        }

        issues.push({
          type: IssueType.MISSING_KEY,
          key,
          languageId: targetLanguageId,
          referenceLanguageId: params.referenceLanguageId,
          details: {
            fileGroupName: params.fileGroupName,
            referenceValue: referenceMap.get(key) ?? '',
          },
        });
      }

      for (const key of targetKeys) {
        if (!referenceKeys.has(key) && !misnestedTargetKeys.has(key)) {
          issues.push({
            type: IssueType.UNUSED_KEY,
            key,
            languageId: targetLanguageId,
            referenceLanguageId: params.referenceLanguageId,
            details: {
              fileGroupName: params.fileGroupName,
              targetValue: targetMap.get(key) ?? '',
            },
          });
        }
      }

      for (const key of referenceKeys) {
        if (!targetKeys.has(key)) {
          continue;
        }

        const referenceValue = referenceMap.get(key) ?? '';
        const targetValue = targetMap.get(key) ?? '';

        // An empty target value means the key exists but is not yet translated;
        // reporting interpolation mismatch in that case would be a false positive.
        if (
          !targetValue ||
          !hasInterpolationMismatch(referenceValue, targetValue)
        ) {
          continue;
        }

        issues.push({
          type: IssueType.INTERPOLATION_MISMATCH,
          key,
          languageId: targetLanguageId,
          referenceLanguageId: params.referenceLanguageId,
          details: {
            fileGroupName: params.fileGroupName,
            referenceValue,
            targetValue,
            referenceVariables: extractInterpolationVars(referenceValue),
            targetVariables: extractInterpolationVars(targetValue),
          },
        });
      }
    }

    return issues;
  }
}
