/**
 * Incoming (supplier) invoices — /api/invoices/incoming-invoices/.
 *
 * The page previously had a full UI wired to `setInvoices([])` and a
 * "TODO: Replace with actual API call when backend is ready" comment.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiGet, apiMutate } from '@/hooks/useApi';
import { extractResults } from '@/lib/types';

export interface IncomingInvoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  vendor_vat_number: string;
  agency: string | null;
  agency_name: string | null;
  description: string;
  category: string | null;
  category_name: string | null;
  invoice_date: string;
  due_date: string | null;
  paid_date: string | null;
  subtotal: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'disputed' | 'cancelled';
  notes: string;
  is_overdue: boolean;
  days_until_due: number | null;
}

export interface IncomingInvoiceSummary {
  total_count: number;
  pending_count: number;
  pending_total: string;
  overdue_count: number;
  overdue_total: string;
  paid_count: number;
  paid_total: string;
}

export interface IncomingInvoiceForm {
  invoice_number: string;
  vendor_name: string;
  vendor_vat_number: string;
  description: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  vat_rate: string;
  status: string;
  notes: string;
}

const DEFAULT_FORM: IncomingInvoiceForm = {
  invoice_number: '',
  vendor_name: '',
  vendor_vat_number: '',
  description: '',
  invoice_date: new Date().toISOString().split('T')[0],
  due_date: '',
  subtotal: '',
  vat_rate: '21.00',
  status: 'pending',
  notes: '',
};

export function useIncomingInvoices() {
  const [invoices, setInvoices] = useState<IncomingInvoice[]>([]);
  const [summary, setSummary] = useState<IncomingInvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IncomingInvoiceForm>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const [list, totals] = await Promise.all([
        apiGet<unknown>(`/invoices/incoming-invoices/${query}`),
        apiGet<IncomingInvoiceSummary>('/invoices/incoming-invoices/summary/'),
      ]);
      setInvoices(extractResults<IncomingInvoice>(list));
      setSummary(totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incoming invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateForm = useCallback(
    (key: keyof IncomingInvoiceForm, value: string) =>
      setForm(prev => ({ ...prev, [key]: value })),
    [],
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((invoice: IncomingInvoice) => {
    setEditingId(invoice.id);
    setForm({
      invoice_number: invoice.invoice_number,
      vendor_name: invoice.vendor_name,
      vendor_vat_number: invoice.vendor_vat_number,
      description: invoice.description,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date ?? '',
      subtotal: invoice.subtotal,
      vat_rate: invoice.vat_rate,
      status: invoice.status,
      notes: invoice.notes,
    });
    setShowModal(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // The API derives vat_amount and total from subtotal x rate.
      const body: Record<string, unknown> = {
        ...form,
        due_date: form.due_date || null,
      };
      if (editingId) {
        await apiMutate(`/invoices/incoming-invoices/${editingId}/`, 'PATCH', body);
      } else {
        await apiMutate('/invoices/incoming-invoices/', 'POST', body);
      }
      setShowModal(false);
      await load();
      return true;
    } catch (err) {
      const detail = (err as { detail?: string })?.detail;
      setError(detail ?? 'Could not save the invoice.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, editingId, load]);

  const markPaid = useCallback(async (id: string) => {
    await apiMutate(`/invoices/incoming-invoices/${id}/mark_paid/`, 'POST', {});
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await apiMutate(`/invoices/incoming-invoices/${id}/`, 'DELETE');
    await load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.vendor_name?.toLowerCase().includes(term) ||
      inv.description?.toLowerCase().includes(term));
  }, [invoices, searchQuery]);

  return {
    invoices: filtered, summary, loading, error,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    showModal, setShowModal, editingId, form, updateForm, saving,
    openCreate, openEdit, save, markPaid, remove, reload: load,
  };
}
