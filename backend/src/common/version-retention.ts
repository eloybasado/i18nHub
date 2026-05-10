import { Prisma } from '@prisma/client';

export async function pruneTranslationFileVersions(
  tx: Prisma.TransactionClient,
  translationFileId: string,
  keepLatest: number,
) {
  if (keepLatest < 1) {
    return;
  }

  const obsoleteVersions = await tx.translationFileVersion.findMany({
    where: {
      translationFileId,
    },
    orderBy: {
      versionNumber: 'desc',
    },
    skip: keepLatest,
    select: {
      id: true,
    },
  });

  if (obsoleteVersions.length === 0) {
    return;
  }

  await tx.translationFileVersion.deleteMany({
    where: {
      id: {
        in: obsoleteVersions.map((version) => version.id),
      },
    },
  });
}

export async function pruneProjectTranslationFileVersions(
  tx: Prisma.TransactionClient,
  projectId: string,
  keepLatest: number,
) {
  if (keepLatest < 1) {
    return;
  }

  const translationFiles = await tx.translationFile.findMany({
    where: {
      fileGroup: {
        projectId,
      },
    },
    select: {
      id: true,
    },
  });

  for (const translationFile of translationFiles) {
    await pruneTranslationFileVersions(tx, translationFile.id, keepLatest);
  }
}
