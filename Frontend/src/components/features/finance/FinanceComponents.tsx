/**
 * Finance feature components — pure UI, no data fetching.
 */
'use client';

import React from 'react';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Euro, BarChart3, PieChart
} from 'lucide-react';
import { StatCard, SectionCard } from '@/components/ui/shared';
import { colors, spacing, radius, fontSize, fontWeight, presets } from '@/styles/tokens';
import type { FinancialSummary } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

// ─── Top Stat Cards Row ─────────────────────────────────────

interface TopCardsProps {
  income: number;
  expenses: number;
  netProfit: number;
  incomeExclVat: number;
  expensesExclVat: number;
  year: number;
  quarter: string;
}

export function TopCards({ income, expenses, netProfit, incomeExclVat, expensesExclVat, year, quarter }: TopCardsProps) {
    const { t } = useLanguage();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xxl }}>
      <StatCard
        label={t('Total Income')}
        value={`€${income.toFixed(2)}`}
        icon={<ArrowUpRight size={20} color={colors.success} />}
        color={colors.successDark}
        bgGradient="linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)"
        borderColor={colors.successBorder}
        subtitle={`excl. BTW: €${incomeExclVat.toFixed(2)}`}
      />
      <StatCard
        label={t('Total Expenses')}
        value={`€${expenses.toFixed(2)}`}
        icon={<ArrowDownRight size={20} color={colors.danger} />}
        color={colors.dangerDark}
        bgGradient="linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)"
        borderColor={colors.dangerBorder}
        subtitle={`excl. BTW: €${expensesExclVat.toFixed(2)}`}
      />
      <StatCard
        label={t('Net Profit')}
        value={`€${netProfit.toFixed(2)}`}
        icon={netProfit >= 0 ? <TrendingUp size={20} color={colors.info} /> : <TrendingDown size={20} color={colors.orange} />}
        color={netProfit >= 0 ? '#1E40AF' : '#C2410C'}
        bgGradient={netProfit >= 0
          ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
          : 'linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)'}
        borderColor={netProfit >= 0 ? colors.infoBorder : colors.orangeBorder}
        subtitle={`${netProfit >= 0 ? 'Profit' : 'Loss'} for ${quarter ? `Q${quarter}` : ''} ${year}`}
      />
    </div>
  );
}

// ─── BTW Box ────────────────────────────────────────────────

interface BtwBoxProps {
  vatCollected: number;
  vatPaid: number;
  vatDue: number;
}

export function BtwBox({ vatCollected, vatPaid, vatDue }: BtwBoxProps) {
    const { t } = useLanguage();
  return (
    <SectionCard title={t('BTW Overzicht (VAT Summary)')} icon={<Euro size={18} color={colors.primary} />}
      style={{ marginBottom: spacing.xxl }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xl }}>
        <VatCell label={t('BTW Ontvangen (Collected)')} value={vatCollected}
          subtitle={t('From outgoing invoices')} color={colors.success} bg="#F0FDF4" borderColor="#BBF7D0" />
        <VatCell label={t('BTW Betaald (Voorbelasting)')} value={vatPaid}
          subtitle={t('From expenses')} color={colors.danger} bg="#FEF2F2" borderColor={colors.dangerBorder} />
        <VatCell
          label={vatDue >= 0 ? 'Af te dragen (Due)' : 'Terug te vragen (Refund)'}
          value={Math.abs(vatDue)}
          subtitle={vatDue >= 0 ? 'Pay to Belastingdienst' : 'Claim from Belastingdienst'}
          color={vatDue >= 0 ? '#1E40AF' : colors.success}
          bg={vatDue >= 0 ? '#EFF6FF' : '#F0FDF4'}
          borderColor={vatDue >= 0 ? colors.infoBorder : '#BBF7D0'}
        />
      </div>
    </SectionCard>
  );
}

function VatCell({ label, value, subtitle, color, bg, borderColor }: {
  label: string; value: number; subtitle: string; color: string; bg: string; borderColor: string;
}) {
  return (
    <div style={{ padding: spacing.lg, borderRadius: radius.lg, background: bg, border: `1px solid ${borderColor}` }}>
      <div style={{ fontSize: fontSize.sm, color, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>{label}</div>
      <div style={{ fontSize: fontSize.xxxl, fontWeight: fontWeight.extrabold, color }}>€{value.toFixed(2)}</div>
      <div style={{ fontSize: fontSize.xs, color, marginTop: '2px' }}>{subtitle}</div>
    </div>
  );
}

// ─── Monthly Chart ──────────────────────────────────────────

interface MonthlyChartProps {
  breakdown: FinancialSummary['monthly_breakdown'];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyChart({ breakdown }: MonthlyChartProps) {
    const { t } = useLanguage();
  const maxVal = Math.max(...(breakdown || []).map(m => Math.max(m.income, m.expenses)), 1);

  return (
    <SectionCard title={t('Monthly Breakdown')} icon={<BarChart3 size={18} color={colors.primary} />}>
      {(breakdown || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textLight }}>
          <BarChart3 size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p>{t('No data for this period')}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '200px', paddingTop: '10px' }}>
            {breakdown.map(m => {
              const monthIdx = parseInt(m.month.split('-')[1]) - 1;
              const incomeH = (m.income / maxVal) * 170;
              const expenseH = (m.expenses / maxVal) * 170;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '170px' }}>
                    <div style={{ width: '14px', height: `${Math.max(incomeH, 2)}px`, background: 'linear-gradient(to top, #10B981, #34D399)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`Income: €${m.income.toFixed(2)}`} />
                    <div style={{ width: '14px', height: `${Math.max(expenseH, 2)}px`, background: 'linear-gradient(to top, #EF4444, #F87171)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={`Expenses: €${m.expenses.toFixed(2)}`} />
                  </div>
                  <span style={{ fontSize: '10px', color: colors.textLight, fontWeight: fontWeight.semibold }}>{MONTH_NAMES[monthIdx]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: spacing.lg, justifyContent: 'center', marginTop: spacing.lg }}>
            <LegendDot color="#10B981" label={t('Income')} />
            <LegendDot color="#EF4444" label={t('Expenses')} />
          </div>
        </>
      )}
    </SectionCard>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: fontSize.sm, color: colors.textMuted }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} /> {label}
    </div>
  );
}

// ─── Category Breakdown ─────────────────────────────────────

interface CategoryBreakdownProps {
  categories: FinancialSummary['expenses_by_category'];
  totalExpenses: number;
}

export function CategoryBreakdown({ categories, totalExpenses }: CategoryBreakdownProps) {
    const { t } = useLanguage();
  return (
    <SectionCard title={t('By Category')} icon={<PieChart size={18} color={colors.primary} />}>
      {(categories || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textLight }}>
          <PieChart size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p>{t('No expenses yet')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map((cat, idx) => {
            const amount = parseFloat(cat.total);
            const pct = totalExpenses > 0 ? (amount / totalExpenses * 100) : 0;
            return (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{cat.category}</span>
                  <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold }}>€{amount.toFixed(2)}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: colors.bgAlt, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cat.color || colors.info, borderRadius: '3px', transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
