import { BASE_URL } from './config';

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getJson<T>(path: string): Promise<T> {
  if (!BASE_URL || !/^https?:\/\//i.test(BASE_URL)) {
    throw new ApiError('Set EXPO_PUBLIC_API_BASE_URL to your computer\'s LAN address and port 5000.');
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
  } catch {
    if (controller.signal.aborted) throw new ApiError('Crystal API request timed out. Check the backend connection.');
    throw new ApiError('Cannot reach the Crystal API. Check the backend address and Wi-Fi connection.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `Crystal API returned HTTP ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        message = body.message;
      }
    } catch { /* Non-JSON error response. */ }
    throw new ApiError(message, response.status);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new ApiError('Crystal API returned an invalid JSON response.', response.status);
  }
}
