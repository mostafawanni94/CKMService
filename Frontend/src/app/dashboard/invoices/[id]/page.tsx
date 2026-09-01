/**
 * Invoice detail — thin page that composes hook + components.
 *
 * Architecture:
 *   Page (this file) → useInvoiceDetail (hook) → InvoiceDetailComponents (UI)
 */
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Mail, Send, Undo2, Wallet } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Button, Input, LoadingSpinner, Modal, PageHeader, TextArea,
} from '@/components/ui/shared';
import {
    CreditNoteList, InvoiceHeader, IssueGate, LineTable, TotalsPanel,
} from '@/components/features/invoices/InvoiceDetailComponents';
import { useInvoiceDetail } from '@/hooks/useInvoiceDetail';
import { colors, spacing } from '@/styles/tokens';
import styles from '../../finance/page.module.css';

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const vm = useInvoiceDetail(id);

    const [creditOpen, setCreditOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [selectedLines, setSelectedLines] = useState<string[]>([]);
    const [payOpen, setPayOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [sendOpen, setSendOpen] = useState(false);
    const [email, setEmail] = useState('');

    const invoice = vm.invoice;
    const toggleLine = (lineId: string) => setSelectedLines(prev =>
        prev.includes(lineId) ? prev.filter(x => x !== lineId) : [...prev, lineId]);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <Button variant="ghost" icon={<ArrowLeft size={16} />}
                        onClick={() => router.push('/dashboard/invoices')}
                        style={{ marginBottom: spacing.md }}>
                    Terug naar facturen
                </Button>

                <PageHeader
                    title={invoice?.invoice_number ?? 'Factuur'}
                    subtitle={invoice?.document_type === 'credit_note'
                        ? 'Creditnota' : 'Verkoopfactuur'}
                    actions={invoice ? (
                        <>
                            <Button variant="secondary" icon={<Download size={16} />}
                                    onClick={vm.downloadPdf}>PDF</Button>
                            {!invoice.is_issued && invoice.document_type === 'invoice' && (
                                <Button icon={<Send size={16} />} disabled={!vm.canIssue || vm.busy}
                                        onClick={vm.issue}>Versturen</Button>
                            )}
                            {invoice.is_issued && (
                                <>
                                    <Button variant="secondary" icon={<Mail size={16} />}
                                            onClick={() => { setEmail(''); setSendOpen(true); }}>
                                        E-mailen
                                    </Button>
                                    <Button variant="secondary" icon={<Wallet size={16} />}
                                            onClick={() => {
                                                setAmount(String(
                                                    Number(invoice.net_of_credits)
                                                    - Number(invoice.amount_paid)));
                                                setPayOpen(true);
                                            }}>
                                        Betaling
                                    </Button>
                                    {invoice.document_type === 'invoice' && (
                                        <Button variant="danger" icon={<Undo2 size={16} />}
                                                onClick={() => setCreditOpen(true)}>
                                            Crediteren
                                        </Button>
                                    )}
                                </>
                            )}
                        </>
                    ) : undefined}
                />

                {vm.error && (
                    <div style={{
                        padding: spacing.lg, marginBottom: spacing.lg, borderRadius: 8,
                        background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`,
                        color: colors.dangerDark,
                    }}>{vm.error}</div>
                )}

                {vm.loading || !invoice ? (
                    <LoadingSpinner message="Factuur laden…" />
                ) : (
                    <>
                        <InvoiceHeader invoice={invoice} />
                        {!invoice.is_issued && invoice.document_type === 'invoice' && (
                            <IssueGate blockers={vm.blockers} />
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr',
                                      gap: spacing.lg, alignItems: 'start' }}>
                            <LineTable lines={invoice.lines} />
                            <TotalsPanel invoice={invoice} />
                        </div>
                        <CreditNoteList notes={invoice.credit_notes}
                                        onOpen={noteId => router.push(`/dashboard/invoices/${noteId}`)} />
                    </>
                )}

                <Modal open={creditOpen} onClose={() => setCreditOpen(false)}
                       title={`Crediteren — ${invoice?.invoice_number ?? ''}`} width="720px"
                       footer={
                           <>
                               <Button variant="secondary" onClick={() => setCreditOpen(false)}>
                                   Annuleren
                               </Button>
                               <Button variant="danger"
                                       disabled={reason.trim().length < 10 || vm.busy}
                                       onClick={async () => {
                                           const note = await vm.creditNote(reason, selectedLines);
                                           setCreditOpen(false);
                                           setReason('');
                                           setSelectedLines([]);
                                           const created = note as { credit_note?: { id: string } } | null;
                                           if (created?.credit_note?.id) {
                                               router.push(`/dashboard/invoices/${created.credit_note.id}`);
                                           }
                                       }}>
                                   Creditnota maken
                               </Button>
                           </>
                       }>
                    <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
                        De oorspronkelijke factuur blijft ongewijzigd. Er wordt een aparte,
                        genummerde creditnota gemaakt die naar deze factuur verwijst.
                        Selecteer regels voor een gedeeltelijke creditering, of laat alles
                        leeg om de hele factuur te crediteren.
                    </p>
                    <TextArea label="Reden (verplicht)" value={reason} onChange={setReason}
                              placeholder="Waarom wordt deze factuur gecrediteerd?" rows={2} required />
                    {invoice && (
                        <div style={{ marginTop: spacing.lg }}>
                            <LineTable lines={invoice.lines} selectable
                                       selected={selectedLines} onToggle={toggleLine} />
                        </div>
                    )}
                </Modal>

                <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Betaling vastleggen"
                       footer={
                           <>
                               <Button variant="secondary" onClick={() => setPayOpen(false)}>
                                   Annuleren
                               </Button>
                               <Button disabled={!amount || vm.busy}
                                       onClick={async () => {
                                           await vm.recordPayment(amount);
                                           setPayOpen(false);
                                       }}>Vastleggen</Button>
                           </>
                       }>
                    <Input label="Ontvangen bedrag (€)" type="number" value={amount}
                           onChange={setAmount} />
                </Modal>

                <Modal open={sendOpen} onClose={() => setSendOpen(false)}
                       title="Factuur e-mailen"
                       footer={
                           <>
                               <Button variant="secondary" onClick={() => setSendOpen(false)}>
                                   Annuleren
                               </Button>
                               <Button disabled={vm.busy}
                                       onClick={async () => {
                                           await vm.send(email || undefined);
                                           setSendOpen(false);
                                       }}>Versturen</Button>
                           </>
                       }>
                    <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
                        De pdf wordt als bijlage meegestuurd. Laat leeg om het e-mailadres
                        van de klant te gebruiken.
                    </p>
                    <Input label="E-mailadres" value={email} onChange={setEmail}
                           placeholder="administratie@klant.nl" />
                </Modal>
            </div>
        </DashboardLayout>
    );
}
