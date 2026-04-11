import { GlobalRole, PrismaClient, Tier } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const FREE_USER_EMAIL = process.env.SEED_FREE_EMAIL ?? 'free@i18nhub.local';
const PRO_USER_EMAIL = process.env.SEED_PRO_EMAIL ?? 'pro@i18nhub.local';
const FREE_USER_NAME = process.env.SEED_FREE_NAME ?? 'Usuario Free';
const PRO_USER_NAME = process.env.SEED_PRO_NAME ?? 'Usuario Pro';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'ChangeMe123!';

async function upsertSeedUser(params: {
  email: string;
  name: string;
  tier: Tier;
  passwordHash: string;
}) {
  await prisma.user.upsert({
    where: {
      email: params.email,
    },
    update: {
      name: params.name,
      tier: params.tier,
      passwordHash: params.passwordHash,
      refreshTokenHash: null,
    },
    create: {
      email: params.email,
      name: params.name,
      role: GlobalRole.MEMBER,
      tier: params.tier,
      passwordHash: params.passwordHash,
    },
  });
}

async function main() {
  if (DEFAULT_PASSWORD.length < 8) {
    throw new Error('SEED_DEFAULT_PASSWORD must be at least 8 characters long');
  }

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  await upsertSeedUser({
    email: FREE_USER_EMAIL,
    name: FREE_USER_NAME,
    tier: Tier.FREE,
    passwordHash,
  });

  await upsertSeedUser({
    email: PRO_USER_EMAIL,
    name: PRO_USER_NAME,
    tier: Tier.PRO,
    passwordHash,
  });

  process.stdout.write(
    [
      'Seed completed',
      `FREE -> ${FREE_USER_EMAIL}`,
      `PRO  -> ${PRO_USER_EMAIL}`,
      `Password -> ${DEFAULT_PASSWORD}`,
    ].join('\n') + '\n',
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
