/**
 * Incoming Invoices — supplier payables.
 *
 * Backed by /api/invoices/incoming-invoices/. Until now this page shipped a
 * complete UI bound to an empty array, so the sidebar linked to a permanently
 * blank screen.
 */
'use client';

import { Plus, Check, Trash2, FileText } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Button, DataTable, FormGrid, Input, Modal, PageHeader,
    SearchBar, SectionCard, Select, StatCard, StatusBadge, TextArea,
} from '@/components/ui/shared';
import { useIncomingInvoices, type IncomingInvoice } from '@/hooks/useIncomingInvoices';
import styles from './page.module.css';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paid', label: 'Paid' },
    { value: 'disputed', label: 'Disputed' },
    { value: 'draft', label: 'Draft' },
];

const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter(o => o.value !== 'all');

const euro = (value: string | number) =>
    `€ ${Number(value || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IncomingInvoicesPage() {
    const vm = useIncomingInvoices();

    const columns = [
        {
            key: 'invoice_number',
            header: 'Invoice #',
            render: (row: IncomingInvoice) => row.invoice_number,
        },
        {
            key: 'vendor_name',
            header: 'Vendor',
            render: (row: IncomingInvoice) => row.vendor_name,
        },
        {
            key: 'invoice_date',
            header: 'Date',
            render: (row: IncomingInvoice) => row.invoice_date,
        },
        {
            key: 'due_date',
            header: 'Due',
            render: (row: IncomingInvoice) =>
                row.due_date
                    ? `${row.due_date}${row.is_overdue ? ' (overdue)' : ''}`
                    : '—',
        },
        {
            key: 'total',
            header: 'Total',
            align: 'right' as const,
            render: (row: IncomingInvoice) => euro(row.total),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: IncomingInvoice) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            header: '',
            render: (row: IncomingInvoice) => (
                <div className={styles.rowActions}>
                    <Button variant="ghost" onClick={() => vm.openEdit(row)}>Edit</Button>
                    {row.status !== 'paid' && (
                        <Button
                            variant="success"
                            onClick={() => vm.markPaid(row.id)}
                            icon={<Check size={14} />}
                        >
                            Paid
                        </Button>
                    )}
                    <Button
                        variant="danger"
                        onClick={() => vm.remove(row.id)}
                        icon={<Trash2 size={14} />}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title="Incoming Invoices"
                    subtitle="Supplier and subcontractor payables"
                    actions={
                        <Button onClick={vm.openCreate} icon={<Plus size={16} />}>
                            Add invoice
                        </Button>
                    }
                />

                <div className={styles.statRow}>
                    <StatCard label="Total" value={vm.summary?.total_count ?? 0} />
                    <StatCard
                        label="Pending"
                        value={euro(vm.summary?.pending_total ?? 0)}
                        subtitle={`${vm.summary?.pending_count ?? 0} invoices`}
                    />
                    <StatCard
                        label="Overdue"
                        value={euro(vm.summary?.overdue_total ?? 0)}
                        subtitle={`${vm.summary?.overdue_count ?? 0} invoices`}
                    />
                    <StatCard
                        label="Paid"
                        value={euro(vm.summary?.paid_total ?? 0)}
                        subtitle={`${vm.summary?.paid_count ?? 0} invoices`}
                    />
                </div>

                <div className={styles.filterRow}>
                    <SearchBar
                        value={vm.searchQuery}
                        onChange={vm.setSearchQuery}
                        placeholder="Search invoice number, vendor, description..."
                        style={{ flex: 1, minWidth: 260 }}
                    />
                    <Select
                        value={vm.statusFilter}
                        onChange={vm.setStatusFilter}
                        options={STATUS_OPTIONS}
                    />
                </div>

                <SectionCard>
                    <DataTable<IncomingInvoice>
                        data={vm.invoices}
                        columns={columns}
                        loading={vm.loading}
                        rowKey={(row) => row.id}
                        emptyIcon={<FileText size={32} />}
                        emptyTitle="No incoming invoices"
                        emptySubtitle={vm.error ?? 'Add a supplier invoice to get started.'}
                    />
                </SectionCard>

                <Modal
                    open={vm.showModal}
                    onClose={() => vm.setShowModal(false)}
                    title={vm.editingId ? 'Edit incoming invoice' : 'Add incoming invoice'}
                    width="640px"
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => vm.setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={vm.save} loading={vm.saving}>Save</Button>
                        </>
                    }
                >
                    <FormGrid columns={2}>
                        <Input
                            label="Invoice number"
                            value={vm.form.invoice_number}
                            onChange={(v) => vm.updateForm('invoice_number', v)}
                            required
                        />
                        <Input
                            label="Vendor"
                            value={vm.form.vendor_name}
                            onChange={(v) => vm.updateForm('vendor_name', v)}
                            required
                        />
                        <Input
                            label="Vendor VAT number"
                            value={vm.form.vendor_vat_number}
                            onChange={(v) => vm.updateForm('vendor_vat_number', v)}
                        />
                        <Select
                            label="Status"
                            value={vm.form.status}
                            onChange={(v) => vm.updateForm('status', v)}
                            options={FORM_STATUS_OPTIONS}
                        />
                        <Input
                            label="Invoice date"
                            type="date"
                            value={vm.form.invoice_date}
                            onChange={(v) => vm.updateForm('invoice_date', v)}
                            required
                        />
                        <Input
                            label="Due date"
                            type="date"
                            value={vm.form.due_date}
                            onChange={(v) => vm.updateForm('due_date', v)}
                        />
                        <Input
                            label="Subtotal (excl. VAT)"
                            type="number"
                            value={vm.form.subtotal}
                            onChange={(v) => vm.updateForm('subtotal', v)}
                            required
                        />
                        <Input
                            label="VAT rate (%)"
                            type="number"
                            value={vm.form.vat_rate}
                            onChange={(v) => vm.updateForm('vat_rate', v)}
                        />
                    </FormGrid>
                    <TextArea
                        label="Description"
                        value={vm.form.description}
                        onChange={(v) => vm.updateForm('description', v)}
                    />
                    <TextArea
                        label="Notes"
                        value={vm.form.notes}
                        onChange={(v) => vm.updateForm('notes', v)}
                    />
                    {vm.error && (
                        <p style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{vm.error}</p>
                    )}
                </Modal>
            </div>
        </DashboardLayout>
    );
}
