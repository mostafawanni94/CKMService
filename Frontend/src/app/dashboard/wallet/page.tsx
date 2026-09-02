'use client';

import { Clock, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard';
import { Button, PageHeader, StatCard } from '@/components/ui/shared';
import {
    PendingAdvances, TransactionsModal, WalletTable,
} from '@/components/features/wallet/WalletComponents';
import { useWallet } from '@/hooks/useWallet';
import { colors, spacing } from '@/styles/tokens';
import { useLanguage } from '@/lib/i18n';

export default function WalletPage() {
    const { t } = useLanguage();
    const vm = useWallet();

    const euro = (value: number) => `€${value.toFixed(2)}`;

    return (
        <DashboardLayout>
            <PageHeader
                title={t('Wallet Management')}
                subtitle={t('Employee balances and advance requests')}
                actions={
                    <Button variant="secondary" onClick={() => void vm.reload()} icon={<RefreshCw size={16} />}>
                        {t('Refresh')}
                    </Button>
                }
            />

            {(vm.error || vm.actionError) && (
                <div style={{
                    padding: spacing.lg,
                    marginBottom: spacing.xl,
                    background: colors.dangerBg,
                    border: `1px solid ${colors.dangerBorder}`,
                    borderRadius: '8px',
                    color: colors.danger,
                }}>
                    {vm.error || vm.actionError}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: spacing.lg,
                marginBottom: spacing.xxl,
            }}>
                <StatCard
                    label={t('Total Balance')}
                    value={euro(vm.totalBalance)}
                    icon={<Wallet size={20} color={colors.primary} />}
                    subtitle={`${vm.wallets.length} ${t('Employees').toLowerCase()}`}
                />
                <StatCard
                    label={t('Total Earnings')}
                    value={euro(vm.totalEarnings)}
                    icon={<TrendingUp size={20} color={colors.success} />}
                    color={colors.success}
                />
                <StatCard
                    label={t('Pending Advances')}
                    value={vm.advances.length}
                    icon={<Clock size={20} color={colors.warning} />}
                    color={colors.warning}
                    subtitle={euro(vm.pendingTotal)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xxl }}>
                <PendingAdvances vm={vm} />
                <WalletTable vm={vm} />
            </div>

            <TransactionsModal vm={vm} />
        </DashboardLayout>
    );
}
