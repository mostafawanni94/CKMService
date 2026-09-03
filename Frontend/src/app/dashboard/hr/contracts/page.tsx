/**
 * Contracts — every employee contract with its expiry state.
 *
 * Backed by /api/employees/profiles/contracts/, which aggregates the
 * per-employee contract history the platform already recorded.
 */
'use client';

import { FileText, Download } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import {
    DataTable, PageHeader, SearchBar, SectionCard,
    Select, StatCard, StatusBadge,
} from '@/components/ui/shared';
import { useContracts, type ContractRow } from '@/hooks/useHr';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const STATUS_OPTIONS_KEYS = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'expiring', label: 'Expiring (60 days)' },
    { value: 'expired', label: 'Expired' },
];

export default function HRContractsPage() {
    const { t } = useLanguage();
    const STATUS_OPTIONS = STATUS_OPTIONS_KEYS.map(o => ({ ...o, label: t(o.label) }));
    const vm = useContracts();

    const columns = [
        {
            key: 'employee_name',
            header: t('Employee'),
            render: (row: ContractRow) => row.employee_name || '—',
        },
        {
            key: 'effective_from',
            header: t('From'),
            render: (row: ContractRow) => row.effective_from,
        },
        {
            key: 'effective_to',
            header: t('To'),
            render: (row: ContractRow) => row.effective_to ?? 'Open-ended',
        },
        {
            key: 'hourly_rate',
            header: t('Rate'),
            align: 'right' as const,
            render: (row: ContractRow) => `€ ${Number(row.hourly_rate || 0).toFixed(2)}`,
        },
        {
            key: 'status',
            header: t('Status'),
            render: (row: ContractRow) => (
                <StatusBadge
                    status={row.status}
                    label={
                        row.status === 'expiring' && row.days_remaining !== null
                            ? `Expiring in ${row.days_remaining}d`
                            : undefined
                    }
                />
            ),
        },
        {
            key: 'document',
            header: '',
            render: (row: ContractRow) =>
                row.contract_document ? (
                    <a
                        href={row.contract_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            color: '#1E3A5F', fontSize: 13, fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        <Download size={14} /> {t('Document')}
                    </a>
                ) : (
                    <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
                ),
        },
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('Contracts')}
                    subtitle={t('Employee contracts and upcoming expiries')}
                />

                <div className={styles.statRow}>
                    <StatCard label={t('Total')} value={vm.counts.total} />
                    <StatCard label={t('Active')} value={vm.counts.active} />
                    <StatCard label={t('Expiring')} value={vm.counts.expiring} />
                    <StatCard label={t('Expired')} value={vm.counts.expired} />
                </div>

                <div className={styles.filterRow}>
                    <SearchBar
                        value={vm.searchQuery}
                        onChange={vm.setSearchQuery}
                        placeholder={t('Search employee...')}
                        style={{ flex: 1, minWidth: 240 }}
                    />
                    <Select
                        value={vm.statusFilter}
                        onChange={vm.setStatusFilter}
                        options={STATUS_OPTIONS}
                    />
                </div>

                <SectionCard>
                    <DataTable<ContractRow>
                        data={vm.contracts}
                        columns={columns}
                        loading={vm.loading}
                        rowKey={(row) => row.id}
                        emptyIcon={<FileText size={32} />}
                        emptyTitle={t('No contracts')}
                        emptySubtitle={
                            vm.error ?? 'Upload a contract from an employee profile to see it here.'
                        }
                    />
                </SectionCard>
            </div>
        </DashboardLayout>
    );
}
