/**
 * useApi — Base hook for authenticated API calls.
 * All data fetching hooks should use this as their foundation.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/** Raw authenticated fetch — returns the Response object. */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Only set Content-Type for JSON — FormData sets it automatically
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

/** Typed GET request. */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw err;
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw err;
  }
  return res.json();
}

/** Download a file as blob (for Excel exports etc). */
export async function apiDownload(endpoint: string, filename: string): Promise<void> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error('Download failed');
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
