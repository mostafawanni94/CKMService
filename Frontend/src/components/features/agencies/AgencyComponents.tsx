/**
 * Agency feature components — pure UI for Agency detail page tabs.
 */
'use client';

import React from 'react';
import {
  Building2, Phone, MapPin, Hash, Users, FileText, Percent,
  Plus, CheckCircle, Clock, Euro, Sun, Moon, Star, Calendar
} from 'lucide-react';
import {
  SectionCard, Input, Select, TextArea, FormGrid,
  DataTable, StatusBadge, StatCard, EmptyState, Button, Modal
} from '@/components/ui/shared';
import type { Column } from '@/components/ui/shared';
import { colors, spacing, fontSize, fontWeight, presets } from '@/styles/tokens';
import type { Agency, AgencyEmployee, AgencyInvoice, SurchargeType } from '@/lib/types';
import type { SurchargeState } from '@/hooks/useAgencyDetail';
import styles from './AgencyComponents.module.css';
import { useLanguage } from '@/lib/i18n';

// ─── Overview Tab ───────────────────────────────────────────

interface OverviewTabProps {
  form: Agency;
  isNew: boolean;
  onChange: (updates: Partial<Agency>) => void;
  surchargeTypes: SurchargeType[];
  selectedSurcharges: SurchargeState;
  setSelectedSurcharges: React.Dispatch<React.SetStateAction<SurchargeState>>;
}

export function OverviewTab({ form, isNew, onChange, surchargeTypes, selectedSurcharges, setSelectedSurcharges }: OverviewTabProps) {
    const { t } = useLanguage();
  return (
    <div className={styles.overviewGrid}>
      {/* Basic Info */}
      <SectionCard title="Agency Information" icon={<Building2 size={18} color={colors.primary} />}>
        <div className={styles.fieldStack}>
          <Input label="Agency Name" value={form.name} onChange={v => onChange({ name: v })} required placeholder="e.g., Randstad" />
          <FormGrid>
            <Input label={t('Code')} value={form.code} onChange={v => onChange({ code: v.toUpperCase() })} required placeholder="e.g., RAND" />
            <Select label={t('Status')} value={form.is_active ? 'active' : 'inactive'}
              onChange={v => onChange({ is_active: v === 'active' })}
              options={[{ value: 'active', label: t('Active') }, { value: 'inactive', label: t('Inactive') }]} />
          </FormGrid>
          <TextArea label={t('Description')} value={form.description} onChange={v => onChange({ description: v })} />
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard title={t('Contact Information')} icon={<Phone size={18} color={colors.primary} />}>
        <div className={styles.fieldStack}>
          <Input label="Contact Person" value={form.contact_name} onChange={v => onChange({ contact_name: v })} placeholder="Full name" />
          <Input label={t('Email')} value={form.contact_email} onChange={v => onChange({ contact_email: v })} type="email" placeholder="email@agency.nl" />
          <Input label={t('Phone')} value={form.contact_phone} onChange={v => onChange({ contact_phone: v })} placeholder="+31 6 12345678" />
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title={t('Address')} icon={<MapPin size={18} color={colors.primary} />}>
        <div className={styles.fieldStack}>
          <div className={styles.addressRow}>
            <Input label="Street" value={form.street_name} onChange={v => onChange({ street_name: v })} />
            <Input label={t('House Nr.')} value={form.house_number} onChange={v => onChange({ house_number: v })} />
            <Input label="Addition" value={form.house_number_addition} onChange={v => onChange({ house_number_addition: v })} />
          </div>
          <FormGrid>
            <Input label={t('Postcode')} value={form.postcode} onChange={v => onChange({ postcode: v })} />
            <Input label={t('City')} value={form.city} onChange={v => onChange({ city: v })} />
          </FormGrid>
        </div>
      </SectionCard>

      {/* Legal */}
      <SectionCard title="Legal & Financial" icon={<Hash size={18} color={colors.primary} />}>
        <div className={styles.fieldStack}>
          <FormGrid>
            <Input label={t('KvK Number')} value={form.kvk_number} onChange={v => onChange({ kvk_number: v })} placeholder="12345678" />
            <Input label={t('BTW Number')} value={form.btw_number} onChange={v => onChange({ btw_number: v })} placeholder="NL123456789B01" />
          </FormGrid>
          <Input label={t('IBAN')} value={form.iban} onChange={v => onChange({ iban: v })} placeholder="NL91ABNA0417164300" />
          <Input label="Base Hourly Rate (€)" value={String(form.base_hourly_rate)} onChange={v => onChange({ base_hourly_rate: parseFloat(v) || 0 })} type="number" step="0.01" />
        </div>
      </SectionCard>

      {/* Surcharges (only on new) */}
      {isNew && (
        <div style={{ gridColumn: '1 / -1' }}>
          <SurchargesSection
            hasEnabled={form.has_surcharges}
            onToggle={v => onChange({ has_surcharges: v })}
            types={surchargeTypes}
            selected={selectedSurcharges}
            setSelected={setSelectedSurcharges}
          />
        </div>
      )}
    </div>
  );
}

// ─── Employees Tab ──────────────────────────────────────────

interface EmployeesTabProps {
  employees: AgencyEmployee[];
  loading: boolean;
  agencyName: string;
}

export function EmployeesTab({ employees, loading, agencyName }: EmployeesTabProps) {
    const { t } = useLanguage();
  const columns: Column<AgencyEmployee>[] = [
    {
      key: 'name', header: t('Name'),
      render: (e) => <span style={{ fontWeight: fontWeight.bold }}>{e.first_name} {e.last_name}</span>
    },
    { key: 'email', header: t('Email'), render: (e) => <span className={styles.mutedText}>{e.user_email}</span> },
    { key: 'phone', header: t('Phone'), render: (e) => <span className={styles.mutedText}>{e.phone_number}</span> },
    { key: 'status', header: t('Status'), render: (e) => <StatusBadge status={e.status} /> },
    {
      key: 'rate', header: t('Hourly Rate'),
      render: (e) => <span style={{ fontWeight: fontWeight.semibold }}>€{e.hourly_rate || '—'}</span>
    },
  ];

  return (
    <SectionCard title={`Employees at ${agencyName}`} icon={<Users size={18} color={colors.primary} />}>
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        rowKey={(e) => e.id}
        emptyIcon={<Users size={44} />}
        emptyTitle="No employees assigned"
        emptySubtitle="Assign employees to this agency from the employee's Contract tab."
      />
    </SectionCard>
  );
}

// ─── Billing Tab ────────────────────────────────────────────

interface BillingTabProps {
  invoices: AgencyInvoice[];
  loading: boolean;
  onGenerate: () => void;
  onRowClick: (inv: AgencyInvoice) => void;
}

export function BillingTab({ invoices, loading, onGenerate, onRowClick }: BillingTabProps) {
    const { t } = useLanguage();
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const pendingCount = invoices.filter(i => ['draft', 'pending', 'sent'].includes(i.status)).length;
  const totalValue = invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0);

  return (
    <div>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Invoices" value={invoices.length} icon={<FileText size={20} color="#3B82F6" />} color="#3B82F6" />
        <StatCard label={t('Paid')} value={paidCount} icon={<CheckCircle size={20} color="#10B981" />} color="#10B981" />
        <StatCard label={t('Pending')} value={pendingCount} icon={<Clock size={20} color="#F59E0B" />} color="#F59E0B" />
        <StatCard label="Total Value" value={`€${totalValue.toFixed(2)}`} icon={<Euro size={20} color="#8B5CF6" />} color="#8B5CF6" />
      </div>

      {/* Invoice list */}
      <SectionCard title={t('Agency Invoices')} actions={
        <Button onClick={onGenerate} icon={<Plus size={16} />} size="sm">Generate Invoice</Button>
      }>
        <DataTable
          columns={invoiceColumns}
          data={invoices}
          loading={loading}
          rowKey={(i) => i.id}
          onRowClick={onRowClick}
          emptyIcon={<FileText size={44} />}
          emptyTitle="No invoices yet"
          emptySubtitle="Generate an invoice from approved work entries."
        />
      </SectionCard>
    </div>
  );
}

const invoiceColumns: Column<AgencyInvoice>[] = [
  {
    key: 'number', header: 'Invoice #',
    render: (inv) => <span style={{ fontWeight: fontWeight.bold, color: colors.primary }}>{inv.invoice_number}</span>
  },
  { key: 'period', header: 'Period', render: (inv) => <span className={styles.mutedText}>{inv.period_start} → {inv.period_end}</span> },
  { key: 'hours', header: 'Hours', render: (inv) => <span style={{ fontWeight: fontWeight.semibold }}>{parseFloat(inv.total_hours).toFixed(1)}h</span> },
  { key: 'total', header: 'Total', render: (inv) => <span style={{ fontWeight: fontWeight.bold }}>€{parseFloat(inv.total).toFixed(2)}</span> },
  { key: 'status', header: 'Status', render: (inv) => <StatusBadge status={inv.status} label={inv.status_display} /> },
  {
    key: 'paid', header: 'Paid',
    render: (inv) => (
      <span style={{ fontWeight: fontWeight.semibold, color: parseFloat(inv.amount_due) <= 0 ? colors.success : colors.danger }}>
        €{parseFloat(inv.amount_paid).toFixed(2)}
      </span>
    )
  },
];

// ─── Surcharges Tab / Section ───────────────────────────────

interface SurchargesSectionProps {
  hasEnabled: boolean;
  onToggle: (v: boolean) => void;
  types: SurchargeType[];
  selected: SurchargeState;
  setSelected: React.Dispatch<React.SetStateAction<SurchargeState>>;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  weekend: Sun, night_shift: Moon, holiday: Star, custom: Calendar
};
const CATEGORY_COLORS: Record<string, string> = {
  weekend: '#F59E0B', night_shift: '#3B82F6', holiday: '#10B981', custom: '#8B5CF6'
};

export function SurchargesSection({ hasEnabled, onToggle, types, selected, setSelected }: SurchargesSectionProps) {
  // Group by category
  const grouped: Record<string, SurchargeType[]> = {};
  types.filter(t => t.is_active).forEach(t => {
    const cat = t.category || 'custom';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });

  return (
    <SectionCard
      title="Surcharge Configuration"
      icon={<Percent size={18} color={colors.primary} />}
      actions={
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={hasEnabled} onChange={e => onToggle(e.target.checked)} />
          <span>Enable Surcharges</span>
        </label>
      }
    >
      {!hasEnabled ? (
        <EmptyState icon={<Percent size={40} />} title="Surcharges disabled" subtitle="Enable surcharges above to configure rates." />
      ) : (
        <div className={styles.fieldStack}>
          {Object.entries(grouped).map(([category, catTypes]) => {
            const Icon = CATEGORY_ICONS[category] || Calendar;
            const color = CATEGORY_COLORS[category] || '#8B5CF6';
            return (
              <div key={category}>
                <div className={styles.categoryHeader}>
                  <Icon size={16} color={color} />
                  <span style={{ color, fontWeight: fontWeight.bold, textTransform: 'capitalize' }}>
                    {category.replace('_', ' ')}
                  </span>
                </div>
                <div className={styles.surchargeGrid}>
                  {catTypes.map(type => {
                    const state = selected[type.id] || { enabled: false, percentage: 0 };
                    return (
                      <div key={type.id} className={styles.surchargeCard} style={{
                        borderColor: state.enabled ? color : colors.border,
                        background: state.enabled ? `${color}08` : '#FAFAFA'
                      }}>
                        <label className={styles.checkboxLabel}>
                          <input type="checkbox" checked={state.enabled}
                            onChange={e => setSelected(prev => ({
                              ...prev,
                              [type.id]: { ...prev[type.id], enabled: e.target.checked, percentage: prev[type.id]?.percentage || 0 }
                            }))} />
                          <span style={{ fontWeight: fontWeight.semibold }}>{type.name}</span>
                        </label>
                        {state.enabled && (
                          <div className={styles.percentageRow}>
                            <input type="number" step="0.01" value={state.percentage}
                              className={styles.percentageInput}
                              onChange={e => setSelected(prev => ({
                                ...prev,
                                [type.id]: { ...prev[type.id], percentage: parseFloat(e.target.value) || 0 }
                              }))} />
                            <span className={styles.mutedText}>%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Generate Invoice Modal ─────────────────────────────────

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  periodStart: string;
  periodEnd: string;
  setPeriodStart: (v: string) => void;
  setPeriodEnd: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function GenerateInvoiceModal({
  open, onClose, periodStart, periodEnd, setPeriodStart, setPeriodEnd, onGenerate, generating
}: GenerateModalProps) {
    const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title="Generate Agency Invoice" width="440px" footer={
      <>
        <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={onGenerate} loading={generating} disabled={!periodStart || !periodEnd}>
          Generate Invoice
        </Button>
      </>
    }>
      <p className={styles.mutedText} style={{ marginBottom: spacing.xl }}>
        Select the period for approved work entries. Only un-invoiced entries will be included.
      </p>
      <div className={styles.fieldStack}>
        <Input label="Period Start" value={periodStart} onChange={setPeriodStart} type="date" />
        <Input label="Period End" value={periodEnd} onChange={setPeriodEnd} type="date" />
      </div>
    </Modal>
  );
}
