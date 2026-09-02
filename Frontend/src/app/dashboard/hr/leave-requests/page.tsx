/**
 * Leave Requests — approve or reject employee time-off, backed by /api/hr/.
 *
 * This page used to render `setRequests([])` against a backend that did not
 * exist.
 */
'use client';

import { Check, X, CalendarDays } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Button, DataTable, PageHeader, SearchBar,
    SectionCard, Select, StatCard, StatusBadge,
} from '@/components/ui/shared';
import { useLeaveRequests, type LeaveRequest } from '@/hooks/useHr';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function HRLeaveRequestsPage() {
    const { t } = useLanguage();
    const vm = useLeaveRequests();

    const columns = [
        {
            key: 'employee_name',
            header: t('Employee'),
            render: (row: LeaveRequest) => row.employee_name || '—',
        },
        {
            key: 'leave_type_name',
            header: t('Type'),
            render: (row: LeaveRequest) => row.leave_type_name || '—',
        },
        {
            key: 'period',
            header: t('Period'),
            render: (row: LeaveRequest) => `${row.start_date} → ${row.end_date}`,
        },
        {
            key: 'total_days',
            header: t('Days'),
            render: (row: LeaveRequest) => `${row.total_days}`,
        },
        {
            key: 'status',
            header: t('Status'),
            render: (row: LeaveRequest) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            header: '',
            render: (row: LeaveRequest) =>
                row.status === 'pending' ? (
                    <div className={styles.rowActions}>
                        <Button
                            variant="secondary"
                            onClick={() => vm.approve(row.id)}
                            disabled={vm.busyId === row.id}
                            icon={<Check size={14} />}
                        >
                            {t('Approve')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => vm.reject(row.id)}
                            disabled={vm.busyId === row.id}
                            icon={<X size={14} />}
                        >
                            {t('Reject')}
                        </Button>
                    </div>
                ) : (
                    <span style={{ color: '#94A3B8', fontSize: 13 }}>
                        {row.reviewed_by_email ? `by ${row.reviewed_by_email}` : '—'}
                    </span>
                ),
        },
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('Leave Requests')}
                    subtitle="Review and decide on employee time-off requests"
                />

                <div className={styles.statRow}>
                    <StatCard label={t('Total')} value={vm.counts.total} />
                    <StatCard label={t('Pending')} value={vm.counts.pending} />
                    <StatCard label={t('Approved')} value={vm.counts.approved} />
                    <StatCard label={t('Rejected')} value={vm.counts.rejected} />
                </div>

                <div className={styles.filterRow}>
                    <SearchBar
                        value={vm.searchQuery}
                        onChange={vm.setSearchQuery}
                        placeholder="Search employee, type, reason..."
                        style={{ flex: 1, minWidth: 240 }}
                    />
                    <Select
                        value={vm.statusFilter}
                        onChange={vm.setStatusFilter}
                        options={STATUS_OPTIONS}
                    />
                </div>

                <SectionCard>
                    <DataTable<LeaveRequest>
                        data={vm.requests}
                        columns={columns}
                        loading={vm.loading}
                        rowKey={(row) => row.id}
                        emptyIcon={<CalendarDays size={32} />}
                        emptyTitle="No leave requests"
                        emptySubtitle={
                            vm.error ?? 'Requests submitted from the employee app appear here.'
                        }
                    />
                </SectionCard>
            </div>
        </DashboardLayout>
    );
}
