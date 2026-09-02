/**
 * BTW Aangifte feature components — pure UI, no data fetching.
 *
 * These render what the backend calculated. They never compute a VAT figure.
 */
'use client';

import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import { SectionCard, Badge, StatCard } from '@/components/ui/shared';
import { colors, spacing, radius, fontSize, fontWeight } from '@/styles/tokens';
import type { VatBlocker, VatBox, VatEvent, VatPeriod, VatReturn } from '@/hooks/useVatPeriods';
import { useLanguage } from '@/lib/i18n';

const euro = (value: string | number) =>
    `€${Number(value).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    OPEN: { color: colors.textSecondary, bg: colors.bgAlt, label: 'Open' },
    REVIEW_REQUIRED: { color: colors.warning, bg: colors.warningBg, label: 'Review required' },
    READY_TO_FINALIZE: { color: colors.info, bg: colors.infoBg, label: 'Ready to finalize' },
    FINALIZED: { color: colors.successDark, bg: colors.successBg, label: 'Finalized' },
    LOCKED: { color: colors.primary, bg: colors.border, label: 'Locked' },
};

export function PeriodTabs({ periods, selectedId, onSelect }: {
    periods: VatPeriod[]; selectedId: number | null; onSelect: (id: number) => void;
}) {
    return (
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
            {periods.map(period => {
                const style = STATUS_STYLE[period.status] ?? STATUS_STYLE.OPEN;
                const active = period.id === selectedId;
                return (
                    <button
                        key={period.id}
                        onClick={() => onSelect(period.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: spacing.sm,
                            padding: `${spacing.md} ${spacing.lg}`,
                            border: `1px solid ${active ? colors.primary : colors.border}`,
                            background: active ? colors.bgAlt : colors.white,
                            borderRadius: radius.md, cursor: 'pointer',
                            fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                            color: colors.textPrimary,
                        }}
                    >
                        Q{period.quarter}
                        <Badge color={style.color} bg={style.bg}>{style.label}</Badge>
                        {period.is_closed && <Lock size={13} color={style.color} />}
                    </button>
                );
            })}
        </div>
    );
}

export function ReturnSummary({ vatReturn }: { vatReturn: VatReturn }) {
    const { t } = useLanguage();
    const payable = vatReturn.outcome === 'PAYABLE';
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.lg, marginBottom: spacing.xl }}>
            <StatCard label="5a — BTW verschuldigd" value={euro(vatReturn.box_5a)}
                      subtitle="Total VAT owed on your own sales and reverse-charged purchases" />
            <StatCard label="5b — Voorbelasting" value={euro(vatReturn.box_5b)}
                      subtitle="Deductible input VAT" />
            <StatCard
                label={payable ? t('Te betalen') : vatReturn.outcome === 'REFUNDABLE' ? 'Terug te ontvangen' : 'Saldo'}
                value={euro(payable ? vatReturn.amount_payable : vatReturn.amount_refundable)}
                color={payable ? colors.dangerDark : colors.successDark}
                subtitle={`Rules ${vatReturn.rules_version} · 5a − 5b`}
            />
        </div>
    );
}

export function BlockerList({ blockers }: { blockers: VatBlocker[] }) {
    if (!blockers.length) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: spacing.lg, marginBottom: spacing.xl,
                background: colors.successBg, border: `1px solid ${colors.successBorder}`,
                borderRadius: radius.md, color: colors.successDark,
            }}>
                <CheckCircle2 size={18} />
                Nothing is unresolved in this period.
            </div>
        );
    }
    return (
        <SectionCard title="Must be resolved before filing" icon={<AlertTriangle size={18} color={colors.warning} />}
                     style={{ marginBottom: spacing.xl }}>
            {blockers.map(blocker => (
                <div key={blocker.code} style={{ marginBottom: spacing.lg }}>
                    <div style={{ fontWeight: fontWeight.semibold, color: colors.warning }}>{blocker.message}</div>
                    {blocker.entries?.map(entry => (
                        <div key={entry.id} style={{
                            fontSize: fontSize.sm, color: colors.textSecondary,
                            padding: `${spacing.xs} 0 ${spacing.xs} ${spacing.lg}`,
                        }}>
                            <strong>{entry.reference}</strong> — {entry.reason}
                        </div>
                    ))}
                </div>
            ))}
        </SectionCard>
    );
}

export function BoxTable({ boxes, expandedBox, boxEntries, onToggle }: {
    boxes: VatBox[];
    expandedBox: string | null;
    boxEntries: Record<string, unknown[]>;
    onToggle: (code: string) => void;
}) {
    const { t } = useLanguage();
    return (
        <SectionCard title={t('Rubrieken')} subtitle="Click a rubriek to see the transactions behind it">
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}>
                            <th style={{ padding: spacing.md, width: 60 }}>{t('Rubriek')}</th>
                            <th style={{ padding: spacing.md }}>Omschrijving</th>
                            <th style={{ padding: spacing.md, textAlign: 'right' }}>{t('Bedrag')}</th>
                            <th style={{ padding: spacing.md, textAlign: 'right' }}>{t('Omzetbelasting')}</th>
                            <th style={{ padding: spacing.md, textAlign: 'right', width: 90 }}>{t('Posten')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {boxes.map(box => {
                            const open = expandedBox === box.code;
                            const entries = (boxEntries[box.code] ?? []) as Array<Record<string, string>>;
                            return (
                                <React.Fragment key={box.code}>
                                    <tr onClick={() => box.entry_count > 0 && onToggle(box.code)}
                                        style={{
                                            borderBottom: `1px solid ${colors.borderLight}`,
                                            cursor: box.entry_count > 0 ? 'pointer' : 'default',
                                            background: open ? colors.bgAlt : undefined,
                                        }}>
                                        <td style={{ padding: spacing.md, fontWeight: fontWeight.semibold }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {box.entry_count > 0 && (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                                                {box.code}
                                            </span>
                                        </td>
                                        <td style={{ padding: spacing.md }}>
                                            {box.name}
                                            {box.is_computed && (
                                                <div style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                                                    Berekend uit de overige rubrieken
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: spacing.md, textAlign: 'right' }}>{euro(box.taxable_base)}</td>
                                        <td style={{ padding: spacing.md, textAlign: 'right' }}>{euro(box.vat_amount)}</td>
                                        <td style={{ padding: spacing.md, textAlign: 'right', color: colors.textSecondary }}>
                                            {box.entry_count}
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 0, background: colors.bgAlt }}>
                                                {entries.length === 0 ? (
                                                    <div style={{ padding: spacing.lg, color: colors.textSecondary, fontSize: fontSize.sm }}>
                                                        Loading transactions…
                                                    </div>
                                                ) : entries.map(entry => (
                                                    <div key={String(entry.id)} style={{
                                                        display: 'flex', justifyContent: 'space-between',
                                                        padding: `${spacing.sm} ${spacing.xl}`,
                                                        fontSize: fontSize.sm, color: colors.textSecondary,
                                                    }}>
                                                        <span>{entry.transaction_date} · {entry.source_reference || entry.source_type}</span>
                                                        <span>{euro(entry.taxable_base)} / {euro(entry.vat_amount)}</span>
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}

export function AuditTrail({ events }: { events: VatEvent[] }) {
    const { t } = useLanguage();
    if (!events.length) return null;
    return (
        <SectionCard title={t('Audit trail')} style={{ marginTop: spacing.xl }}>
            {events.map((event, index) => (
                <div key={index} style={{
                    display: 'flex', gap: spacing.lg, padding: `${spacing.sm} 0`,
                    borderBottom: `1px solid ${colors.borderLight}`,
                    fontSize: fontSize.sm,
                }}>
                    <span style={{ fontWeight: fontWeight.semibold, minWidth: 150 }}>{event.event}</span>
                    <span style={{ flex: 1, color: colors.textSecondary }}>{event.detail}</span>
                    <span style={{ color: colors.textSecondary }}>
                        {new Date(event.at).toLocaleString('nl-NL')} {event.actor ? `· ${event.actor}` : ''}
                    </span>
                </div>
            ))}
        </SectionCard>
    );
}
