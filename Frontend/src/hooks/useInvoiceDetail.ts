/**
 * useInvoiceDetail — ViewModel for one customer invoice or credit note.
 *
 * The backend decides everything: what the lines cost, what VAT applies, and
 * whether the document may be issued. This hook only asks and reports.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiDownload, apiGet, apiMutate } from '@/hooks/useApi';

export interface InvoiceLine {
    id: string;
    project: string | null;
    project_name: string | null;
    employee: string | null;
    employee_name: string | null;
    description: string;
    line_type: 'service' | 'credit' | 'manual';
    work_date: string | null;
    quantity_hours: string;
    hourly_rate: string;
    total: string;
    base_amount: string | null;
    surcharge_amount: string | null;
    allowance_amount: string | null;
    surcharge_breakdown: Array<{ name: string; percentage: string; hours: string; amount: string }>;
    vat_treatment_code: string;
    vat_rate: string | null;
    net_amount: string | null;
    vat_amount: string | null;
    vat_return_box: string;
    vat_classification_status: string;
    vat_review_reason: string;
}

export interface InvoiceDetail {
    id: string;
    invoice_number: string;
    document_type: 'invoice' | 'credit_note';
    billing_mode: 'weekly' | 'period';
    status: string;
    customer: string;
    customer_name: string;
    project: string | null;
    week_year: number;
    week_number: number;
    period_start: string | null;
    period_end: string | null;
    issue_date: string | null;
    due_date: string | null;
    paid_date: string | null;
    subtotal: string;
    total_costs: string;
    total_allowances: string;
    total_gratuities: string;
    vat_rate: string;
    vat_amount: string;
    total: string;
    amount_paid: string;
    amount_due: string;
    credited_total: string;
    net_of_credits: string;
    unclassified_line_count: number;
    has_reverse_charged_lines: boolean;
    is_issued: boolean;
    corrects: string | null;
    corrects_number: string | null;
    correction_reason: string;
    notes: string;
    internal_notes: string;
    sent_at: string | null;
    sent_to: string;
    pdf_url: string | null;
    lines: InvoiceLine[];
    credit_notes: Array<{ id: string; invoice_number: string; total: string; issue_date: string }>;
}

export interface IssueBlocker {
    code: string;
    message: string;
    lines?: Array<{ id: string; description: string; reason: string }>;
}

export function useInvoiceDetail(invoiceId: string) {
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [blockers, setBlockers] = useState<IssueBlocker[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [detail, gate] = await Promise.all([
                apiGet<InvoiceDetail>(`/invoices/invoices/${invoiceId}/`),
                apiGet<{ blockers: IssueBlocker[] }>(`/invoices/invoices/${invoiceId}/blockers/`),
            ]);
            setInvoice(detail);
            setBlockers(gate.blockers ?? []);
        } catch {
            setError('Deze factuur kon niet worden geladen.');
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => { load(); }, [load]);

    const run = useCallback(async <T,>(
        path: string, body: Record<string, unknown> = {},
    ): Promise<T | null> => {
        setBusy(true);
        setError(null);
        try {
            const result = await apiMutate<T>(
                `/invoices/invoices/${invoiceId}/${path}/`, 'POST', body);
            await load();
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Dit lukte niet.');
            return null;
        } finally {
            setBusy(false);
        }
    }, [invoiceId, load]);

    const downloadPdf = useCallback(async () => {
        if (!invoice) return;
        await apiDownload(`/invoices/invoices/${invoiceId}/pdf/?download=1`,
                          `${invoice.invoice_number}.pdf`);
    }, [invoiceId, invoice]);

    return {
        invoice, blockers, loading, busy, error,
        canIssue: blockers.length === 0 && !!invoice && !invoice.is_issued,
        issue: () => run('issue'),
        creditNote: (reason: string, lineIds?: string[]) =>
            run('credit-note', lineIds?.length ? { reason, line_ids: lineIds } : { reason }),
        recordPayment: (amount: string, paidDate?: string) =>
            run('record-payment', paidDate ? { amount, paid_date: paidDate } : { amount }),
        send: (email?: string) => run('send', email ? { email } : {}),
        downloadPdf,
        refetch: load,
    };
}
