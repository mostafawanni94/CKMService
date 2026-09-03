'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/hooks/useApi';

/**
 * One page of a list, filtered by the server.
 *
 * Pages that fetched every row so they could search in the browser do not
 * scale: at a thousand records that is a thousand rows over the wire to render
 * twenty-five, and the count in the header is only right because everything is
 * already in memory. This asks the server for a page and a count instead.
 *
 * A filter change resets to page one, otherwise a narrower result set leaves
 * the reader stranded on a page that no longer exists.
 */
export interface PaginatedList<T> {
    rows: T[];
    loading: boolean;
    error: string | null;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    totalCount: number;
    totalPages: number;
    rangeStart: number;
    rangeEnd: number;
    reload: () => Promise<void>;
}

export interface PaginatedListOptions {
    /** Extra query parameters. Values that are empty are left off. */
    params?: Record<string, string | string[] | number | boolean | undefined | null>;
    pageSize?: number;
    /** Skip fetching until the caller is ready (e.g. a required filter is unset). */
    enabled?: boolean;
}

function buildQuery(
    params: PaginatedListOptions['params'], page: number, pageSize: number,
): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
        if (value === undefined || value === null || value === '' || value === false) continue;
        if (Array.isArray(value)) {
            value.filter(Boolean).forEach(v => query.append(key, String(v)));
        } else {
            query.set(key, String(value));
        }
    }
    query.set('page', String(page));
    query.set('page_size', String(pageSize));
    return query.toString();
}

export function usePaginatedList<T>(
    endpoint: string, options: PaginatedListOptions = {},
): PaginatedList<T> {
    const { params, pageSize: initialPageSize = 25, enabled = true } = options;

    const [rows, setRows] = useState<T[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [totalCount, setTotalCount] = useState(0);

    // Serialised so the effect compares by value, not by object identity.
    const paramKey = JSON.stringify(params ?? {});

    // Any change of filter puts the reader back on the first page.
    useEffect(() => { setPage(1); }, [paramKey, pageSize]);

    const reload = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            const query = buildQuery(JSON.parse(paramKey), page, pageSize);
            const response = await apiFetch(`${endpoint}?${query}`);
            if (!response.ok) throw new Error(`Request failed (${response.status})`);
            const data = await response.json();
            // A bare list means the endpoint is not paginated; treat it as one page.
            if (Array.isArray(data)) {
                setRows(data);
                setTotalCount(data.length);
            } else {
                setRows(data.results ?? []);
                setTotalCount(data.count ?? 0);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [endpoint, paramKey, page, pageSize, enabled]);

    useEffect(() => { void reload(); }, [reload]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return useMemo(() => ({
        rows,
        loading,
        error,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalCount,
        totalPages,
        rangeStart: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
        rangeEnd: Math.min(page * pageSize, totalCount),
        reload,
    }), [rows, loading, error, page, pageSize, totalCount, totalPages, reload]);
}
