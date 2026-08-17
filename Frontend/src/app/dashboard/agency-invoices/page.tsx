'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Building2, Search, Filter, Clock, CheckCircle,
    AlertCircle, Euro, Eye, Download, Calendar, ChevronLeft,
    ChevronRight, X, Plus
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';

interface AgencyInvoice {
    id: string;
    invoice_number: string;
    agency: number;
    agency_name: string;
    agency_code: string;
    period_start: string;
    period_end: string;
    total_hours: string;
    subtotal: string;
    total_surcharges: string;
    vat_amount: string;
    total: string;
    status: string;
    status_display: string;
    amount_paid: string;
    amount_due: string;
    issue_date: string | null;
    due_date: string | null;
    paid_date: string | null;
    line_count: number;
    created_at: string;
}

const STATUS_COLORS: { [key: string]: { bg: string; text: string; dot: string } } = {
    'draft': { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
    'pending': { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' },
    'sent': { bg: '#DBEAFE', text: '#2563EB', dot: '#3B82F6' },
    'paid': { bg: '#D1FAE5', text: '#059669', dot: '#10B981' },
    'partially_paid': { bg: '#FDE68A', text: '#B45309', dot: '#F59E0B' },
    'overdue': { bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' },
    'cancelled': { bg: '#F3F4F6', text: '#9CA3AF', dot: '#D1D5DB' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AgencyInvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/invoices/agency-invoices/?page=${page}&page_size=${pageSize}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setInvoices(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load agency invoices', err); }
        finally { setLoading(false); }
    }, [page, statusFilter]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const filtered = invoices.filter(inv => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return inv.invoice_number.toLowerCase().includes(q)
                || inv.agency_name.toLowerCase().includes(q)
                || inv.agency_code.toLowerCase().includes(q);
        }
        return true;
    });

    // Stats
    const totalValue = invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0);
    const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.amount_paid || '0'), 0);
    const paidCount = invoices.filter(i => i.status === 'paid').length;
    const pendingCount = invoices.filter(i => ['draft', 'pending', 'sent'].includes(i.status)).length;

    const cardStyle: React.CSSProperties = {
        background: 'white', borderRadius: '12px', padding: '20px',
        border: '1px solid #E2E8F0',
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Agency Invoices</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Manage invoices for employment agencies</p>
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Invoices', value: invoices.length, icon: FileText, color: '#3B82F6' },
                        { label: 'Paid', value: paidCount, icon: CheckCircle, color: '#10B981' },
                        { label: 'Pending', value: pendingCount, icon: Clock, color: '#F59E0B' },
                        { label: 'Total Value', value: `€${totalValue.toFixed(2)}`, icon: Euro, color: '#8B5CF6' },
                    ].map((stat, idx) => (
                        <div key={idx} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <stat.icon size={20} color={stat.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>{stat.value}</div>
                                <div style={{ fontSize: '12px', color: '#64748B' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search + Filters */}
                <div style={{ ...cardStyle, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input
                                style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                placeholder="Search by invoice number or agency..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            style={{ padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', minWidth: '160px' }}
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>

                {/* Invoice Table */}
                <div style={cardStyle}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                            <FileText size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ fontSize: '16px', fontWeight: 600 }}>No agency invoices found</p>
                            <p style={{ fontSize: '13px' }}>Generate invoices from the Agency detail page.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                                    {['Invoice #', 'Agency', 'Period', 'Hours', 'Total', 'Paid', 'Status', ''].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(inv => {
                                    const sc = STATUS_COLORS[inv.status] || STATUS_COLORS['draft'];
                                    return (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s', cursor: 'pointer' }}
                                            onClick={() => router.push(`/dashboard/agencies/${inv.agency}`)}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 700, color: '#1E3A5F' }}>{inv.invoice_number}</td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{inv.agency_name}</div>
                                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{inv.agency_code}</div>
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#475569' }}>
                                                {inv.period_start} → {inv.period_end}
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 600 }}>{parseFloat(inv.total_hours).toFixed(1)}h</td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 700 }}>€{parseFloat(inv.total).toFixed(2)}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 600, color: parseFloat(inv.amount_due) <= 0 ? '#059669' : '#B45309' }}>
                                                €{parseFloat(inv.amount_paid).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.text }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot }} />
                                                    {inv.status_display}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
