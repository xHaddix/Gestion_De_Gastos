import type { ApiEnvelope } from '../types/document';

const BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${BASE}${path}`, options);

  if (!response.ok) {
    let message = 'Ocurrió un error inesperado';
    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new Error(message);
  }

  return (await response.json()) as ApiEnvelope<T>;
}

export const api = {
  get<T>(path: string): Promise<ApiEnvelope<T>> {
    return request<T>(path);
  },

  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
    return request<T>(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  upload<T>(path: string, formData: FormData): Promise<ApiEnvelope<T>> {
    return request<T>(path, { method: 'POST', body: formData });
  },

  patch<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
    return request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<ApiEnvelope<T>> {
    return request<T>(path, { method: 'DELETE' });
  },
};
