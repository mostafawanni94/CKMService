/**
 * Finance Overview — thin page that composes hook + components.
 *
 * Architecture:
 *   Page (this file) → useFinanceDashboard (hook) → DashboardComponents (UI)
 */
'use client';

import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { PageHeader, Select, LoadingSpinner } from '@/components/ui/shared';
import {
    CashPosition, HeadlineCards, MonthlyChart, ReviewBanner, TopCustomers, VatQuarters,
} from '@/components/features/finance/DashboardComponents';
import { useFinanceDashboard } from '@/hooks/useFinanceDashboard';
import { colors, spacing } from '@/styles/tokens';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const YEARS_KEYS = [2024, 2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: String(y) }));
// Labels are resolved inside the component, where t() is in scope; a
// module-level constant would freeze them in whatever language was current
// when the module first loaded.
const QUARTER_KEYS = [
    { value: '', label: 'Heel jaar' },
    { value: '1', label: 'Q1 (jan–mrt)' },
    { value: '2', label: 'Q2 (apr–jun)' },
    { value: '3', label: 'Q3 (jul–sep)' },
    { value: '4', label: 'Q4 (okt–dec)' },
];

export default function FinanceOverviewPage() {
    const { t } = useLanguage();
    const YEARS = YEARS_KEYS.map(o => ({ ...o, label: t(o.label) }));
    const QUARTERS = QUARTER_KEYS.map(q => ({ ...q, label: t(q.label) }));
    const vm = useFinanceDashboard();
    const router = useRouter();

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('Financieel overzicht')}
                    subtitle={t('Omzet, kosten, openstaande posten en btw — uit dezelfde administratie als de aangifte')}
                    actions={
                        <>
                            <Select value={String(vm.year)}
                                    onChange={v => vm.setYear(parseInt(v))} options={YEARS} />
                            <Select value={vm.quarter ? String(vm.quarter) : ''}
                                    onChange={v => vm.setQuarter(v ? parseInt(v) : null)}
                                    options={QUARTERS} />
                        </>
                    }
                />

                {vm.error && (
                    <div style={{
                        padding: spacing.lg, marginBottom: spacing.lg, borderRadius: 8,
                        background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`,
                        color: colors.dangerDark,
                    }}>{vm.error}</div>
                )}

                {vm.loading || !vm.data ? (
                    <LoadingSpinner message={t('Cijfers laden…')} />
                ) : (
                    <>
                        <ReviewBanner count={vm.data.requires_review_count} />
                        <HeadlineCards revenue={vm.data.revenue} costs={vm.data.costs}
                                       margin={vm.data.gross_margin} />
                        <VatQuarters periods={vm.data.vat_periods}
                                     onOpen={() => router.push('/dashboard/finance/vat')} />
                        <CashPosition receivables={vm.data.receivables}
                                      payables={vm.data.payables} />
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr',
                                      gap: spacing.lg }}>
                            <MonthlyChart points={vm.data.monthly} />
                            <TopCustomers rows={vm.data.top_customers} />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
