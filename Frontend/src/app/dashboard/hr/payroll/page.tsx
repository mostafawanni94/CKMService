/**
 * Payroll — pay runs built from approved work entries.
 *
 * Generation is idempotent server-side: an employee already carried by a
 * payslip in the period is skipped, and a work entry is never counted twice.
 */
'use client';

import { useState } from 'react';
import { CreditCard, Play, Check } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Button, DataTable, FormGrid, Input, Modal, PageHeader,
    SectionCard, Select, StatCard, StatusBadge, TextArea,
} from '@/components/ui/shared';
import { usePayroll, type PayrollPeriod, type Payslip } from '@/hooks/useHr';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
];

const euro = (value: string | number) =>
    `€ ${Number(value || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyForm = { name: '', start_date: '', end_date: '', notes: '' };

export default function HRPayrollPage() {
    const { t } = useLanguage();
    const vm = usePayroll();
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState<string | null>(null);

    const update = (key: keyof typeof emptyForm) => (value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    async function handleCreate() {
        setFormError(null);
        if (!form.name || !form.start_date || !form.end_date) {
            setFormError('Name, start date and end date are required.');
            return;
        }
        try {
            await vm.createPeriod(form);
            setForm(emptyForm);
            setShowModal(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not create the period.');
        }
    }

    const periodColumns = [
        { key: 'name', header: t('Period'), render: (row: PayrollPeriod) => row.name },
        {
            key: 'range',
            header: 'Range',
            render: (row: PayrollPeriod) => `${row.start_date} → ${row.end_date}`,
        },
        {
            key: 'employee_count',
            header: t('Employees'),
            align: 'right' as const,
            render: (row: PayrollPeriod) => `${row.employee_count}`,
        },
        {
            key: 'total_gross',
            header: 'Gross',
            align: 'right' as const,
            render: (row: PayrollPeriod) => euro(row.total_gross),
        },
        {
            key: 'status',
            header: t('Status'),
            render: (row: PayrollPeriod) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            header: '',
            render: (row: PayrollPeriod) => (
                <div className={styles.rowActions}>
                    <Button variant="ghost" onClick={() => vm.loadPayslips(row.id)}>
                        {t('Payslips')}
                    </Button>
                    {row.status !== 'paid' && (
                        <Button
                            variant="secondary"
                            onClick={() => vm.generate(row.id)}
                            disabled={vm.busy}
                            icon={<Play size={14} />}
                        >
                            {t('Generate')}
                        </Button>
                    )}
                    {row.status === 'pending' && (
                        <Button
                            variant="success"
                            onClick={() => vm.markPaid(row.id)}
                            disabled={vm.busy}
                            icon={<Check size={14} />}
                        >
                            Mark paid
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const payslipColumns = [
        { key: 'employee_name', header: t('Employee'), render: (row: Payslip) => row.employee_name },
        {
            key: 'total_hours',
            header: t('Hours'),
            align: 'right' as const,
            render: (row: Payslip) => Number(row.total_hours || 0).toFixed(2),
        },
        {
            key: 'gross_pay',
            header: 'Gross',
            align: 'right' as const,
            render: (row: Payslip) => euro(row.gross_pay),
        },
        {
            key: 'deductions',
            header: 'Deductions',
            align: 'right' as const,
            render: (row: Payslip) => euro(row.deductions),
        },
        {
            key: 'net_pay',
            header: 'Net',
            align: 'right' as const,
            render: (row: Payslip) => euro(row.net_pay),
        },
        {
            key: 'status',
            header: t('Status'),
            render: (row: Payslip) => <StatusBadge status={row.status} />,
        },
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('Payroll')}
                    subtitle="Build pay runs from approved work entries"
                    actions={
                        <Button onClick={() => setShowModal(true)} icon={<CreditCard size={16} />}>
                            New period
                        </Button>
                    }
                />

                <div className={styles.statRow}>
                    <StatCard label="Periods" value={vm.totals.periods} />
                    <StatCard label={t('Pending')} value={vm.totals.pending} />
                    <StatCard label={t('Paid')} value={vm.totals.paid} />
                    <StatCard label="Gross total" value={euro(vm.totals.grossTotal)} />
                </div>

                <div className={styles.filterRow}>
                    <Select
                        value={vm.statusFilter}
                        onChange={vm.setStatusFilter}
                        options={STATUS_OPTIONS}
                    />
                </div>

                <SectionCard title="Pay runs">
                    <DataTable<PayrollPeriod>
                        data={vm.periods}
                        columns={periodColumns}
                        loading={vm.loading}
                        rowKey={(row) => row.id}
                        emptyIcon={<CreditCard size={32} />}
                        emptyTitle="No payroll periods"
                        emptySubtitle={vm.error ?? 'Create a period to start a pay run.'}
                    />
                </SectionCard>

                {vm.selectedPeriod && (
                    <SectionCard title={t('Payslips')}>
                        <DataTable<Payslip>
                            data={vm.payslips}
                            columns={payslipColumns}
                            rowKey={(row) => row.id}
                            emptyTitle="No payslips yet"
                            emptySubtitle="Run Generate on the period to build them."
                        />
                    </SectionCard>
                )}

                <Modal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    title="New payroll period"
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleCreate} loading={vm.busy}>
                                {t('Create')}
                            </Button>
                        </>
                    }
                >
                    <FormGrid columns={2}>
                        <Input label={t('Name')} value={form.name} onChange={update('name')} required />
                        <Input
                            label="Start date"
                            type="date"
                            value={form.start_date}
                            onChange={update('start_date')}
                            required
                        />
                        <Input
                            label="End date"
                            type="date"
                            value={form.end_date}
                            onChange={update('end_date')}
                            required
                        />
                    </FormGrid>
                    <TextArea label={t('Notes')} value={form.notes} onChange={update('notes')} />
                    {formError && (
                        <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{formError}</p>
                    )}
                </Modal>
            </div>
        </DashboardLayout>
    );
}
