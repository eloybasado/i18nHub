import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  extractInterpolationVars,
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
        : new Map();
      const targetKeys = new Set(targetMap.keys());

      for (const key of referenceKeys) {
        if (!targetKeys.has(key)) {
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
      }

      for (const key of targetKeys) {
        if (!referenceKeys.has(key)) {
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

        if (!hasInterpolationMismatch(referenceValue, targetValue)) {
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
