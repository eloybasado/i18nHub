import { session } from './session';
import type { AuthResponse } from './types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

async function parseResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      session.clear();
    }
    return null;
  }

  const data = (await parseResponse(response)) as AuthResponse;
  session.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function getFreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  let accessToken = session.getAccessToken();

  if (options.auth && !accessToken && session.getRefreshToken()) {
    accessToken = await getFreshAccessToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth) {
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  let response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (options.auth && response.status === 401) {
    const refreshedToken = await getFreshAccessToken();

    if (refreshedToken) {
      headers.Authorization = `Bearer ${refreshedToken}`;
      response = await fetch(`${API_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && options.auth) {
      // Only clear and redirect if refresh already confirmed the tokens are invalid.
      // If tokens are still present, the refresh endpoint failed transiently — don't log the user out.
      if (!session.getRefreshToken()) {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    if (response.status === 413) {
      throw new Error('Los archivos son demasiado grandes para cargar');
    }

    const message = data?.message ?? `Request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}
