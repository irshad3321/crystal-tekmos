import { BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly kind: 'configuration' | 'network' | 'timeout' | 'invalid-response' | 'http' | 'cancelled' = 'http',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE_URL || !/^https?:\/\//i.test(BASE_URL)) {
    throw new ApiError('Set EXPO_PUBLIC_API_BASE_URL to your computer\'s LAN address and port 5000.', undefined, 'configuration');
  }

  let response: Response;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 10000);
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch {
      if (options.signal?.aborted) throw new ApiError('Request cancelled.', undefined, 'cancelled');
      if (timedOut) throw new ApiError('Crystal API request timed out. Check the backend connection.', undefined, 'timeout');
      throw new ApiError('Cannot reach the Crystal API. Check the backend address and Wi-Fi connection.', undefined, 'network');
    }

    if (!response.ok) {
      let message = `Crystal API returned HTTP ${response.status}.`;
      try {
        const body: unknown = await response.json();
        if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
          message = body.message;
        }
      } catch {
        if (options.signal?.aborted) throw new ApiError('Request cancelled.', undefined, 'cancelled');
        if (timedOut) throw new ApiError('Crystal API request timed out. Check the backend connection.', undefined, 'timeout');
      }
      throw new ApiError(message, response.status);
    }

    try {
      return await response.json() as T;
    } catch {
      if (options.signal?.aborted) throw new ApiError('Request cancelled.', undefined, 'cancelled');
      if (timedOut) throw new ApiError('Crystal API request timed out. Check the backend connection.', undefined, 'timeout');
      throw new ApiError('Crystal API returned an invalid JSON response.', response.status, 'invalid-response');
    }
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

export function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { method: 'POST', body, signal, timeoutMs: 30000 });
}
