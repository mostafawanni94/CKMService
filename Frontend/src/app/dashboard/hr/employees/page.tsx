'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Users, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Employee {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    department?: string;
    is_active?: boolean;
    date_joined?: string;
}

export default function HREmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadEmployees();
    }, []);

    async function loadEmployees() {
        try {
            const response = await fetch(`${API_URL}/employees/profiles/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) {
            console.error('Failed to load employees:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            emp.email?.toLowerCase().includes(search.toLowerCase());
        if (filter === 'all') return matchesSearch;
        if (filter === 'active') return matchesSearch && emp.is_active !== false;
        if (filter === 'inactive') return matchesSearch && emp.is_active === false;
        return matchesSearch;
    });

    const activeCount = employees.filter(e => e.is_active !== false).length;
    const inactiveCount = employees.filter(e => e.is_active === false).length;

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
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1E3A5F', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Users style={{ width: '28px', height: '28px' }} />
                            Employees
                        </h1>
                        <p style={{ fontSize: '15px', color: '#6B7280', margin: '4px 0 0 0' }}>Manage your workforce</p>
                    </div>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)' }}>
                        <Plus size={18} />
                        Add Employee
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={24} style={{ color: '#3B82F6' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Total Employees</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>{employees.length}</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={24} style={{ color: '#059669' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Active</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: 0 }}>{activeCount}</p>
                        </div>
                    </div>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={24} style={{ color: '#DC2626' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Inactive</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', margin: 0 }}>{inactiveCount}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 24px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'active', 'inactive'].map((status) => (
                            <button key={status} onClick={() => setFilter(status)} style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: filter === status ? '#1E3A5F' : '#F3F4F6', color: filter === status ? 'white' : '#6B7280' }}>
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', width: '240px' }} />
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Employee</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Email</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Phone</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={36} style={{ color: '#9CA3AF' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>No employees found</p>
                                                <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>Try adjusting your search or filters</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <tr key={employee.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #1E3A5F, #3E5A8F)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                }}>
                                                    {employee.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'EE'}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#111827' }}>{employee.full_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', color: '#6B7280' }}>{employee.email || '-'}</td>
                                        <td style={{ padding: '16px 24px', color: '#6B7280' }}>{employee.phone || '-'}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                backgroundColor: employee.is_active !== false ? '#D1FAE5' : '#FEE2E2',
                                                color: employee.is_active !== false ? '#059669' : '#DC2626',
                                            }}>
                                                {employee.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button style={{ padding: '8px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                                    <Eye size={16} style={{ color: '#6B7280' }} />
                                                </button>
                                                <button style={{ padding: '8px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                                    <Edit2 size={16} style={{ color: '#6B7280' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
