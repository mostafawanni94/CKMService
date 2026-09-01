/**
 * useVatPeriods — ViewModel for the BTW Aangifte page.
 *
 * Every figure shown comes from the backend's own return calculation. Nothing
 * here recomputes VAT: the browser must never be a second source of truth for
 * what gets filed.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiMutate } from '@/hooks/useApi';

export interface VatPeriod {
    id: number;
    label: string;
    year: number;
    quarter: number;
    start_date: string;
    end_date: string;
    status: string;
    is_closed: boolean;
    finalized_at: string | null;
    finalized_by: number | null;
    locked_at: string | null;
    reopened_at: string | null;
    reopen_reason: string;
    rules_version: string;
    notes: string;
}

export interface VatBox {
    code: string;
    label: string;
    label_nl: string;
    taxable_base: string;
    vat_amount: string;
    entry_count: number;
    source_count: number;
}

export interface VatReturn {
    period: string;
    year: number;
    quarter: number;
    start_date: string;
    end_date: string;
    status: string;
    boxes: VatBox[];
    box_5a: string;
    box_5b: string;
    vat_position: string;
    outcome: 'PAYABLE' | 'REFUNDABLE' | 'ZERO';
    amount_payable: string;
    amount_refundable: string;
    requires_review_count: number;
    rules_version: string;
    calculated_at: string;
}

export interface VatBlocker {
    code: string;
    message: string;
    entries?: Array<{ id: number; reference: string; reason: string }>;
}

export interface VatEvent {
    event: string;
    detail: string;
    actor: string | null;
    at: string;
}

const currentYear = new Date().getFullYear();

export function useVatPeriods() {
    const [year, setYear] = useState(currentYear);
    const [periods, setPeriods] = useState<VatPeriod[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [vatReturn, setVatReturn] = useState<VatReturn | null>(null);
    const [blockers, setBlockers] = useState<VatBlocker[]>([]);
    const [events, setEvents] = useState<VatEvent[]>([]);
    const [expandedBox, setExpandedBox] = useState<string | null>(null);
    const [boxEntries, setBoxEntries] = useState<Record<string, unknown[]>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = periods.find(p => p.id === selectedId) ?? null;

    const loadPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGet<{ results?: VatPeriod[] } | VatPeriod[]>(
                `/vat/periods/?year=${year}&ordering=quarter&page_size=4`);
            const list = Array.isArray(data) ? data : (data.results ?? []);
            setPeriods(list);
            setSelectedId(prev =>
                list.some(p => p.id === prev) ? prev : (list[0]?.id ?? null));
        } catch {
            setError('Could not load VAT periods.');
        } finally {
            setLoading(false);
        }
    }, [year]);

    const loadReturn = useCallback(async (periodId: number) => {
        setError(null);
        try {
            const [ret, blk, evt] = await Promise.all([
                apiMutate<VatReturn>(`/vat/periods/${periodId}/return/`, 'POST'),
                apiGet<{ blockers: VatBlocker[] }>(`/vat/periods/${periodId}/blockers/`),
                apiGet<VatEvent[]>(`/vat/periods/${periodId}/events/`),
            ]);
            setVatReturn(ret);
            setBlockers(blk.blockers ?? []);
            setEvents(evt ?? []);
        } catch {
            setError('Could not calculate this period.');
        }
    }, []);

    useEffect(() => { loadPeriods(); }, [loadPeriods]);
    useEffect(() => {
        if (selectedId == null) { setVatReturn(null); return; }
        setExpandedBox(null);
        setBoxEntries({});
        loadReturn(selectedId);
    }, [selectedId, loadReturn]);

    /** Boxes stay open once opened, and their entries are fetched once. */
    const toggleBox = useCallback(async (code: string) => {
        if (expandedBox === code) { setExpandedBox(null); return; }
        setExpandedBox(code);
        if (selectedId == null || boxEntries[code]) return;
        try {
            const data = await apiGet<{ results?: unknown[] }>(
                `/vat/periods/${selectedId}/boxes/${code}/?page_size=100`);
            setBoxEntries(prev => ({ ...prev, [code]: data.results ?? [] }));
        } catch {
            setBoxEntries(prev => ({ ...prev, [code]: [] }));
        }
    }, [expandedBox, selectedId, boxEntries]);

    const act = useCallback(async (
        action: 'finalize' | 'lock' | 'reopen', body: Record<string, unknown> = {},
    ) => {
        if (selectedId == null) return false;
        setBusy(true);
        setError(null);
        try {
            await apiMutate(`/vat/periods/${selectedId}/${action}/`, 'POST', body);
            await loadPeriods();
            await loadReturn(selectedId);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not ${action} this period.`);
            return false;
        } finally {
            setBusy(false);
        }
    }, [selectedId, loadPeriods, loadReturn]);

    const ensureYear = useCallback(async () => {
        setBusy(true);
        try {
            await apiMutate('/vat/periods/ensure/', 'POST', { year });
            await loadPeriods();
        } finally {
            setBusy(false);
        }
    }, [year, loadPeriods]);

    return {
        year, setYear, periods, selected, selectedId, setSelectedId,
        vatReturn, blockers, events, expandedBox, boxEntries, toggleBox,
        loading, busy, error,
        canFinalize: blockers.length === 0 && !!selected && !selected.is_closed,
        finalize: (note: string) => act('finalize', { note }),
        lock: () => act('lock'),
        reopen: (reason: string) => act('reopen', { reason }),
        ensureYear, refetch: loadPeriods,
    };
}
