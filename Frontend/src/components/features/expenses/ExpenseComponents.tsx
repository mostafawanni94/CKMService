/**
 * Expense feature components — pure UI for the Expenses page.
 */
'use client';

import React from 'react';
import { Receipt, Trash2, Edit3, Upload, Euro } from 'lucide-react';
import {
  Modal, Button, Input, Select, FormGrid, Badge,
  DataTable, StatCard, EmptyState,
} from '@/components/ui/shared';
import type { Column } from '@/components/ui/shared';
import { colors, spacing, fontSize, fontWeight } from '@/styles/tokens';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { PAYMENT_METHODS, VAT_RATES } from '@/lib/types';
import type { ExpenseForm } from '@/hooks/useExpenses';

// ─── Stat Cards Row ─────────────────────────────────────────

interface ExpenseStatsProps {
  count: number;
  total: number;
  totalVat: number;
}

export function ExpenseStats({ count, total, totalVat }: ExpenseStatsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
      <StatCard label="Expenses" value={count} icon={<Receipt size={20} color={colors.primary} />} color={colors.primary} />
      <StatCard label="Total (incl. BTW)" value={`€${total.toFixed(2)}`} icon={<Euro size={20} color={colors.danger} />} color={colors.dangerDark} />
      <StatCard label="BTW Paid" value={`€${totalVat.toFixed(2)}`} icon={<Euro size={20} color={colors.info} />} color="#1E40AF" />
    </div>
  );
}

// ─── Expense Table ──────────────────────────────────────────

interface ExpenseTableProps {
  expenses: Expense[];
  loading: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTable({ expenses, loading, onEdit, onDelete }: ExpenseTableProps) {
  const columns: Column<Expense>[] = [
    {
      key: 'date', header: 'Date',
      render: (e) => <span style={{ fontWeight: fontWeight.semibold }}>{e.expense_date}</span>,
    },
    {
      key: 'vendor', header: 'Vendor',
      render: (e) => (
        <div>
          <div style={{ fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{e.vendor_name}</div>
          <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{e.description}</div>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: (e) => (
        <Badge color={e.category_color || colors.textSecondary} bg={`${e.category_color}18` || colors.bgAlt}>
          {e.category_name}
        </Badge>
      ),
    },
    {
      key: 'amount', header: 'Amount', align: 'right',
      render: (e) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: fontWeight.bold }}>€{parseFloat(e.total_amount).toFixed(2)}</div>
          <div style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
            excl. €{parseFloat(e.amount_excl_vat).toFixed(2)} + {e.vat_rate}% BTW
          </div>
        </div>
      ),
    },
    {
      key: 'payment', header: 'Payment',
      render: (e) => <span style={{ fontSize: fontSize.md, color: colors.textMuted }}>{e.payment_method_display}</span>,
    },
    {
      key: 'actions', header: '',
      render: (e) => (
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <button onClick={() => onEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, padding: '4px' }}>
            <Edit3 size={16} />
          </button>
          <button onClick={() => onDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, padding: '4px' }}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={expenses}
      loading={loading}
      rowKey={(e) => e.id}
      emptyIcon={<Receipt size={44} />}
      emptyTitle="No expenses found"
      emptySubtitle="Add your first expense to start tracking."
    />
  );
}

// ─── Expense Form Modal ─────────────────────────────────────

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  form: ExpenseForm;
  updateForm: (updates: Partial<ExpenseForm>) => void;
  categories: ExpenseCategory[];
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  onSave: () => void;
  saving: boolean;
}

export function ExpenseModal({
  open, onClose, title, form, updateForm,
  categories, receiptFile, setReceiptFile, onSave, saving,
}: ExpenseModalProps) {
  // Calculate preview
  const amountExcl = parseFloat(form.amount_excl_vat) || 0;
  const vatRate = parseFloat(form.vat_rate) || 0;
  const vatAmount = amountExcl * vatRate / 100;
  const total = amountExcl + vatAmount;

  return (
    <Modal open={open} onClose={onClose} title={title} width="640px" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} loading={saving}>Save Expense</Button>
      </>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
        <FormGrid>
          <Select
            label="Category"
            value={form.category}
            onChange={v => updateForm({ category: v })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select category..."
            required
          />
          <Input label="Vendor Name" value={form.vendor_name} onChange={v => updateForm({ vendor_name: v })} required />
        </FormGrid>

        <Input label="Description" value={form.description} onChange={v => updateForm({ description: v })} />

        <FormGrid columns={3}>
          <Input label="Amount (excl. BTW)" value={form.amount_excl_vat} onChange={v => updateForm({ amount_excl_vat: v })} type="number" step="0.01" required />
          <Select
            label="BTW Rate"
            value={form.vat_rate}
            onChange={v => updateForm({ vat_rate: v })}
            options={VAT_RATES.map(r => ({ value: r.value, label: r.label }))}
          />
          <div>
            <label style={{ display: 'block', fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: '6px' }}>
              Total (incl. BTW)
            </label>
            <div style={{ padding: '10px 14px', background: colors.bgAlt, borderRadius: '8px', fontWeight: fontWeight.bold, fontSize: fontSize.lg }}>
              €{total.toFixed(2)}
              <span style={{ fontSize: fontSize.xs, color: colors.textMuted, marginLeft: '8px' }}>
                (BTW: €{vatAmount.toFixed(2)})
              </span>
            </div>
          </div>
        </FormGrid>

        <FormGrid>
          <Input label="Date" value={form.expense_date} onChange={v => updateForm({ expense_date: v })} type="date" required />
          <Select
            label="Payment Method"
            value={form.payment_method}
            onChange={v => updateForm({ payment_method: v })}
            options={PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }))}
          />
        </FormGrid>

        <FormGrid>
          <Input label="Reference #" value={form.reference_number} onChange={v => updateForm({ reference_number: v })} placeholder="Invoice / receipt number" />
          <div>
            <label style={{ display: 'block', fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: '6px' }}>
              Receipt (Photo/PDF)
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              border: `1.5px dashed ${colors.border}`, borderRadius: '8px', cursor: 'pointer',
              fontSize: fontSize.base, color: colors.textMuted,
            }}>
              <Upload size={16} />
              {receiptFile ? receiptFile.name : 'Choose file...'}
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </FormGrid>
      </div>
    </Modal>
  );
}
