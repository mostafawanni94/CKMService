/**
 * useFinanceDashboard — ViewModel for the finance overview.
 *
 * Every figure comes from the backend's own reporting module, which reads the
 * same records the VAT return reads. The browser does no arithmetic on money.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/hooks/useApi';

export interface RevenueBlock {
    invoiced_net: string;
    invoiced_vat: string;
    invoiced_gross: string;
    invoice_count: number;
    credited_net: string;
    credited_gross: string;
    credit_note_count: number;
    net_revenue: string;
    gross_revenue: string;
    cancelled_uncredited_net: string;
}

export interface CostBlock {
    supplier_net: string;
    agency_net: string;
    expense_net: string;
    total_net: string;
    supplier_count: number;
    agency_count: number;
    expense_count: number;
}

export interface Receivables {
    total_outstanding: string;
    overdue_count: number;
    ageing: {
        current: string;
        days_1_30: string;
        days_31_60: string;
        days_61_90: string;
        days_90_plus: string;
    };
}

export interface Payables {
    supplier_outstanding: string;
    agency_outstanding: string;
    employee_wallets: string;
    total: string;
}

export interface VatPeriodSummary {
    id: string;
    quarter: number;
    label: string;
    status: string;
    is_closed: boolean;
    box_5a: string;
    box_5b: string;
    vat_position: string;
    outcome: 'PAYABLE' | 'REFUNDABLE' | 'ZERO';
    requires_review_count: number;
}

export interface MonthPoint {
    month: number;
    label: string;
    revenue: string;
    costs: string;
    margin: string;
}

export interface FinanceDashboard {
    year: number;
    quarter: number | null;
    period_start: string;
    period_end: string;
    revenue: RevenueBlock;
    costs: CostBlock;
    gross_margin: string;
    receivables: Receivables;
    payables: Payables;
    vat_periods: VatPeriodSummary[];
    requires_review_count: number;
    monthly: MonthPoint[];
    top_customers: Array<{ customer_id: string; customer: string; net: string; invoices: number }>;
}

export function useFinanceDashboard() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState<number | null>(null);
    const [data, setData] = useState<FinanceDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const query = `year=${year}${quarter ? `&quarter=${quarter}` : ''}`;
            setData(await apiGet<FinanceDashboard>(`/vat/dashboard/?${query}`));
        } catch {
            setError('Could not load the finance overview.');
        } finally {
            setLoading(false);
        }
    }, [year, quarter]);

    useEffect(() => { load(); }, [load]);

    return { year, setYear, quarter, setQuarter, data, loading, error, refetch: load };
}
