/**
 * Attendance — derived from approved work entries plus approved leave.
 *
 * Nothing is stored for attendance; the backend computes it so it can never
 * drift out of sync with the worklogs it is derived from.
 */
'use client';

import { Clock } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import {
    DataTable, Input, PageHeader, SearchBar,
    SectionCard, Select, StatCard, StatusBadge,
} from '@/components/ui/shared';
import { useAttendance, type AttendanceRecord } from '@/hooks/useHr';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' },
    { value: 'leave', label: 'On leave' },
];

export default function HRAttendancePage() {
    const { t } = useLanguage();
    const vm = useAttendance();

    const columns = [
        {
            key: 'date',
            header: t('Date'),
            render: (row: AttendanceRecord) => row.date,
        },
        {
            key: 'employee_name',
            header: t('Employee'),
            render: (row: AttendanceRecord) => row.employee_name || '—',
        },
        {
            key: 'status',
            header: t('Status'),
            render: (row: AttendanceRecord) => <StatusBadge status={row.status} />,
        },
        {
            key: 'planned_start',
            header: t('Planned'),
            render: (row: AttendanceRecord) => row.planned_start?.slice(0, 5) ?? '—',
        },
        {
            key: 'actual_start',
            header: t('Actual'),
            render: (row: AttendanceRecord) => row.actual_start?.slice(0, 5) ?? '—',
        },
        {
            key: 'minutes_late',
            header: t('Late'),
            align: 'right' as const,
            render: (row: AttendanceRecord) =>
                row.minutes_late > 0 ? `${row.minutes_late} min` : '—',
        },
        {
            key: 'hours',
            header: t('Hours'),
            align: 'right' as const,
            render: (row: AttendanceRecord) => Number(row.hours || 0).toFixed(2),
        },
        {
            key: 'leave_type',
            header: t('Leave type'),
            render: (row: AttendanceRecord) => row.leave_type ?? '—',
        },
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('Attendance')}
                    subtitle={t('Derived from work entries and approved leave')}
                />

                <div className={styles.statRow}>
                    <StatCard label={t('Records')} value={vm.counts.total} />
                    <StatCard label={t('Present')} value={vm.counts.present} />
                    <StatCard label={t('Late')} value={vm.counts.late} />
                    <StatCard label={t('Absent')} value={vm.counts.absent} />
                    <StatCard label={t('On leave')} value={vm.counts.leave} />
                </div>

                <div className={styles.filterRow}>
                    <SearchBar
                        value={vm.searchQuery}
                        onChange={vm.setSearchQuery}
                        placeholder={t('Search employee...')}
                        style={{ flex: 1, minWidth: 220 }}
                    />
                    <Input type="date" value={vm.dateFrom} onChange={vm.setDateFrom} label={t('From')} />
                    <Input type="date" value={vm.dateTo} onChange={vm.setDateTo} label={t('To')} />
                    <Select
                        value={vm.statusFilter}
                        onChange={vm.setStatusFilter}
                        options={STATUS_OPTIONS}
                    />
                </div>

                <SectionCard>
                    <DataTable<AttendanceRecord>
                        data={vm.records}
                        columns={columns}
                        loading={vm.loading}
                        rowKey={(row) => `${row.employee}-${row.date}`}
                        emptyIcon={<Clock size={32} />}
                        emptyTitle={t('No attendance in this range')}
                        emptySubtitle={vm.error ?? 'Try widening the date range.'}
                    />
                </SectionCard>
            </div>
        </DashboardLayout>
    );
}
