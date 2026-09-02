'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch, apiGetAll } from '@/hooks/useApi';

export interface WalletTransaction {
    id: string;
    transaction_type: string;
    transaction_type_display: string;
    amount: string;
    description: string;
    status: string;
    balance_after: string;
    created_at: string;
}

export interface EmployeeWallet {
    id: number;
    employee_name: string;
    balance: string;
    total_earnings: string;
    total_advances: string;
    recent_transactions: WalletTransaction[];
    updated_at: string;
}

export interface PendingAdvance {
    id: string;
    employee_name: string;
    amount: number | string;
    reason: string;
    created_at: string;
}

export interface WalletViewModel {
    wallets: EmployeeWallet[];
    advances: PendingAdvance[];
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
    totalBalance: number;
    totalEarnings: number;
    pendingTotal: number;
    approve: (id: string) => Promise<void>;
    reject: (id: string, reason: string) => Promise<void>;
    busyId: string | null;
    actionError: string | null;
    selected: EmployeeWallet | null;
    setSelected: (wallet: EmployeeWallet | null) => void;
}

const num = (value: unknown): number => {
    const parsed = parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

export function useWallet(): WalletViewModel {
    const [wallets, setWallets] = useState<EmployeeWallet[]>([]);
    const [advances, setAdvances] = useState<PendingAdvance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [selected, setSelected] = useState<EmployeeWallet | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // The advances endpoint returns a bare list, not a page.
            const [walletRows, advanceResponse] = await Promise.all([
                apiGetAll<EmployeeWallet>('/wallet/wallets/'),
                apiFetch('/wallet/advances/pending/'),
            ]);
            setWallets(walletRows);
            setAdvances(advanceResponse.ok ? await advanceResponse.json() : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void reload(); }, [reload]);

    const act = useCallback(async (
        id: string, path: string, body?: Record<string, unknown>,
    ) => {
        setBusyId(id);
        setActionError(null);
        try {
            const response = await apiFetch(`/wallet/advances/${id}/${path}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const detail = await response.json().catch(() => null);
                throw new Error(detail?.detail || detail?.error || `Request failed (${response.status})`);
            }
            await reload();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusyId(null);
        }
    }, [reload]);

    return {
        wallets,
        advances,
        loading,
        error,
        reload,
        totalBalance: wallets.reduce((sum, w) => sum + num(w.balance), 0),
        totalEarnings: wallets.reduce((sum, w) => sum + num(w.total_earnings), 0),
        pendingTotal: advances.reduce((sum, a) => sum + num(a.amount), 0),
        approve: (id) => act(id, 'approve'),
        reject: (id, reason) => act(id, 'reject', { reason }),
        busyId,
        actionError,
        selected,
        setSelected,
    };
}
