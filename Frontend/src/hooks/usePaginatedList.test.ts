import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { usePaginatedList } from './usePaginatedList';

const page = (count: number, results: unknown[]) => ({
    ok: true, status: 200, json: async () => ({ count, results }),
});

describe('usePaginatedList', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        localStorage.setItem('access_token', 'test-token');
        fetchMock = vi.fn().mockResolvedValue(page(0, []));
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    const urls = () => fetchMock.mock.calls.map(c => String(c[0]));

    it('asks for one page, not every row', async () => {
        fetchMock.mockResolvedValue(page(199, [{ id: 1 }]));
        const { result } = renderHook(() => usePaginatedList('/worklogs/entries/'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(urls()[0]).toContain('page=1');
        expect(urls()[0]).toContain('page_size=25');
        expect(result.current.totalCount).toBe(199);
        expect(result.current.totalPages).toBe(8);
    });

    it('reports the range being shown', async () => {
        fetchMock.mockResolvedValue(page(199, [{ id: 1 }]));
        const { result } = renderHook(() => usePaginatedList('/x/'));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => result.current.setPage(3));
        await waitFor(() => expect(result.current.page).toBe(3));
        expect(result.current.rangeStart).toBe(51);
        expect(result.current.rangeEnd).toBe(75);
    });

    it('says 0 of 0 rather than 1 when there is nothing', async () => {
        const { result } = renderHook(() => usePaginatedList('/x/'));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rangeStart).toBe(0);
        expect(result.current.rangeEnd).toBe(0);
    });

    it('drops empty filters instead of sending blanks', async () => {
        renderHook(() => usePaginatedList('/x/', {
            params: { search: '', status: 'approved', employee: [] },
        }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(urls()[0]).not.toContain('search=');
        expect(urls()[0]).not.toContain('employee=');
        expect(urls()[0]).toContain('status=approved');
    });

    it('repeats a key for each value in a list', async () => {
        renderHook(() => usePaginatedList('/x/', {
            params: { status: ['approved', 'rejected'] },
        }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(urls()[0]).toContain('status=approved&status=rejected');
    });

    it('returns to page one when a filter changes', async () => {
        fetchMock.mockResolvedValue(page(199, [{ id: 1 }]));
        const { result, rerender } = renderHook(
            ({ search }) => usePaginatedList('/x/', { params: { search } }),
            { initialProps: { search: '' } },
        );
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => result.current.setPage(4));
        await waitFor(() => expect(result.current.page).toBe(4));

        // Narrowing the set must not leave the reader on a page that is gone.
        rerender({ search: 'jansen' });
        await waitFor(() => expect(result.current.page).toBe(1));
    });

    it('treats a bare array as a single page', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1 }, { id: 2 }] });
        const { result } = renderHook(() => usePaginatedList('/x/'));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rows).toHaveLength(2);
        expect(result.current.totalCount).toBe(2);
    });

    it('surfaces a failure instead of showing a silently empty list', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
        const { result } = renderHook(() => usePaginatedList('/x/'));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toContain('500');
    });

    it('does not fetch until it is enabled', async () => {
        renderHook(() => usePaginatedList('/x/', { enabled: false }));
        await new Promise(r => setTimeout(r, 20));
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
