/**
 * useExpenses — ViewModel for the Expenses page.
 * Handles CRUD, filtering, receipt upload, and export.
 */
import { useState, useCallback, useEffect } from 'react';
import { apiGet, apiMutate, apiUpload, apiDownload, apiFetch } from '@/hooks/useApi';
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

const DEFAULT_FORM: ExpenseForm = {
  category: '', description: '', vendor_name: '',
  amount_excl_vat: '', vat_rate: '21.00',
  expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'bank_transfer', is_paid: true, paid_date: '',
  reference_number: '', is_recurring: false, recurring_frequency: '',
  notes: '', status: 'approved',
};

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(DEFAULT_FORM);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/expenses/expenses/?year=${yearFilter}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      const data = await apiGet<unknown>(url);
      setExpenses(extractResults<Expense>(data));
    } catch (err) { console.error('Failed to load expenses', err); }
    finally { setLoading(false); }
  }, [yearFilter, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/expenses/categories/');
      setCategories(extractResults<ExpenseCategory>(data));
    } catch (err) { console.error('Failed to load categories', err); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Actions
  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setReceiptFile(null);
    setShowModal(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      description: expense.description,
      vendor_name: expense.vendor_name,
      amount_excl_vat: expense.amount_excl_vat,
      vat_rate: expense.vat_rate,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      is_paid: expense.is_paid,
      paid_date: expense.paid_date || '',
      reference_number: expense.reference_number,
      is_recurring: expense.is_recurring,
      recurring_frequency: expense.recurring_frequency,
      notes: '',
      status: expense.status,
    });
    setReceiptFile(null);
    setShowModal(true);
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
      if (receiptFile) formData.append('receipt_file', receiptFile);

      const url = editingId
        ? `/expenses/expenses/${editingId}/`
        : '/expenses/expenses/';
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiFetch(url, { method, body: formData });
      if (res.ok) {
        setShowModal(false);
        fetchExpenses();
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
      fetchExpenses();
    } catch (err) { console.error('Delete failed', err); }
  };

  const handleExport = async () => {
    await apiDownload(`/expenses/expenses/export/?year=${yearFilter}`, `Aangifte_${yearFilter}.xlsx`);
  };

  // Update form helper
  const updateForm = (updates: Partial<ExpenseForm>) => setForm(prev => ({ ...prev, ...updates }));

  // Filtered list
  const filtered = expenses.filter(exp => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return exp.vendor_name.toLowerCase().includes(q)
        || exp.description.toLowerCase().includes(q)
        || exp.category_name?.toLowerCase().includes(q);
    }
    return true;
  });

  // Totals
  const totalExpenses = filtered.reduce((sum, e) => sum + parseFloat(e.total_amount || '0'), 0);
  const totalVat = filtered.reduce((sum, e) => sum + parseFloat(e.vat_amount || '0'), 0);
  const expenseCount = filtered.length;

  return {
    // Data
    expenses: filtered, categories, loading,
    totalExpenses, totalVat, expenseCount,
    // Filters
    yearFilter, setYearFilter, categoryFilter, setCategoryFilter,
    searchQuery, setSearchQuery,
    // Modal
    showModal, setShowModal, editingId, form, updateForm,
    receiptFile, setReceiptFile, saving,
    // Actions
    openCreate, openEdit, handleSave, handleDelete, handleExport,
    refetch: fetchExpenses,
  };
}
