/**
 * Finance overview components — pure UI, no data fetching and no arithmetic.
 */
'use client';

import React from 'react';
import {
    AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, Users, Wallet as WalletIcon,
} from 'lucide-react';
import { SectionCard, StatCard, Badge } from '@/components/ui/shared';
import { colors, fontSize, fontWeight, radius, spacing } from '@/styles/tokens';
import { useLanguage } from '@/lib/i18n';
import type {
    CostBlock, FinanceDashboard, MonthPoint, Payables, Receivables, RevenueBlock,
    VatPeriodSummary,
} from '@/hooks/useFinanceDashboard';

export const euro = (value: string | number) =>
    `€${Number(value ?? 0).toLocaleString('nl-NL', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;

export function HeadlineCards({ revenue, costs, margin }: {
    revenue: RevenueBlock; costs: CostBlock; margin: string;
}) {
    const { t } = useLanguage();
    const marginPct = Number(revenue.net_revenue) > 0
        ? (Number(margin) / Number(revenue.net_revenue)) * 100
        : 0;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: spacing.lg, marginBottom: spacing.xl }}>
            <StatCard
                label={t('Omzet (excl. btw)')}
                value={euro(revenue.net_revenue)}
                icon={<ArrowUpRight size={20} color={colors.success} />}
                color={colors.successDark}
                subtitle={`${revenue.invoice_count} facturen` +
                    (revenue.credit_note_count
                        ? ` · ${revenue.credit_note_count} creditnota's (${euro(revenue.credited_net)})`
                        : '')}
            />
            <StatCard
                label={t('Kosten (excl. btw)')}
                value={euro(costs.total_net)}
                icon={<ArrowDownRight size={20} color={colors.danger} />}
                color={colors.dangerDark}
                subtitle={`Inkoop ${euro(costs.supplier_net)} · Uitzend ${euro(costs.agency_net)} · Overig ${euro(costs.expense_net)}`}
            />
            <StatCard
                label={t('Brutomarge')}
                value={euro(margin)}
                color={Number(margin) >= 0 ? colors.primary : colors.dangerDark}
                subtitle={`${marginPct.toFixed(1)}% van de omzet`}
            />
        </div>
    );
}

export function ReviewBanner({ count }: { count: number }) {
    if (!count) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: spacing.sm,
            padding: spacing.lg, marginBottom: spacing.xl, borderRadius: radius.md,
            background: colors.warningBg, border: `1px solid ${colors.warningBorder}`,
            color: colors.warning, fontWeight: fontWeight.semibold,
        }}>
            <AlertTriangle size={18} />
            {count} transactie{count === 1 ? '' : 's'} zonder vastgestelde
            btw-behandeling. Deze zitten niet in de aangifte.
        </div>
    );
}

export function VatQuarters({ periods, onOpen }: {
    periods: VatPeriodSummary[]; onOpen: (id: string) => void;
}) {
    const { t } = useLanguage();
    if (!periods.length) return null;
    const label: Record<string, string> = {
        OPEN: 'Open', REVIEW_REQUIRED: t('Vast te stellen'),
        READY_TO_FINALIZE: 'Klaar om vast te zetten',
        FINALIZED: 'Vastgezet', LOCKED: 'Definitief',
    };
    const tone: Record<string, { color: string; bg: string }> = {
        OPEN: { color: colors.textSecondary, bg: colors.bgAlt },
        REVIEW_REQUIRED: { color: colors.warning, bg: colors.warningBg },
        READY_TO_FINALIZE: { color: colors.info, bg: colors.infoBg },
        FINALIZED: { color: colors.successDark, bg: colors.successBg },
        LOCKED: { color: colors.primary, bg: colors.border },
    };

    return (
        <SectionCard title={t('Btw per kwartaal')} subtitle="Berekend uit het btw-grootboek"
                     style={{ marginBottom: spacing.xl }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: spacing.md }}>
                {periods.map(period => {
                    const style = tone[period.status] ?? tone.OPEN;
                    const payable = period.outcome === 'PAYABLE';
                    return (
                        <button key={period.id} onClick={() => onOpen(period.id)}
                            style={{
                                textAlign: 'left', cursor: 'pointer',
                                padding: spacing.lg, borderRadius: radius.md,
                                border: `1px solid ${colors.border}`,
                                background: colors.white,
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between',
                                          alignItems: 'center', marginBottom: spacing.sm }}>
                                <span style={{ fontWeight: fontWeight.bold }}>Q{period.quarter}</span>
                                <Badge color={style.color} bg={style.bg}>
                                    {label[period.status] ?? period.status}
                                </Badge>
                            </div>
                            <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold,
                                          color: payable ? colors.dangerDark : colors.successDark }}>
                                {euro(Math.abs(Number(period.vat_position)))}
                            </div>
                            <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                                {payable ? t('Te betalen') : period.outcome === 'REFUNDABLE'
                                    ? 'Terug te ontvangen' : 'Saldo nihil'}
                            </div>
                            {period.requires_review_count > 0 && (
                                <div style={{ fontSize: fontSize.xs, color: colors.warning,
                                              marginTop: spacing.xs }}>
                                    {period.requires_review_count} vast te stellen
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </SectionCard>
    );
}

export function CashPosition({ receivables, payables }: {
    receivables: Receivables; payables: Payables;
}) {
    const { t } = useLanguage();
    const ageing = [
        { label: t('Nog niet vervallen'), value: receivables.ageing.current, tone: colors.textSecondary },
        { label: t('1–30 dagen'), value: receivables.ageing.days_1_30, tone: colors.warning },
        { label: t('31–60 dagen'), value: receivables.ageing.days_31_60, tone: colors.warning },
        { label: t('61–90 dagen'), value: receivables.ageing.days_61_90, tone: colors.danger },
        { label: t('90+ dagen'), value: receivables.ageing.days_90_plus, tone: colors.dangerDark },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg,
                      marginBottom: spacing.xl }}>
            <SectionCard title={t('Te ontvangen')} icon={<Clock size={18} color={colors.primary} />}
                         subtitle={`${receivables.overdue_count} facturen vervallen`}>
                <div style={{ fontSize: fontSize.heading, fontWeight: fontWeight.extrabold,
                              color: colors.primary, marginBottom: spacing.lg }}>
                    {euro(receivables.total_outstanding)}
                </div>
                {ageing.map(row => (
                    <div key={row.label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: `${spacing.xs} 0`, fontSize: fontSize.sm,
                        borderBottom: `1px solid ${colors.borderLight}`,
                    }}>
                        <span style={{ color: colors.textSecondary }}>{row.label}</span>
                        <span style={{ color: row.tone, fontWeight: fontWeight.semibold,
                                       fontVariantNumeric: 'tabular-nums' }}>
                            {euro(row.value)}
                        </span>
                    </div>
                ))}
            </SectionCard>

            <SectionCard title={t('Te betalen')} icon={<WalletIcon size={18} color={colors.primary} />}>
                <div style={{ fontSize: fontSize.heading, fontWeight: fontWeight.extrabold,
                              color: colors.dangerDark, marginBottom: spacing.lg }}>
                    {euro(payables.total)}
                </div>
                {[
                    { label: t('Inkoopfacturen'), value: payables.supplier_outstanding },
                    { label: t('Uitzendbureaus'), value: payables.agency_outstanding },
                    { label: t('Medewerkers (wallet)'), value: payables.employee_wallets },
                ].map(row => (
                    <div key={row.label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: `${spacing.xs} 0`, fontSize: fontSize.sm,
                        borderBottom: `1px solid ${colors.borderLight}`,
                    }}>
                        <span style={{ color: colors.textSecondary }}>{row.label}</span>
                        <span style={{ fontWeight: fontWeight.semibold,
                                       fontVariantNumeric: 'tabular-nums' }}>
                            {euro(row.value)}
                        </span>
                    </div>
                ))}
            </SectionCard>
        </div>
    );
}

export function MonthlyChart({ points }: { points: MonthPoint[] }) {
    const { t } = useLanguage();
    const peak = Math.max(
        1, ...points.map(p => Math.max(Number(p.revenue), Number(p.costs))));

    return (
        <SectionCard title={t('Omzet en kosten per maand')}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing.sm,
                          height: 200, padding: `${spacing.lg} 0` }}>
                {points.map(point => (
                    <div key={point.month} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end',
                                      justifyContent: 'center', gap: 2, height: 160 }}>
                            <div title={`Omzet ${euro(point.revenue)}`} style={{
                                width: '42%', background: colors.primary,
                                borderRadius: '3px 3px 0 0',
                                height: `${(Number(point.revenue) / peak) * 100}%`,
                                minHeight: Number(point.revenue) > 0 ? 3 : 0,
                            }} />
                            <div title={`Kosten ${euro(point.costs)}`} style={{
                                width: '42%', background: colors.warning,
                                borderRadius: '3px 3px 0 0',
                                height: `${(Number(point.costs) / peak) * 100}%`,
                                minHeight: Number(point.costs) > 0 ? 3 : 0,
                            }} />
                        </div>
                        <div style={{ fontSize: fontSize.xs, color: colors.textSecondary,
                                      marginTop: spacing.xs }}>{point.label}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: spacing.lg, fontSize: fontSize.sm,
                          color: colors.textSecondary }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10,
                                     background: colors.primary, borderRadius: 2,
                                     marginRight: 6 }} />{t('Omzet')}</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10,
                                     background: colors.warning, borderRadius: 2,
                                     marginRight: 6 }} />{t('Kosten')}</span>
            </div>
        </SectionCard>
    );
}

export function TopCustomers({ rows }: {
    rows: FinanceDashboard['top_customers'];
}) {
    const { t } = useLanguage();
    if (!rows.length) return null;
    return (
        <SectionCard title={t('Grootste klanten')} icon={<Users size={18} color={colors.primary} />}>
            {rows.map(row => (
                <div key={row.customer_id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: `${spacing.sm} 0`, fontSize: fontSize.md,
                    borderBottom: `1px solid ${colors.borderLight}`,
                }}>
                    <span>{row.customer}
                        <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                            {' '}· {row.invoices} facturen
                        </span>
                    </span>
                    <span style={{ fontWeight: fontWeight.semibold,
                                   fontVariantNumeric: 'tabular-nums' }}>
                        {euro(row.net)}
                    </span>
                </div>
            ))}
        </SectionCard>
    );
}
