import { GlobalRole, Tier } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: GlobalRole;
  tier: Tier;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: GlobalRole;
    tier: Tier;
  };
};
