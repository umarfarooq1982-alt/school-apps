// HTTP client for the school API. Every response is the envelope
// { statusCode, success, message, data }; callers get `data` or an ApiError.
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { getSession, isExpired } from './session';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type UploadFile = { uri: string; name: string; type: string };

type Options = {
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  file?: UploadFile; // sent as multipart field "file" with body fields beside it
  auth?: boolean; // default true
  headers?: Record<string, string>;
};

let onUnauthorized: (() => void) | null = null;

// The app registers this to sign the user out when the token is rejected.
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function buildUrl(path: string, query?: Options['query']) {
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

export async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  const auth = opts.auth !== false;
  if (auth) {
    const s = getSession();
    if (!s || isExpired(s, 0)) {
      onUnauthorized?.();
      throw new ApiError(401, 'Your session has ended. Please sign in again.');
    }
    headers.Authorization = `Bearer ${s.token}`;
    if (s.campusId && s.campusId !== 'all') {
      headers['X-Campus-Id'] = s.campusId;
    }
    if (s.sessionId) {
      headers['X-Session-Id'] = s.sessionId;
    }
    if (s.childId) {
      headers['X-Child-Id'] = String(s.childId);
    }
  }

  let body: FormData | string | undefined;
  if (opts.file) {
    const form = new FormData();
    Object.entries((opts.body as Record<string, unknown>) || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    // React Native's FormData accepts { uri, name, type } for files.
    form.append('file', opts.file as unknown as Blob);
    body = form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body, signal: controller.signal });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(0, aborted ? 'The server took too long to answer. Please try again.' : 'No internet connection. Please check your network.');
  } finally {
    clearTimeout(timer);
  }

  let json: { success?: boolean; message?: string; data?: unknown } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.status === 401 && auth) {
    onUnauthorized?.();
    throw new ApiError(401, 'Your session has ended. Please sign in again.');
  }
  if (!res.ok || !json || json.success === false) {
    const message =
      json?.message && json.message !== 'Something went wrong. Please try again.'
        ? json.message
        : res.status >= 500
        ? 'The server had a problem. Please try again in a moment.'
        : json?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string, query?: Options['query']) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, file?: UploadFile) => request<T>('POST', path, { body, file }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    return e.message;
  }
  return (e as Error)?.message || 'Something went wrong.';
}
