'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { CreditCard, Plus, Search, Download, Eye } from 'lucide-react';

export default function HRPayrollPage() {
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setLoading(false);
        setPayrolls([]);
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1E3A5F', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CreditCard style={{ width: '28px', height: '28px' }} />
                            Payroll
                        </h1>
                        <p style={{ fontSize: '15px', color: '#6B7280', margin: '4px 0 0 0' }}>Manage employee payroll and salaries</p>
                    </div>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)' }}>
                        <Plus size={18} />
                        Run Payroll
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} style={{ color: '#3B82F6' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Total Payroll</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>€0</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} style={{ color: '#059669' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Paid</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: 0 }}>€0</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} style={{ color: '#D97706' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Pending</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', margin: 0 }}>€0</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={24} style={{ color: '#6B7280' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Employees</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>0</p>
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'paid', 'pending', 'draft'].map((status) => (
                            <button key={status} onClick={() => setFilter(status)} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: filter === status ? '#1E3A5F' : '#F3F4F6', color: filter === status ? 'white' : '#6B7280' }}>
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input placeholder="Search payroll..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', width: '240px' }} />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Period</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Employee</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Gross</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Net</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={6} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CreditCard size={36} style={{ color: '#9CA3AF' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>No payroll records yet</p>
                                            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>Run your first payroll</p>
                                        </div>
                                        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                            <Plus size={18} />
                                            Run Payroll
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
