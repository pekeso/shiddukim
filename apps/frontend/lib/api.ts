'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
}

async function doRefreshToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function buildHeaders(token: string | null, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!(extra instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (extra) {
    Object.entries(extra as Record<string, string>).forEach(([k, v]) => {
      headers[k] = v;
    });
  }
  return headers;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const makeRequest = async (tok: string | null) => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    // Merge extra headers from options
    const extraHeaders = options.headers as Record<string, string> | undefined;
    if (extraHeaders) {
      Object.entries(extraHeaders).forEach(([k, v]) => {
        headers[k] = v;
      });
    }
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let res = await makeRequest(token);

  if (res.status === 401) {
    const newToken = await doRefreshToken();
    if (!newToken) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/connexion';
      }
      throw new ApiRequestError(401, 'Session expirée. Veuillez vous reconnecter.');
    }
    res = await makeRequest(newToken);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({ message: 'Erreur serveur' }));

  if (!res.ok) {
    throw new ApiRequestError(res.status, body.message ?? 'Une erreur est survenue.');
  }

  return body as T;
}

// ── Convenience wrappers ─────────────────────────────────────
export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
