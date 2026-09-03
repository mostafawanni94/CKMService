/**
 * Financial Overview Page — Thin page that composes hook + components.
 * 
 * Architecture:
 *   Page (this file) → useFinanceSummary (hook) → FinanceComponents (UI)
 */
'use client';

import { Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { PageHeader, Select, Button, LoadingSpinner } from '@/components/ui/shared';
import { TopCards, BtwBox, MonthlyChart, CategoryBreakdown } from '@/components/features/finance/FinanceComponents';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import styles from './page.module.css';
import { useLanguage } from '@/lib/i18n';

const YEAR_OPTIONS_KEYS = [2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }));
const QUARTER_OPTIONS = [
  { value: '', label: 'Full Year' },
  { value: '1', label: 'Q1 (Jan-Mar)' },
  { value: '2', label: 'Q2 (Apr-Jun)' },
  { value: '3', label: 'Q3 (Jul-Sep)' },
  { value: '4', label: 'Q4 (Oct-Dec)' },
];

export default function FinancialOverviewPage() {
    const YEAR_OPTIONS = YEAR_OPTIONS_KEYS.map(o => ({ ...o, label: t(o.label) }));
    const { t } = useLanguage();
  const vm = useFinanceSummary();

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <PageHeader
          title={t('Financial Overview')}
          subtitle={t('Income, expenses, and BTW summary for Aangifte')}
          actions={
            <>
              <Select value={String(vm.year)} onChange={v => vm.setYear(parseInt(v))} options={YEAR_OPTIONS} />
              <Select value={vm.quarter} onChange={vm.setQuarter} options={QUARTER_OPTIONS} />
              <Button onClick={vm.handleExport} icon={<Download size={16} />}>{t('Export Aangifte')}</Button>
            </>
          }
        />

        {vm.loading ? (
          <LoadingSpinner message={t('Loading financial data...')} />
        ) : (
          <>
            <TopCards
              income={vm.income} expenses={vm.expenses} netProfit={vm.netProfit}
              incomeExclVat={vm.incomeExclVat} expensesExclVat={vm.expensesExclVat}
              year={vm.year} quarter={vm.quarter}
            />
            <BtwBox vatCollected={vm.vatCollected} vatPaid={vm.vatPaid} vatDue={vm.vatDue} />
            <div className={styles.chartGrid}>
              <MonthlyChart breakdown={vm.summary?.monthly_breakdown || []} />
              <CategoryBreakdown categories={vm.summary?.expenses_by_category || []} totalExpenses={vm.expenses} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
