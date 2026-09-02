/**
 * Agency Invoices Page — Thin page composing hook + shared components.
 */
'use client';

import { useRouter } from 'next/navigation';
import { FileText, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import {
  PageHeader, SectionCard, SearchBar, Select, Button,
  DataTable, StatusBadge, Pagination
} from '@/components/ui/shared';
import type { Column } from '@/components/ui/shared';
import { useAgencyInvoices } from '@/hooks/useAgencyInvoices';
import { colors, spacing, fontWeight } from '@/styles/tokens';
import type { AgencyInvoice } from '@/lib/types';
import styles from './page.module.css';
import { useLanguage } from '@/lib/i18n';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function AgencyInvoicesPage() {
    const { t } = useLanguage();
  const vm = useAgencyInvoices();
  const router = useRouter();

  const columns: Column<AgencyInvoice>[] = [
    {
      key: 'number', header: 'Invoice #',
      render: (inv) => <span style={{ fontWeight: fontWeight.bold, color: colors.primary }}>{inv.invoice_number}</span>
    },
    {
      key: 'agency', header: t('Agency'),
      render: (inv) => (
        <div>
          <div style={{ fontWeight: fontWeight.semibold }}>{inv.agency_name}</div>
          <div className={styles.mutedText}>{inv.agency_code}</div>
        </div>
      )
    },
    {
      key: 'period', header: t('Period'),
      render: (inv) => <span className={styles.mutedText}>{inv.period_start} → {inv.period_end}</span>
    },
    { key: 'hours', header: t('Hours'), render: (inv) => <span>{parseFloat(inv.total_hours).toFixed(1)}h</span> },
    {
      key: 'total', header: t('Total'), align: 'right',
      render: (inv) => <span style={{ fontWeight: fontWeight.bold }}>€{parseFloat(inv.total).toFixed(2)}</span>
    },
    {
      key: 'paid', header: t('Paid'), align: 'right',
      render: (inv) => <span className={styles.successText}>€{parseFloat(inv.amount_paid).toFixed(2)}</span>
    },
    {
      key: 'status', header: t('Status'),
      render: (inv) => <StatusBadge status={inv.status} label={inv.status_display} />
    },
    {
      key: 'actions', header: '',
      render: (inv) => (
        <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => router.push(`/dashboard/agencies/${inv.agency}`)}>
          {t('View')}
        </Button>
      )
    },
  ];

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <PageHeader title={t('Agency Invoices')} subtitle="Manage invoices for recruitment agencies" />

        <div className={styles.filterRow}>
          <SearchBar value={vm.searchQuery} onChange={vm.setSearchQuery} placeholder="Search invoice # or agency..." style={{ flex: 1 }} />
          <Select value={vm.statusFilter} onChange={v => { vm.setStatusFilter(v); vm.setPage(1); }} options={STATUS_OPTIONS} />
        </div>

        <SectionCard>
          <DataTable
            columns={columns}
            data={vm.invoices}
            loading={vm.loading}
            rowKey={(inv) => inv.id}
            emptyIcon={<FileText size={44} />}
            emptyTitle="No agency invoices found"
            emptySubtitle="Generate invoices from the Agency detail page."
          />
          <Pagination page={vm.page} totalPages={vm.totalPages} onChange={vm.setPage} />
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
