import { BASE_URL } from './config';
import { ERROR_MESSAGES } from '@/constants/errorMessages';

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
    throw new ApiError(ERROR_MESSAGES.MISSING_API_URL, undefined, 'configuration');
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
      if (options.signal?.aborted) throw new ApiError(ERROR_MESSAGES.REQUEST_CANCELLED, undefined, 'cancelled');
      if (timedOut) throw new ApiError(ERROR_MESSAGES.REQUEST_TIMEOUT, undefined, 'timeout');
      throw new ApiError(ERROR_MESSAGES.NETWORK_UNAVAILABLE, undefined, 'network');
    }

    if (!response.ok) {
      let message = ERROR_MESSAGES.HTTP_STATUS(response.status);
      try {
        const body: unknown = await response.json();
        if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
          message = body.message;
        }
      } catch {
        if (options.signal?.aborted) throw new ApiError(ERROR_MESSAGES.REQUEST_CANCELLED, undefined, 'cancelled');
        if (timedOut) throw new ApiError(ERROR_MESSAGES.REQUEST_TIMEOUT, undefined, 'timeout');
      }
      throw new ApiError(message, response.status);
    }

    try {
      return await response.json() as T;
    } catch {
      if (options.signal?.aborted) throw new ApiError(ERROR_MESSAGES.REQUEST_CANCELLED, undefined, 'cancelled');
      if (timedOut) throw new ApiError(ERROR_MESSAGES.REQUEST_TIMEOUT, undefined, 'timeout');
      throw new ApiError(ERROR_MESSAGES.INVALID_JSON, response.status, 'invalid-response');
    }
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { signal });
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { method: 'POST', body, signal, timeoutMs: 30000 });
}
