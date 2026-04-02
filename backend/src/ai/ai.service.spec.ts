import { ForbiddenException } from '@nestjs/common';
import { GlobalRole, Tier } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import { AiService } from './ai.service';

describe('AiService', () => {
  const llmProviderMock = {
    suggestBatch: jest.fn(),
  };

  const service = new AiService(llmProviderMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws for FREE users', async () => {
    const user: JwtPayload = {
      sub: 'user-1',
      email: 'free@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.FREE,
    };

    await expect(
      service.suggestTranslations(user, {
        targetLanguageCode: 'fr',
        items: [{ key: 'home.title', referenceText: 'Home' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delegates to LLM provider for PRO users', async () => {
    llmProviderMock.suggestBatch.mockResolvedValue([
      {
        key: 'home.title',
        suggestion: 'Accueil',
        reason: 'Natural UI wording in French',
      },
    ]);

    const user: JwtPayload = {
      sub: 'user-2',
      email: 'pro@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
    };

    const result = await service.suggestTranslations(user, {
      targetLanguageCode: 'fr',
      items: [{ key: 'home.title', referenceText: 'Home' }],
    });

    expect(llmProviderMock.suggestBatch).toHaveBeenCalledWith({
      targetLanguageCode: 'fr',
      items: [{ key: 'home.title', referenceText: 'Home' }],
    });
    expect(result.count).toBe(1);
  });
});
