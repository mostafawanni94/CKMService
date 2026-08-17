'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Euro, Receipt,
    Download, Calendar, ArrowUpRight, ArrowDownRight,
    PieChart, FileText, ChevronDown
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';

interface FinancialSummary {
    year: number;
    period_start: string;
    period_end: string;
    total_income: string;
    total_expenses: string;
    net_profit: string;
    total_income_excl_vat: string;
    total_expenses_excl_vat: string;
    total_vat_collected: string;
    total_vat_paid: string;
    vat_due: string;
    expenses_by_category: { category: string; code: string; color: string; total: string }[];
    monthly_breakdown: { month: string; expenses: number; expenses_vat: number; income: number; income_vat: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function FinancialOverviewPage() {
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState('');

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/expenses/expenses/summary/?year=${year}`;
            if (quarter) url += `&quarter=${quarter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (res.ok) {
                setSummary(await res.json());
            }
        } catch (err) { console.error('Failed to load summary', err); }
        finally { setLoading(false); }
    }, [year, quarter]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const handleExport = async () => {
        try {
            let url = `${API_URL}/expenses/expenses/export/?year=${year}`;
            if (quarter) url += `&quarter=${quarter}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Aangifte_${quarter ? `Q${quarter}_` : ''}${year}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(blobUrl);
            } else {
                alert('Export failed');
            }
        } catch (err) { alert('Export failed'); }
    };

    const cardStyle: React.CSSProperties = {
        background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0',
    };

    const income = parseFloat(summary?.total_income || '0');
    const expenses = parseFloat(summary?.total_expenses || '0');
    const netProfit = parseFloat(summary?.net_profit || '0');
    const vatCollected = parseFloat(summary?.total_vat_collected || '0');
    const vatPaid = parseFloat(summary?.total_vat_paid || '0');
    const vatDue = parseFloat(summary?.vat_due || '0');

    // Find max monthly value for bar chart scaling
    const maxMonthly = Math.max(
        ...(summary?.monthly_breakdown || []).map(m => Math.max(m.income, m.expenses)),
        1
    );

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Financial Overview</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Income, expenses, and BTW summary for Aangifte</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <select style={{ padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                            value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select style={{ padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                            value={quarter} onChange={e => setQuarter(e.target.value)}>
                            <option value="">Full Year</option>
                            <option value="1">Q1 (Jan-Mar)</option>
                            <option value="2">Q2 (Apr-Jun)</option>
                            <option value="3">Q3 (Jul-Sep)</option>
                            <option value="4">Q4 (Oct-Dec)</option>
                        </select>
                        <button onClick={handleExport}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            <Download size={16} /> Export Aangifte
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#94A3B8' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                        Loading financial data...
                    </div>
                ) : (
                    <>
                        {/* ═══ TOP STAT CARDS ═══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            {/* Income */}
                            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1px solid #A7F3D0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>Total Income</span>
                                    <ArrowUpRight size={20} color="#059669" />
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#065F46', letterSpacing: '-1px' }}>€{income.toFixed(2)}</div>
                                <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                                    excl. BTW: €{parseFloat(summary?.total_income_excl_vat || '0').toFixed(2)}
                                </div>
                            </div>

                            {/* Expenses */}
                            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', border: '1px solid #FECACA' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>Total Expenses</span>
                                    <ArrowDownRight size={20} color="#DC2626" />
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#991B1B', letterSpacing: '-1px' }}>€{expenses.toFixed(2)}</div>
                                <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px' }}>
                                    excl. BTW: €{parseFloat(summary?.total_expenses_excl_vat || '0').toFixed(2)}
                                </div>
                            </div>

                            {/* Net Profit */}
                            <div style={{ ...cardStyle, background: netProfit >= 0 ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : 'linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)', border: `1px solid ${netProfit >= 0 ? '#93C5FD' : '#FDBA74'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: netProfit >= 0 ? '#2563EB' : '#EA580C' }}>Net Profit</span>
                                    {netProfit >= 0 ? <TrendingUp size={20} color="#2563EB" /> : <TrendingDown size={20} color="#EA580C" />}
                                </div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: netProfit >= 0 ? '#1E40AF' : '#C2410C', letterSpacing: '-1px' }}>€{netProfit.toFixed(2)}</div>
                                <div style={{ fontSize: '12px', color: netProfit >= 0 ? '#1D4ED8' : '#EA580C', marginTop: '4px' }}>
                                    {netProfit >= 0 ? 'Profit' : 'Loss'} for {quarter ? `Q${quarter}` : ''} {year}
                                </div>
                            </div>
                        </div>

                        {/* ═══ BTW / VAT BOX ═══ */}
                        <div style={{ ...cardStyle, marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Euro size={18} color="#1E3A5F" /> BTW Overzicht (VAT Summary)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div style={{ padding: '16px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                    <div style={{ fontSize: '12px', color: '#15803D', fontWeight: 600, marginBottom: '4px' }}>BTW Ontvangen (Collected)</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>€{vatCollected.toFixed(2)}</div>
                                    <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>From outgoing invoices</div>
                                </div>
                                <div style={{ padding: '16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                    <div style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 600, marginBottom: '4px' }}>BTW Betaald (Paid / Voorbelasting)</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#991B1B' }}>€{vatPaid.toFixed(2)}</div>
                                    <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>From expenses</div>
                                </div>
                                <div style={{ padding: '16px', borderRadius: '10px', background: vatDue >= 0 ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${vatDue >= 0 ? '#93C5FD' : '#BBF7D0'}` }}>
                                    <div style={{ fontSize: '12px', color: vatDue >= 0 ? '#1D4ED8' : '#15803D', fontWeight: 600, marginBottom: '4px' }}>
                                        {vatDue >= 0 ? 'Af te dragen (Due)' : 'Terug te vragen (Refund)'}
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, color: vatDue >= 0 ? '#1E40AF' : '#166534' }}>€{Math.abs(vatDue).toFixed(2)}</div>
                                    <div style={{ fontSize: '11px', color: vatDue >= 0 ? '#2563EB' : '#16A34A', marginTop: '2px' }}>
                                        {vatDue >= 0 ? 'Pay to Belastingdienst' : 'Claim from Belastingdienst'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            {/* ═══ MONTHLY CHART ═══ */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 size={18} color="#1E3A5F" /> Monthly Breakdown
                                </h3>
                                {(summary?.monthly_breakdown || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                        <BarChart3 size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
                                        <p>No data for this period</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '200px', paddingTop: '10px' }}>
                                        {(summary?.monthly_breakdown || []).map((m, idx) => {
                                            const monthIdx = parseInt(m.month.split('-')[1]) - 1;
                                            const incomeH = (m.income / maxMonthly) * 170;
                                            const expenseH = (m.expenses / maxMonthly) * 170;
                                            return (
                                                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '170px' }}>
                                                        <div style={{ width: '14px', height: `${Math.max(incomeH, 2)}px`, background: 'linear-gradient(to top, #10B981, #34D399)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }}
                                                            title={`Income: €${m.income.toFixed(2)}`} />
                                                        <div style={{ width: '14px', height: `${Math.max(expenseH, 2)}px`, background: 'linear-gradient(to top, #EF4444, #F87171)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }}
                                                            title={`Expenses: €${m.expenses.toFixed(2)}`} />
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>{MONTH_NAMES[monthIdx]}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10B981' }} /> Income
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#EF4444' }} /> Expenses
                                    </div>
                                </div>
                            </div>

                            {/* ═══ EXPENSES BY CATEGORY ═══ */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PieChart size={18} color="#1E3A5F" /> By Category
                                </h3>
                                {(summary?.expenses_by_category || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                                        <PieChart size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
                                        <p>No expenses yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(summary?.expenses_by_category || []).map((cat, idx) => {
                                            const amount = parseFloat(cat.total);
                                            const pct = expenses > 0 ? (amount / expenses * 100) : 0;
                                            return (
                                                <div key={idx}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{cat.category}</span>
                                                        <span style={{ fontSize: '13px', fontWeight: 700 }}>€{amount.toFixed(2)}</span>
                                                    </div>
                                                    <div style={{ height: '6px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: cat.color || '#3B82F6', borderRadius: '3px', transition: 'width 0.5s' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
