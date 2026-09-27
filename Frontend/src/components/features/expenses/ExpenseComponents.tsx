/**
 * Expense feature components — pure UI for the Expenses page.
 */
'use client';

import React from 'react';
import { Receipt, Trash2, Edit3, Upload, Euro, FileText, Eye, Download } from 'lucide-react';
import {
  Modal, Button, Input, Select, FormGrid, Badge,
  DataTable, StatCard, EmptyState
} from '@/components/ui/shared';
import type { Column } from '@/components/ui/shared';
import { colors, spacing, fontSize, fontWeight } from '@/styles/tokens';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { mediaHref, mediaName } from '@/lib/media';
import { PAYMENT_METHODS, VAT_RATES } from '@/lib/types';
import type { ExpenseForm } from '@/hooks/useExpenses';
import { useLanguage } from '@/lib/i18n';

// ─── Stat Cards Row ─────────────────────────────────────────

interface ExpenseStatsProps {
  count: number;
  total: number;
  totalVat: number;
}

export function ExpenseStats({ count, total, totalVat }: ExpenseStatsProps) {
    const { t } = useLanguage();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
      <StatCard label={t('Expenses')} value={count} icon={<Receipt size={20} color={colors.primary} />} color={colors.primary} />
      <StatCard label={t('Total (incl. BTW)')} value={`€${total.toFixed(2)}`} icon={<Euro size={20} color={colors.danger} />} color={colors.dangerDark} />
      <StatCard label={t('BTW Paid')} value={`€${totalVat.toFixed(2)}`} icon={<Euro size={20} color={colors.info} />} color="#1E40AF" />
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
    const { t } = useLanguage();
  const columns: Column<Expense>[] = [
    {
      key: 'date', header: t('Date'),
      render: (e) => <span style={{ fontWeight: fontWeight.semibold }}>{e.expense_date}</span>
    },
    {
      key: 'vendor', header: t('Vendor'),
      render: (e) => (
        <div>
          <div style={{ fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{e.vendor_name}</div>
          <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>{e.description}</div>
        </div>
      )
    },
    {
      key: 'category', header: t('Category'),
      render: (e) => (
        <Badge color={e.category_color || colors.textSecondary} bg={`${e.category_color}18` || colors.bgAlt}>
          {e.category_name}
        </Badge>
      )
    },
    {
      key: 'amount', header: t('Amount'), align: 'right',
      render: (e) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: fontWeight.bold }}>€{parseFloat(e.total_amount).toFixed(2)}</div>
          <div style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
            excl. €{parseFloat(e.amount_excl_vat).toFixed(2)} + {e.vat_rate}% BTW
          </div>
        </div>
      )
    },
    {
      key: 'payment', header: t('Payment'),
      render: (e) => <span style={{ fontSize: fontSize.md, color: colors.textMuted }}>{e.payment_method_display}</span>
    },
    {
      key: 'receipt', header: t('Receipt'), align: 'center',
      render: (e) => {
        const href = mediaHref(e.receipt_url);
        if (!href) return <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>—</span>;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer"
            title={e.receipt_name || t('View receipt')}
            style={{ display: 'inline-flex', color: colors.primary, padding: '4px' }}>
            <FileText size={16} />
          </a>
        );
      }
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
      )
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={expenses}
      loading={loading}
      rowKey={(e) => e.id}
      emptyIcon={<Receipt size={44} />}
      emptyTitle={t('No expenses found')}
      emptySubtitle={t('Add your first expense to start tracking.')}
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
  /** The document already on file, when editing. */
  currentReceipt?: { url: string | null; name: string | null } | null;
  /** What the document states, so an untouched form previews the stored
   *  figures rather than re-deriving them. */
  stated?: { net: string; rate: string; vat: string; total: string } | null;
}

export function ExpenseModal({
  open, onClose, title, form, updateForm,
  categories, receiptFile, setReceiptFile, onSave, saving,
  currentReceipt, stated
}: ExpenseModalProps) {
    const { t } = useLanguage();
  const href = mediaHref(currentReceipt?.url);
  const storedName = currentReceipt?.name || mediaName(currentReceipt?.url, t('Receipt'));

  // Preview. While the amounts are untouched, show what the document states —
  // several receipts print a VAT a cent away from net x rate, and that is the
  // figure that will be saved.
  const amountExcl = parseFloat(form.amount_excl_vat) || 0;
  const vatRate = parseFloat(form.vat_rate) || 0;
  const untouched = !!stated && stated.net === form.amount_excl_vat && stated.rate === form.vat_rate;
  const vatAmount = untouched && stated.vat ? parseFloat(stated.vat) : amountExcl * vatRate / 100;
  const total = untouched && stated.total ? parseFloat(stated.total) : amountExcl + vatAmount;

  return (
    <Modal open={open} onClose={onClose} title={title} width="640px" footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={onSave} loading={saving}>{t('Save Expense')}</Button>
      </>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
        <FormGrid>
          <Select
            label={t('Category')}
            value={form.category}
            onChange={v => updateForm({ category: v })}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder={t('Select category...')}
            required
          />
          <Input label={t('Vendor Name')} value={form.vendor_name} onChange={v => updateForm({ vendor_name: v })} required />
        </FormGrid>

        <Input label={t('Description')} value={form.description} onChange={v => updateForm({ description: v })} />

        <FormGrid columns={3}>
          <Input label={t('Amount (excl. BTW)')} value={form.amount_excl_vat} onChange={v => updateForm({ amount_excl_vat: v })} type="number" step="0.01" required />
          <Select
            label={t('BTW Rate')}
            value={form.vat_rate}
            onChange={v => updateForm({ vat_rate: v })}
            options={VAT_RATES.map(r => ({ value: r.value, label: r.label }))}
          />
          <div>
            <label style={{ display: 'block', fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: '6px' }}>
              {t('Total (incl. BTW)')}
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
          <Input label={t('Date')} value={form.expense_date} onChange={v => updateForm({ expense_date: v })} type="date" required />
          <Select
            label={t('Payment Method')}
            value={form.payment_method}
            onChange={v => updateForm({ payment_method: v })}
            options={PAYMENT_METHODS.map(p => ({ value: p.value, label: p.label }))}
          />
        </FormGrid>

        <FormGrid>
          <Input label={t('Reference #')} value={form.reference_number} onChange={v => updateForm({ reference_number: v })} placeholder={t('Invoice / receipt number')} />
          <div>
            <label style={{ display: 'block', fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: '6px' }}>
              {t('Receipt (Photo/PDF)')}
            </label>

            {/* The stored document, if there is one. Without this the form
                only ever offered an upload box, so an invoice that was already
                filed could not be read back or saved off. */}
            {href && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                marginBottom: '8px', background: colors.bgAlt, borderRadius: '8px',
              }}>
                <FileText size={16} color={colors.primary} style={{ flexShrink: 0 }} />
                <span title={storedName} style={{
                  flex: 1, minWidth: 0, fontSize: fontSize.sm, color: colors.textSecondary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{storedName}</span>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, textDecoration: 'none', flexShrink: 0 }}>
                  <Eye size={14} />{t('View')}
                </a>
                <a href={href} download={storedName}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, textDecoration: 'none', flexShrink: 0 }}>
                  <Download size={14} />{t('Download')}
                </a>
              </div>
            )}

            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              border: `1.5px dashed ${colors.border}`, borderRadius: '8px', cursor: 'pointer',
              fontSize: fontSize.base, color: colors.textMuted
            }}>
              <Upload size={16} />
              {receiptFile ? receiptFile.name : (href ? t('Replace file...') : t('Choose file...'))}
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
            </label>
            {href && receiptFile && (
              <div style={{ marginTop: '6px', fontSize: fontSize.xs, color: colors.warning ?? colors.textMuted }}>
                {t('Saving will replace the stored document.')}
              </div>
            )}
          </div>
        </FormGrid>
      </div>
    </Modal>
  );
}
