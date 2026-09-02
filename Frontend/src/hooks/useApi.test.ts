/**
 * The single API client.
 *
 * Everything in the dashboard goes through `apiFetch`, so its behaviour is the
 * one thing worth pinning before anything else is refactored.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGetAll } from '@/hooks/useApi';

vi.mock('@/lib/auth', () => ({
    getAccessToken: () => 'test-token',
    getRefreshToken: () => 'test-refresh',
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
}));

function jsonResponse(body: unknown, status = 200) {
    return {
        ok: status < 400,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as unknown as Response;
}

describe('apiGetAll', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('follows the next link to the end', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({
                results: [{ id: 1 }, { id: 2 }],
                next: '/employees/profiles/?page=2&page_size=100',
            }))
            .mockResolvedValueOnce(jsonResponse({
                results: [{ id: 3 }], next: null,
            }));
        vi.stubGlobal('fetch', fetchMock);

        const rows = await apiGetAll<{ id: number }>('/employees/profiles/');

        expect(rows.map(r => r.id)).toEqual([1, 2, 3]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('asks for a large page so most lists finish in one request', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({ results: [], next: null }));
        vi.stubGlobal('fetch', fetchMock);

        await apiGetAll('/customers/services/');

        expect(String(fetchMock.mock.calls[0][0])).toContain('page_size=100');
    });

    it('keeps an existing query string', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({ results: [], next: null }));
        vi.stubGlobal('fetch', fetchMock);

        await apiGetAll('/worklogs/?status=approved');

        expect(String(fetchMock.mock.calls[0][0]))
            .toContain('/worklogs/?status=approved&page_size=100');
    });

    it('returns an unpaginated list unchanged', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
            jsonResponse([{ id: 1 }, { id: 2 }])));

        expect(await apiGetAll('/employees/contract-types/')).toHaveLength(2);
    });

    it('stops at the page guard rather than looping forever', async () => {
        // A server that always advertises another page must not hang the tab.
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
            results: [{ id: 1 }], next: '/x/?page=2',
        }));
        vi.stubGlobal('fetch', fetchMock);

        const rows = await apiGetAll('/x/', { maxPages: 3 });

        expect(rows).toHaveLength(3);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});
