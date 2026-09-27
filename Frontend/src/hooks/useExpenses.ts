/**
 * useExpenses — ViewModel for the Expenses page.
 * Handles CRUD, filtering, receipt upload, and export.
 *
 * The list is paged by the server and the header cards come from
 * `/expenses/expenses/totals/`, which aggregates the same filtered set in the
 * database. Summing the rows in the browser only ever described the page on
 * screen: with the API's default page of 20, a year holding 54 expenses
 * reported "20" and a total covering the three most recent weeks.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiGet, apiMutate, apiDownload, apiFetch } from '@/hooks/useApi';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { extractResults } from '@/lib/types';
import type { Expense, ExpenseCategory } from '@/lib/types';

export interface ExpenseForm {
  category: string;
  description: string;
  vendor_name: string;
  amount_excl_vat: string;
  vat_rate: string;
  expense_date: string;
  payment_method: string;
  is_paid: boolean;
  paid_date: string;
  reference_number: string;
  is_recurring: boolean;
  recurring_frequency: string;
  notes: string;
  status: string;
}

export interface ExpenseTotals {
  count: number;
  total_excl_vat: string;
  total_vat: string;
  total_incl_vat: string;
  by_category: { code: string; name: string; count: number; total: string }[];
}

const DEFAULT_FORM: ExpenseForm = {
  category: '', description: '', vendor_name: '',
  amount_excl_vat: '', vat_rate: '21.00',
  expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'bank_transfer', is_paid: true, paid_date: '',
  reference_number: '', is_recurring: false, recurring_frequency: '',
  notes: '', status: 'approved'
};

const EMPTY_TOTALS: ExpenseTotals = {
  count: 0, total_excl_vat: '0.00', total_vat: '0.00', total_incl_vat: '0.00',
  by_category: [],
};

export function useExpenses() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState('');
  const [totals, setTotals] = useState<ExpenseTotals>(EMPTY_TOTALS);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(DEFAULT_FORM);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentReceipt, setCurrentReceipt] =
    useState<{ url: string | null; name: string | null } | null>(null);
  // What the document states, kept so an edit that leaves the amounts alone
  // does not silently re-derive them.
  const [statedAmounts, setStatedAmounts] =
    useState<{ net: string; rate: string; vat: string; total: string } | null>(null);

  // Typing filters the server, so let the user finish the word first.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchQuery.trim()), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const params = useMemo(() => ({
    year: yearFilter,
    category: categoryFilter,
    search,
  }), [yearFilter, categoryFilter, search]);

  const list = usePaginatedList<Expense>('/expenses/expenses/', { params });

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (yearFilter) q.set('year', yearFilter);
    if (categoryFilter) q.set('category', categoryFilter);
    if (search) q.set('search', search);
    return q.toString();
  }, [yearFilter, categoryFilter, search]);

  const fetchTotals = useCallback(async () => {
    try {
      setTotals(await apiGet<ExpenseTotals>(`/expenses/expenses/totals/?${query}`));
    } catch (err) {
      console.error('Failed to load expense totals', err);
      setTotals(EMPTY_TOTALS);
    }
  }, [query]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/expenses/categories/?page_size=100');
      setCategories(extractResults<ExpenseCategory>(data));
    } catch (err) { console.error('Failed to load categories', err); }
  }, []);

  useEffect(() => { fetchTotals(); }, [fetchTotals]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const reload = useCallback(async () => {
    await Promise.all([list.reload(), fetchTotals()]);
  }, [list, fetchTotals]);

  // Actions
  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setStatedAmounts(null);
    setCurrentReceipt(null);
    setReceiptFile(null);
    setShowModal(true);
  };

  /**
   * Fill the form from the detail endpoint, never from the list row.
   *
   * The list serializer is deliberately thin — no notes, no VAT treatment, no
   * stated amounts — so a form filled from a row and sent back writes those
   * fields away.
   */
  const openEdit = async (expense: Expense) => {
    setEditingId(expense.id);
    setReceiptFile(null);
    setCurrentReceipt(null);
    setStatedAmounts(null);
    setShowModal(true);
    setLoadingDetail(true);
    try {
      const d = await apiGet<Expense & { notes?: string }>(`/expenses/expenses/${expense.id}/`);
      setStatedAmounts({
        net: d.amount_excl_vat, rate: d.vat_rate,
        vat: d.vat_amount ?? '', total: d.total_amount ?? '',
      });
      setCurrentReceipt({
        url: d.receipt_url ?? d.receipt_file ?? null,
        name: d.receipt_name ?? null,
      });
      setForm({
        category: d.category,
        description: d.description ?? '',
        vendor_name: d.vendor_name ?? '',
        amount_excl_vat: d.amount_excl_vat,
        vat_rate: d.vat_rate,
        expense_date: d.expense_date,
        payment_method: d.payment_method,
        is_paid: d.is_paid,
        paid_date: d.paid_date || '',
        reference_number: d.reference_number ?? '',
        is_recurring: d.is_recurring,
        recurring_frequency: d.recurring_frequency ?? '',
        notes: d.notes ?? '',
        status: d.status,
      });
    } catch (err) {
      console.error('Failed to load expense', err);
      alert('Could not load this expense.');
      setShowModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      // `notes` is cleared by sending it empty, which the loop above skips.
      if (form.notes === '') formData.append('notes', '');

      // An edit that does not touch the net amount or the rate keeps whatever
      // the document stated, rather than letting save() re-derive it — several
      // receipts print a VAT that differs by a cent from net x rate.
      const s = statedAmounts;
      if (editingId && s && s.net === form.amount_excl_vat && s.rate === form.vat_rate) {
        if (s.vat) formData.append('vat_amount', s.vat);
        if (s.total) formData.append('total_amount', s.total);
      }
      if (receiptFile) formData.append('receipt_file', receiptFile);

      const url = editingId
        ? `/expenses/expenses/${editingId}/`
        : '/expenses/expenses/';
      // PATCH, not PUT: the form carries a subset of the record, and a full
      // replace blanks the VAT treatment, the stored receipt and the rest.
      const method = editingId ? 'PATCH' : 'POST';

      const res = await apiFetch(url, { method, body: formData });
      if (res.ok) {
        setShowModal(false);
        await reload();
      } else {
        const err = await res.json();
        alert(`Error: ${JSON.stringify(err)}`);
      }
    } catch (err) { alert('Failed to save expense'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await apiMutate(`/expenses/expenses/${id}/`, 'DELETE');
      await reload();
    } catch (err) { console.error('Delete failed', err); }
  };

  const handleExport = async () => {
    await apiDownload(`/expenses/expenses/export/?year=${yearFilter}`, `Aangifte_${yearFilter}.xlsx`);
  };

  // Update form helper
  const updateForm = (updates: Partial<ExpenseForm>) => setForm(prev => ({ ...prev, ...updates }));

  // A filter change must send the reader back to page one, or a narrower
  // result set strands them on a page that no longer exists.
  const withReset = <T,>(set: (v: T) => void) => (value: T) => {
    list.setPage(1);
    set(value);
  };

  return {
    // Data
    expenses: list.rows, categories, loading: list.loading,
    totalExpenses: parseFloat(totals.total_incl_vat || '0'),
    totalVat: parseFloat(totals.total_vat || '0'),
    expenseCount: totals.count,
    totals,
    // Paging
    page: list.page, setPage: list.setPage,
    pageSize: list.pageSize, setPageSize: list.setPageSize,
    totalPages: list.totalPages, totalCount: list.totalCount,
    // Filters
    yearFilter, setYearFilter: withReset(setYearFilter),
    categoryFilter, setCategoryFilter: withReset(setCategoryFilter),
    searchQuery, setSearchQuery: withReset(setSearchQuery),
    // Modal
    showModal, setShowModal, editingId, form, updateForm, loadingDetail,
    receiptFile, setReceiptFile, saving, currentReceipt, statedAmounts,
    // Actions
    openCreate, openEdit, handleSave, handleDelete, handleExport,
    refetch: reload
  };
}
