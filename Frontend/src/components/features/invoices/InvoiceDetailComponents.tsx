/**
 * Invoice detail components — pure UI. No arithmetic on money.
 */
'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { Badge, SectionCard } from '@/components/ui/shared';
import { colors, fontSize, fontWeight, radius, spacing } from '@/styles/tokens';
import type { InvoiceDetail, InvoiceLine, IssueBlocker } from '@/hooks/useInvoiceDetail';

export const euro = (value: string | number | null) =>
    `€${Number(value ?? 0).toLocaleString('nl-NL', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`;

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Concept', color: colors.textSecondary, bg: colors.bgAlt },
    pending: { label: 'Ter controle', color: colors.warning, bg: colors.warningBg },
    sent: { label: 'Verstuurd', color: colors.info, bg: colors.infoBg },
    partially_paid: { label: 'Deels betaald', color: colors.warning, bg: colors.warningBg },
    paid: { label: 'Betaald', color: colors.successDark, bg: colors.successBg },
    overdue: { label: 'Vervallen', color: colors.dangerDark, bg: colors.dangerBg },
    cancelled: { label: 'Geannuleerd', color: colors.textMuted, bg: colors.border },
};

export function InvoiceHeader({ invoice }: { invoice: InvoiceDetail }) {
    const tone = STATUS[invoice.status] ?? STATUS.draft;
    const facts: Array<[string, string]> = [
        ['Klant', invoice.customer_name],
        ['Factuurdatum', invoice.issue_date ?? '—'],
        ['Vervaldatum', invoice.due_date ?? '—'],
        ['Prestatieperiode',
         invoice.period_start && invoice.period_end
             ? `${invoice.period_start} t/m ${invoice.period_end}`
             : `Week ${invoice.week_number} · ${invoice.week_year}`],
    ];
    if (invoice.corrects_number) facts.push(['Betreft factuur', invoice.corrects_number]);

    return (
        <SectionCard style={{ marginBottom: spacing.xl }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: spacing.lg }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                        <h2 style={{ margin: 0, fontSize: fontSize.heading,
                                     fontWeight: fontWeight.bold, color: colors.primary }}>
                            {invoice.invoice_number}
                        </h2>
                        <Badge color={tone.color} bg={tone.bg}>{tone.label}</Badge>
                        {invoice.document_type === 'credit_note' && (
                            <Badge color={colors.dangerDark} bg={colors.dangerBg}>Creditnota</Badge>
                        )}
                        {invoice.has_reverse_charged_lines && (
                            <Badge color={colors.primary} bg={colors.infoBg}>Btw verlegd</Badge>
                        )}
                    </div>
                    {invoice.sent_at && (
                        <div style={{ fontSize: fontSize.sm, color: colors.textSecondary,
                                      marginTop: 4 }}>
                            Verstuurd naar {invoice.sent_to} op{' '}
                            {new Date(invoice.sent_at).toLocaleString('nl-NL')}
                        </div>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: fontSize.heading, fontWeight: fontWeight.extrabold,
                                  color: colors.primary }}>{euro(invoice.total)}</div>
                    {Number(invoice.credited_total) > 0 && (
                        <div style={{ fontSize: fontSize.sm, color: colors.dangerDark }}>
                            {euro(invoice.credited_total)} gecrediteerd ·{' '}
                            {euro(invoice.net_of_credits)} netto
                        </div>
                    )}
                    {Number(invoice.amount_paid) > 0 && (
                        <div style={{ fontSize: fontSize.sm, color: colors.successDark }}>
                            {euro(invoice.amount_paid)} ontvangen
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid',
                          gridTemplateColumns: `repeat(${facts.length}, 1fr)`,
                          gap: spacing.lg }}>
                {facts.map(([label, value]) => (
                    <div key={label}>
                        <div style={{ fontSize: fontSize.xs, color: colors.textMuted,
                                      textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {label}
                        </div>
                        <div style={{ fontSize: fontSize.md }}>{value}</div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}

/** Plain Dutch for the codes the API returns. */
const BLOCKER_TITLES: Record<string, string> = {
    NO_LINES: 'Deze factuur heeft geen regels.',
    NO_RATE: 'Er is geen uurtarief bekend voor een of meer regels.',
    VAT_REQUIRES_REVIEW: 'De btw-behandeling is nog niet vastgesteld.',
    MISSING_CUSTOMER_VAT_NUMBER: 'Het btw-nummer van de klant ontbreekt.',
    EXTRAS_TREATMENT_UNRESOLVED:
        'De btw op de kosten en toeslagen is niet vast te stellen.',
    ALREADY_ISSUED: 'Deze factuur is al verstuurd.',
    CANCELLED: 'Deze factuur is geannuleerd.',
};

export function IssueGate({ blockers }: { blockers: IssueBlocker[] }) {
    if (!blockers.length) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                padding: spacing.lg, marginBottom: spacing.xl, borderRadius: radius.md,
                background: colors.successBg, border: `1px solid ${colors.successBorder}`,
                color: colors.successDark,
            }}>
                <CheckCircle2 size={18} /> Deze factuur kan worden verstuurd.
            </div>
        );
    }
    return (
        <SectionCard title="Eerst oplossen"
                     icon={<AlertTriangle size={18} color={colors.warning} />}
                     style={{ marginBottom: spacing.xl }}>
            {blockers.map(blocker => (
                <div key={blocker.code} style={{ marginBottom: spacing.md }}>
                    <div style={{ fontWeight: fontWeight.semibold, color: colors.warning }}>
                        {BLOCKER_TITLES[blocker.code] ?? blocker.message}
                    </div>
                    {BLOCKER_TITLES[blocker.code] && (
                        <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                            {blocker.message}
                        </div>
                    )}
                    {blocker.lines?.map(line => (
                        <div key={line.id} style={{
                            fontSize: fontSize.sm, color: colors.textSecondary,
                            padding: `${spacing.xs} 0 ${spacing.xs} ${spacing.lg}`,
                        }}>
                            <strong>{line.description}</strong> — {line.reason}
                        </div>
                    ))}
                </div>
            ))}
        </SectionCard>
    );
}

function LineVatBadge({ line }: { line: InvoiceLine }) {
    if (line.vat_classification_status !== 'CLASSIFIED') {
        return <Badge color={colors.warning} bg={colors.warningBg}>Vast te stellen</Badge>;
    }
    if (line.vat_return_box === '1e') {
        return <Badge color={colors.primary} bg={colors.infoBg}>Verlegd</Badge>;
    }
    return (
        <Badge color={colors.textSecondary} bg={colors.bgAlt}>
            {Number(line.vat_rate ?? 0).toFixed(0)}%
        </Badge>
    );
}

export function LineTable({ lines, selectable, selected, onToggle }: {
    lines: InvoiceLine[];
    selectable?: boolean;
    selected?: string[];
    onToggle?: (id: string) => void;
}) {
    return (
        <SectionCard title="Regels" subtitle={`${lines.length} regels`}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse',
                                fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}>
                            {selectable && <th style={{ padding: spacing.sm, width: 34 }} />}
                            <th style={{ padding: spacing.sm, width: 96 }}>Datum</th>
                            <th style={{ padding: spacing.sm }}>Omschrijving</th>
                            <th style={{ padding: spacing.sm, textAlign: 'right', width: 62 }}>Uren</th>
                            <th style={{ padding: spacing.sm, textAlign: 'right', width: 84 }}>Tarief</th>
                            <th style={{ padding: spacing.sm, textAlign: 'center', width: 96 }}>Btw</th>
                            <th style={{ padding: spacing.sm, textAlign: 'right', width: 100 }}>Bedrag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map(line => (
                            <React.Fragment key={line.id}>
                                <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                                    {selectable && (
                                        <td style={{ padding: spacing.sm }}>
                                            <input type="checkbox"
                                                   checked={selected?.includes(line.id) ?? false}
                                                   onChange={() => onToggle?.(line.id)} />
                                        </td>
                                    )}
                                    <td style={{ padding: spacing.sm }}>{line.work_date ?? ''}</td>
                                    <td style={{ padding: spacing.sm }}>
                                        {line.description}
                                        {line.vat_review_reason && (
                                            <div style={{ fontSize: fontSize.xs,
                                                          color: colors.warning }}>
                                                {line.vat_review_reason}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: spacing.sm, textAlign: 'right' }}>
                                        {Number(line.quantity_hours).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td style={{ padding: spacing.sm, textAlign: 'right' }}>
                                        {euro(line.hourly_rate)}
                                    </td>
                                    <td style={{ padding: spacing.sm, textAlign: 'center' }}>
                                        <LineVatBadge line={line} />
                                    </td>
                                    <td style={{ padding: spacing.sm, textAlign: 'right',
                                                 fontWeight: fontWeight.semibold }}>
                                        {euro(line.total)}
                                    </td>
                                </tr>
                                {(line.surcharge_breakdown ?? []).map((surcharge, index) => (
                                    <tr key={`${line.id}-${index}`}>
                                        {selectable && <td />}
                                        <td />
                                        <td colSpan={4} style={{
                                            padding: `2px ${spacing.sm}`, fontSize: fontSize.xs,
                                            color: colors.textSecondary,
                                        }}>
                                            {surcharge.name} · {surcharge.percentage}% over{' '}
                                            {surcharge.hours} uur
                                        </td>
                                        <td style={{ padding: `2px ${spacing.sm}`,
                                                     textAlign: 'right', fontSize: fontSize.xs,
                                                     color: colors.textSecondary }}>
                                            {euro(surcharge.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}

export function TotalsPanel({ invoice }: { invoice: InvoiceDetail }) {
    const rows: Array<[string, string, boolean?]> = [
        ['Subtotaal', euro(invoice.subtotal)],
    ];
    if (Number(invoice.total_costs)) rows.push(['Kosten', euro(invoice.total_costs)]);
    if (Number(invoice.total_allowances)) rows.push(['Toeslagen', euro(invoice.total_allowances)]);
    if (Number(invoice.total_gratuities)) rows.push(['Fooi', euro(invoice.total_gratuities)]);
    rows.push([
        invoice.has_reverse_charged_lines ? 'Btw (deels verlegd)' : 'Btw',
        euro(invoice.vat_amount),
    ]);
    rows.push(['Totaal', euro(invoice.total), true]);

    return (
        <SectionCard title="Totalen">
            {rows.map(([label, value, strong]) => (
                <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: `${spacing.sm} 0`,
                    borderTop: strong ? `1px solid ${colors.primary}` : undefined,
                    borderBottom: strong ? undefined : `1px solid ${colors.borderLight}`,
                    fontWeight: strong ? fontWeight.bold : fontWeight.normal,
                    fontSize: strong ? fontSize.lg : fontSize.md,
                }}>
                    <span>{label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                </div>
            ))}
        </SectionCard>
    );
}

export function CreditNoteList({ notes, onOpen }: {
    notes: InvoiceDetail['credit_notes'];
    onOpen: (id: string) => void;
}) {
    if (!notes?.length) return null;
    return (
        <SectionCard title="Creditnota's" icon={<FileText size={18} color={colors.primary} />}
                     style={{ marginTop: spacing.xl }}>
            {notes.map(note => (
                <button key={note.id} onClick={() => onOpen(note.id)} style={{
                    display: 'flex', justifyContent: 'space-between', width: '100%',
                    padding: `${spacing.sm} 0`, background: 'none', border: 'none',
                    borderBottom: `1px solid ${colors.borderLight}`, cursor: 'pointer',
                    fontSize: fontSize.md, textAlign: 'left', color: colors.textPrimary,
                }}>
                    <span>{note.invoice_number} · {note.issue_date}</span>
                    <span style={{ color: colors.dangerDark, fontWeight: fontWeight.semibold }}>
                        {euro(note.total)}
                    </span>
                </button>
            ))}
        </SectionCard>
    );
}
