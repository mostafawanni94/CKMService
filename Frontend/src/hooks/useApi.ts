/**
 * useApi — the single authenticated API client for the dashboard.
 *
 * Every request goes through `apiFetch`, which attaches the bearer token and,
 * on a 401, transparently refreshes it and retries once. Access tokens are now
 * short-lived (one hour), so without this the dashboard would log people out
 * every hour mid-task.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/** Called when the session cannot be renewed. Set once, by the dashboard shell. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/**
 * In-flight refresh, shared by every caller.
 *
 * A dashboard page fires many requests at once. Without coalescing, each 401
 * would start its own refresh, and because the server rotates refresh tokens
 * and blacklists the old one, all but the first would fail and log the user out.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.access) return false;
      // ROTATE_REFRESH_TOKENS is on server-side, so store the new refresh token
      // too or the next renewal presents a blacklisted one.
      setTokens(data.access, data.refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Resolve a caller-supplied endpoint to a request URL.
 *
 * Callers pass three shapes: a relative path (`/customers/`), a path that
 * already carries the API prefix (built as `${API_URL}/customers/`), and an
 * absolute URL (a DRF pagination `next` link, which is same-origin).
 *
 * A cross-origin absolute URL is refused outright. Every request through this
 * client carries the user's bearer token, so letting a third-party URL through
 * would hand that token to whoever owns the host — which is exactly what
 * happened when a codemod swept the public PDOK postcode lookup in here. Call
 * plain `fetch` for third-party services.
 */
function resolveUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    if (typeof window !== 'undefined') {
      const target = new URL(endpoint);
      if (target.origin !== window.location.origin) {
        throw new Error(
          `apiFetch refuses the cross-origin URL ${target.origin} because it would ` +
          `send the user's access token there. Use plain fetch() for third-party APIs.`
        );
      }
    }
    return endpoint;
  }
  if (endpoint === API_URL || endpoint.startsWith(`${API_URL}/`)) return endpoint;
  return `${API_URL}${endpoint}`;
}

function buildHeaders(options: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Only set Content-Type for JSON — FormData sets its own boundary.
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * Raw authenticated fetch — returns the Response object.
 *
 * Retries once after refreshing when the server answers 401. A body that is a
 * `ReadableStream` cannot be replayed, but every caller here passes a string or
 * FormData, both of which can.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const send = () =>
    fetch(resolveUrl(endpoint), { ...options, headers: buildHeaders(options) });

  let response = await send();

  if (response.status === 401 && getRefreshToken()) {
    if (await refreshAccessToken()) {
      response = await send();
    } else {
      clearTokens();
      onSessionExpired?.();
    }
  }

  return response;
}

/**
 * Turn any failed Response into a readable message.
 *
 * Callers used to do `const d = await response.json(); throw new Error(d.detail)`,
 * which had two failure modes: a Django HTML error page threw
 * "Unexpected token '<'" instead of anything useful, and DRF field errors
 * (`{"user_email": ["..."]}`) were dropped because only `detail` was read.
 */
export async function readApiError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const body = await response.text().catch(() => '');
  if (!body) return fallback;

  // A Django debug page or an HTML proxy error, not JSON.
  if (body.trimStart().startsWith('<')) {
    return response.status >= 500
      ? `Server error (${response.status}). Check the backend logs for details.`
      : fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body.slice(0, 300) || fallback;
  }

  if (typeof parsed === 'string') return parsed;
  if (!parsed || typeof parsed !== 'object') return fallback;

  const data = parsed as Record<string, unknown>;
  for (const key of ['detail', 'error', 'message']) {
    if (typeof data[key] === 'string') return data[key] as string;
  }

  // DRF field errors: {"field": ["msg", ...], "non_field_errors": [...]}.
  const parts: string[] = [];
  for (const [field, value] of Object.entries(data)) {
    const text = Array.isArray(value) ? value.join(' ') : String(value);
    if (!text) continue;
    parts.push(field === 'non_field_errors' ? text : `${field}: ${text}`);
  }
  return parts.length ? parts.join('\n') : fallback;
}

/** Throw a readable Error when a Response is not ok. */
export async function throwIfNotOk(response: Response): Promise<Response> {
  if (!response.ok) throw new Error(await readApiError(response));
  return response;
}

/** Typed GET request. */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(await readApiError(res));
  if (res.status === 204) return {} as T;
  return res.json();
}

/** Typed POST/PUT/PATCH/DELETE with JSON body. */
export async function apiMutate<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const res = await apiFetch(endpoint, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readApiError(res));
  if (res.status === 204) return {} as T;
  return res.json();
}

/** Upload file via FormData. */
export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST'
): Promise<T> {
  const res = await apiFetch(endpoint, { method, body: formData });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

/** Download a file as blob (for Excel exports etc). */
export async function apiDownload(endpoint: string, filename: string): Promise<void> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(await readApiError(res));
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ─── Hook: useFetch ──────────────────────────────────────────

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching data on mount / when deps change.
 * Auto-handles loading, errors, and deduplication.
 */
export function useFetch<T>(
  endpoint: string | null,
  deps: unknown[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<T>(endpoint);
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [endpoint, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Hook: useMutation ──────────────────────────────────────

interface UseMutationResult<T> {
  mutate: (body?: Record<string, unknown>) => Promise<T>;
  loading: boolean;
  error: unknown | null;
}

/**
 * Hook for POST/PUT/PATCH/DELETE mutations.
 * Returns a mutate function, loading state, and error.
 */
export function useMutation<T>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
): UseMutationResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const mutate = useCallback(async (body?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiMutate<T>(endpoint, method, body);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, method]);

  return { mutate, loading, error };
}

export { API_URL };
