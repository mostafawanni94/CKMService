/**
 * BTW Aangifte Page — thin page that composes hook + components.
 *
 * Architecture:
 *   Page (this file) → useVatPeriods (hook) → VatComponents (UI)
 */
'use client';

import { useState } from 'react';
import { Lock, RefreshCw, Unlock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import {
    PageHeader, Select, Button, LoadingSpinner, EmptyState, Modal, TextArea,
} from '@/components/ui/shared';
import {
    PeriodTabs, ReturnSummary, BlockerList, BoxTable, AuditTrail,
} from '@/components/features/vat/VatComponents';
import { useVatPeriods } from '@/hooks/useVatPeriods';
import { colors, spacing } from '@/styles/tokens';
import styles from '../page.module.css';
import { useLanguage } from '@/lib/i18n';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028].map(y => ({ value: String(y), label: String(y) }));

export default function VatReturnPage() {
    const { t } = useLanguage();
    const vm = useVatPeriods();
    const [reopenOpen, setReopenOpen] = useState(false);
    const [reason, setReason] = useState('');

    const period = vm.selected;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <PageHeader
                    title={t('BTW Aangifte')}
                    subtitle="Quarterly VAT return — calculated from the VAT ledger, not from invoice totals"
                    actions={
                        <>
                            <Select value={String(vm.year)} onChange={v => vm.setYear(parseInt(v))} options={YEAR_OPTIONS} />
                            <Button onClick={vm.ensureYear} icon={<RefreshCw size={16} />}>{t('Generate quarters')}</Button>
                        </>
                    }
                />

                {vm.error && (
                    <div style={{
                        padding: spacing.lg, marginBottom: spacing.lg, borderRadius: 8,
                        background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, color: colors.dangerDark,
                    }}>{vm.error}</div>
                )}

                {vm.loading ? (
                    <LoadingSpinner message="Loading VAT periods…" />
                ) : vm.periods.length === 0 ? (
                    <EmptyState
                        title={`No VAT periods for ${vm.year}`}
                        subtitle="Generate the four quarters to start recording this year's return."
                        action={<Button onClick={vm.ensureYear}>{t('Generate quarters')}</Button>}
                    />
                ) : (
                    <>
                        <PeriodTabs periods={vm.periods} selectedId={vm.selectedId} onSelect={vm.setSelectedId} />

                        {!vm.vatReturn ? (
                            <LoadingSpinner message="Calculating return…" />
                        ) : (
                            <>
                                <ReturnSummary vatReturn={vm.vatReturn} />
                                <BlockerList blockers={vm.blockers} />

                                <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
                                    {period && !period.is_closed && (
                                        <Button
                                            onClick={() => vm.finalize('')}
                                            disabled={!vm.canFinalize || vm.busy}
                                        >
                                            Finalize {period.label}
                                        </Button>
                                    )}
                                    {period?.status === 'FINALIZED' && (
                                        <>
                                            <Button onClick={vm.lock} disabled={vm.busy} icon={<Lock size={16} />}>
                                                Lock permanently
                                            </Button>
                                            <Button onClick={() => setReopenOpen(true)} disabled={vm.busy}
                                                    icon={<Unlock size={16} />}>
                                                Reopen
                                            </Button>
                                        </>
                                    )}
                                    {period?.status === 'LOCKED' && (
                                        <span style={{ color: colors.textSecondary, alignSelf: 'center' }}>
                                            Filed and locked. Corrections must be posted to an open period.
                                        </span>
                                    )}
                                </div>

                                <BoxTable
                                    boxes={vm.vatReturn.boxes}
                                    expandedBox={vm.expandedBox}
                                    boxEntries={vm.boxEntries}
                                    onToggle={vm.toggleBox}
                                />
                                <AuditTrail events={vm.events} />
                            </>
                        )}
                    </>
                )}

                <Modal
                    open={reopenOpen}
                    onClose={() => setReopenOpen(false)}
                    title={`Reopen ${period?.label ?? ''}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setReopenOpen(false)}>{t('Cancel')}</Button>
                            <Button
                                disabled={reason.trim().length < 15 || vm.busy}
                                onClick={async () => {
                                    if (await vm.reopen(reason)) { setReopenOpen(false); setReason(''); }
                                }}
                            >Reopen period</Button>
                        </>
                    }
                >
                    <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
                        The figures already filed stay on record. Reopening is logged against your name.
                    </p>
                    <TextArea
                        label="Reason (required)"
                        value={reason}
                        onChange={setReason}
                        placeholder="Why does this period need to be reopened?"
                        rows={3}
                        required
                    />
                </Modal>
            </div>
        </DashboardLayout>
    );
}
