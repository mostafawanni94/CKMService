'use client';

import { CheckCircle, Clock, XCircle } from 'lucide-react';

import {
    Badge, Button, DataTable, Modal, SectionCard, StatusBadge, type Column,
} from '@/components/ui/shared';
import { colors, fontSize, fontWeight, spacing } from '@/styles/tokens';
import { useLanguage } from '@/lib/i18n';
import type { EmployeeWallet, PendingAdvance, WalletViewModel } from '@/hooks/useWallet';

const euro = (value: unknown) => {
    const parsed = parseFloat(String(value ?? ''));
    return `€${(Number.isFinite(parsed) ? parsed : 0).toFixed(2)}`;
};

const nlDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? iso
        : date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function PendingAdvances({ vm }: { vm: WalletViewModel }) {
    const { t } = useLanguage();
    if (vm.advances.length === 0) return null;

    const columns: Column<PendingAdvance>[] = [
        {
            key: 'employee', header: t('Employee'),
            render: (a) => <span style={{ fontWeight: fontWeight.semibold }}>{a.employee_name}</span>,
        },
        { key: 'date', header: t('Date'), render: (a) => nlDate(a.created_at) },
        {
            key: 'reason', header: t('Description'),
            render: (a) => <span style={{ color: colors.textMuted }}>{a.reason || '—'}</span>,
        },
        {
            key: 'amount', header: t('Amount'), align: 'right',
            render: (a) => (
                <span style={{ fontWeight: fontWeight.bold, fontVariantNumeric: 'tabular-nums' }}>
                    {euro(a.amount)}
                </span>
            ),
        },
        {
            key: 'actions', header: t('Actions'), align: 'right',
            render: (a) => (
                <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={() => void vm.approve(a.id)}
                        disabled={vm.busyId === a.id}
                        icon={<CheckCircle size={16} />}
                    >
                        {t('Approve')}
                    </Button>
                    <Button
                        variant="danger"
                        disabled={vm.busyId === a.id}
                        icon={<XCircle size={16} />}
                        onClick={() => {
                            const reason = window.prompt(t('Rejection Reason'));
                            if (reason) void vm.reject(a.id, reason);
                        }}
                    >
                        {t('Reject')}
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <SectionCard
            title={t('Pending Advances')}
            icon={<Clock size={18} color={colors.warning} />}
            subtitle={t('Advance requests waiting for a decision')}
        >
            <DataTable
                columns={columns}
                data={vm.advances}
                rowKey={(a) => a.id}
                emptyTitle={t('No pending advance requests')}
            />
        </SectionCard>
    );
}

export function WalletTable({ vm }: { vm: WalletViewModel }) {
    const { t } = useLanguage();

    const columns: Column<EmployeeWallet>[] = [
        {
            key: 'employee', header: t('Employee'),
            render: (w) => <span style={{ fontWeight: fontWeight.semibold }}>{w.employee_name}</span>,
        },
        {
            key: 'earnings', header: t('Total Earnings'), align: 'right',
            render: (w) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(w.total_earnings)}</span>,
        },
        {
            key: 'advances', header: t('Advances'), align: 'right',
            render: (w) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(w.total_advances)}</span>,
        },
        {
            key: 'balance', header: t('Balance'), align: 'right',
            render: (w) => (
                <span style={{
                    fontWeight: fontWeight.bold,
                    fontVariantNumeric: 'tabular-nums',
                    color: parseFloat(w.balance) < 0 ? colors.danger : colors.textPrimary,
                }}>
                    {euro(w.balance)}
                </span>
            ),
        },
    ];

    return (
        <SectionCard
            title={t('Employee Wallets')}
            subtitle={t('Select a wallet to see its recent transactions')}
        >
            <DataTable
                columns={columns}
                data={vm.wallets}
                loading={vm.loading}
                rowKey={(w) => w.id}
                onRowClick={(w) => vm.setSelected(w)}
                emptyTitle={t('No wallets yet')}
                emptySubtitle={t('A wallet appears once an employee has approved hours')}
            />
        </SectionCard>
    );
}

export function TransactionsModal({ vm }: { vm: WalletViewModel }) {
    const { t } = useLanguage();
    const wallet = vm.selected;
    if (!wallet) return null;

    return (
        <Modal
            open
            onClose={() => vm.setSelected(null)}
            title={`${wallet.employee_name} — ${euro(wallet.balance)}`}
            width="640px"
        >
            {wallet.recent_transactions.length === 0 ? (
                <p style={{ color: colors.textMuted }}>{t('No transactions yet')}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    {wallet.recent_transactions.map((tx) => (
                        <div
                            key={tx.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: spacing.lg,
                                padding: spacing.md,
                                background: colors.bgAlt,
                                borderRadius: '8px',
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: fontWeight.semibold }}>{tx.description}</div>
                                <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
                                    {nlDate(tx.created_at)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                                <Badge>{tx.transaction_type_display}</Badge>
                                <StatusBadge status={tx.status} />
                                <span style={{
                                    fontWeight: fontWeight.bold,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: tx.transaction_type === 'advance' ? colors.danger : colors.success,
                                }}>
                                    {euro(tx.amount)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
