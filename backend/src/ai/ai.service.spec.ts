import { ForbiddenException } from '@nestjs/common';
import { GlobalRole, Tier } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import { AiService } from './ai.service';

describe('AiService', () => {
  const prismaMock = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const llmProviderMock = {
    suggestBatch: jest.fn(),
  };

  const service = new AiService(prismaMock as never, llmProviderMock);
  const projectId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.project.findUnique.mockResolvedValue({
      id: projectId,
      aiContext: null,
      aiGlossary: null,
    });

    prismaMock.project.update.mockResolvedValue({
      aiContext: 'Tono profesional',
      aiGlossary: [
        {
          sourceTerm: 'Book Hunter',
          targetTerm: 'Book Hunter',
          languageCodes: ['es'],
        },
      ],
    });
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

  it('passes optional context to provider when present', async () => {
    llmProviderMock.suggestBatch.mockResolvedValue([
      {
        key: 'checkout.total',
        suggestion: 'Total',
      },
    ]);

    const user: JwtPayload = {
      sub: 'user-3',
      email: 'pro2@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
    };

    await service.suggestTranslations(user, {
      targetLanguageCode: 'es',
      context: 'Producto ecommerce B2C, tono cercano',
      items: [{ key: 'checkout.total', referenceText: 'Total' }],
    });

    expect(llmProviderMock.suggestBatch).toHaveBeenCalledWith({
      targetLanguageCode: 'es',
      context: 'Producto ecommerce B2C, tono cercano',
      items: [{ key: 'checkout.total', referenceText: 'Total' }],
    });
  });

  it('passes glossary entries to provider when present', async () => {
    llmProviderMock.suggestBatch.mockResolvedValue([
      {
        key: 'brand.hero',
        suggestion: 'Book Hunter',
      },
    ]);

    const user: JwtPayload = {
      sub: 'user-4',
      email: 'pro3@test.com',
      role: GlobalRole.MEMBER,
      tier: Tier.PRO,
    };

    await service.suggestTranslations(user, {
      targetLanguageCode: 'es',
      glossary: [
        {
          sourceTerm: 'Book Hunter',
          targetTerm: 'Book Hunter',
          languageCodes: ['es', 'fr'],
        },
      ],
      items: [{ key: 'brand.hero', referenceText: 'Book Hunter' }],
    });

    expect(llmProviderMock.suggestBatch).toHaveBeenCalledWith({
      targetLanguageCode: 'es',
      glossary: [
        {
          sourceTerm: 'Book Hunter',
          targetTerm: 'Book Hunter',
          languageCodes: ['es', 'fr'],
        },
      ],
      items: [{ key: 'brand.hero', referenceText: 'Book Hunter' }],
    });
  });

  it('returns empty AI context settings when project has none', async () => {
    const result = await service.getContextSettings(projectId);

    expect(result).toEqual({
      context: '',
      glossary: [],
    });
  });

  it('updates and returns normalized AI context settings', async () => {
    const result = await service.updateContextSettings(projectId, {
      context: '  Tono profesional  ',
      glossary: [
        {
          sourceTerm: '  Book Hunter ',
          targetTerm: ' Book Hunter  ',
          languageCodes: [' es ', ''],
        },
      ],
    });

    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: projectId,
        },
        data: expect.objectContaining({
          aiContext: 'Tono profesional',
          aiGlossary: [
            {
              sourceTerm: 'Book Hunter',
              targetTerm: 'Book Hunter',
              languageCodes: ['es'],
            },
          ],
        }),
      }),
    );

    expect(result).toEqual({
      context: 'Tono profesional',
      glossary: [
        {
          sourceTerm: 'Book Hunter',
          targetTerm: 'Book Hunter',
          languageCodes: ['es'],
        },
      ],
    });
  });
});
