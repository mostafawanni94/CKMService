'use client';

import { useState, useEffect } from 'react';
import {
    Gift,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    Clock,
    Building2,
    User,
    Euro,
    Calendar,
    Filter
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/dashboard';

// Types
interface Gratuity {
    id: number;
    customer: number;
    customer_name: string;
    employee: number;
    employee_name: string;
    amount: string;
    date_received: string;
    date_work_done: string | null;
    notes: string;
    status: 'pending' | 'paid';
    paid_to_employee_date: string | null;
}

interface Customer {
    id: number;
    company_name: string;
}

interface Employee {
    id: number;
    user: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function GratuitiesPage() {
    const { t } = useLanguage();

    // State
    const [gratuities, setGratuities] = useState<Gratuity[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterCustomer, setFilterCustomer] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState({
        customer: '',
        employee: '',
        amount: '',
        date_received: new Date().toISOString().split('T')[0],
        date_work_done: '',
        notes: '',
    });

    useEffect(() => {
        fetchGratuities();
        fetchCustomers();
        fetchEmployees();
    }, [filterStatus, filterCustomer]);

    async function fetchGratuities() {
        try {
            let url = `${API_URL}/customers/gratuities/`;
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterCustomer) params.append('customer', filterCustomer);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setGratuities(data.results || data);
            }
        } catch (error) {
            console.error('Failed to fetch gratuities:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchCustomers() {
        try {
            const response = await fetch(`${API_URL}/customers/customers/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.results || data);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    }

    async function fetchEmployees() {
        try {
            const response = await fetch(`${API_URL}/employees/profiles/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.results || data);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    }

    // Filter by search
    const filtered = gratuities.filter(g =>
        g.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalAmount = gratuities.reduce((sum, g) => sum + parseFloat(g.amount), 0);
    const pendingCount = gratuities.filter(g => g.status === 'pending').length;
    const paidCount = gratuities.filter(g => g.status === 'paid').length;

    // Open modal for add/edit
    function openModal(gratuity?: Gratuity) {
        if (gratuity) {
            setEditingId(gratuity.id);
            setFormData({
                customer: gratuity.customer.toString(),
                employee: gratuity.employee.toString(),
                amount: gratuity.amount,
                date_received: gratuity.date_received,
                date_work_done: gratuity.date_work_done || '',
                notes: gratuity.notes,
            });
        } else {
            setEditingId(null);
            setFormData({
                customer: '',
                employee: '',
                amount: '',
                date_received: new Date().toISOString().split('T')[0],
                date_work_done: '',
                notes: '',
            });
        }
        setShowModal(true);
    }

    // Save gratuity
    async function saveGratuity() {
        setSaving(true);
        try {
            const url = editingId
                ? `${API_URL}/customers/gratuities/${editingId}/`
                : `${API_URL}/customers/gratuities/`;
            const method = editingId ? 'PUT' : 'POST';

            const payload = {
                customer: parseInt(formData.customer),
                employee: parseInt(formData.employee),
                amount: formData.amount,
                date_received: formData.date_received,
                date_work_done: formData.date_work_done || null,
                notes: formData.notes,
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                await fetchGratuities();
                setShowModal(false);
            } else {
                alert('Failed to save gratuity');
            }
        } catch (error) {
            alert('Failed to save gratuity');
        } finally {
            setSaving(false);
        }
    }

    // Delete gratuity
    async function deleteGratuity(id: number) {
        if (!confirm('Are you sure you want to delete this gratuity?')) return;

        try {
            const response = await fetch(`${API_URL}/customers/gratuities/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });

            if (response.ok) {
                await fetchGratuities();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            alert('Failed to delete');
        }
    }

    // Mark as paid
    async function markAsPaid(id: number) {
        try {
            const response = await fetch(`${API_URL}/customers/gratuities/${id}/mark_paid/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ paid_date: new Date().toISOString().split('T')[0] }),
            });

            if (response.ok) {
                await fetchGratuities();
            }
        } catch (error) {
            console.error('Failed to mark as paid:', error);
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                            Gratuities (Fooi)
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: '15px' }}>
                            Track tips and bonuses from customers to employees
                        </p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={18} />
                        Add Gratuity
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                    <StatCard label="Total Amount" value={`€${totalAmount.toFixed(2)}`} icon={Euro} color="#059669" />
                    <StatCard label="Total Gratuities" value={gratuities.length.toString()} icon={Gift} color="#8B5CF6" />
                    <StatCard label="Pending" value={pendingCount.toString()} icon={Clock} color="#F59E0B" />
                    <StatCard label="Paid" value={paidCount.toString()} icon={CheckCircle} color="#10B981" />
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
                        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 48px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '10px',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: 'white',
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                    </select>
                    <select
                        value={filterCustomer}
                        onChange={(e) => setFilterCustomer(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            border: '1px solid #E5E7EB',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            backgroundColor: 'white',
                        }}
                    >
                        <option value="">All Customers</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={thStyle}>Customer</th>
                                <th style={thStyle}>Employee</th>
                                <th style={thStyle}>Amount</th>
                                <th style={thStyle}>Date Received</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((gratuity) => (
                                <tr key={gratuity.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Building2 size={16} style={{ color: '#3B82F6' }} />
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{gratuity.customer_name}</span>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={16} style={{ color: '#4F46E5' }} />
                                            </div>
                                            <span>{gratuity.employee_name}</span>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '16px' }}>
                                            €{parseFloat(gratuity.amount).toFixed(2)}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}>
                                            <Calendar size={14} />
                                            {new Date(gratuity.date_received).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        {gratuity.status === 'pending' ? (
                                            <button
                                                onClick={() => markAsPaid(gratuity.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    backgroundColor: '#FEF3C7',
                                                    color: '#F59E0B',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Clock size={14} />
                                                Pending - Click to Pay
                                            </button>
                                        ) : (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: '#D1FAE5',
                                                color: '#059669',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                            }}>
                                                <CheckCircle size={14} />
                                                Paid
                                            </span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openModal(gratuity)}
                                                style={{ padding: '8px', backgroundColor: '#EEF2FF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                <Edit2 size={16} style={{ color: '#4F46E5' }} />
                                            </button>
                                            <button
                                                onClick={() => deleteGratuity(gratuity.id)}
                                                style={{ padding: '8px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} style={{ color: '#EF4444' }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
                            {searchQuery ? 'No gratuities found matching your search' : 'No gratuities yet. Click "Add Gratuity" to create one.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
                            {editingId ? 'Edit Gratuity' : 'Add Gratuity'}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Customer */}
                            <div>
                                <label style={labelStyle}>Customer *</label>
                                <select
                                    value={formData.customer}
                                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="">Select customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Employee */}
                            <div>
                                <label style={labelStyle}>Employee *</label>
                                <select
                                    value={formData.employee}
                                    onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="">Select employee...</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.user?.first_name} {e.user?.last_name} ({e.user?.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label style={labelStyle}>Amount (€) *</label>
                                <div style={{ position: 'relative' }}>
                                    <Euro style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} size={18} />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        style={{ ...inputStyle, paddingLeft: '40px' }}
                                        placeholder="25.00"
                                    />
                                </div>
                            </div>

                            {/* Date Received */}
                            <div>
                                <label style={labelStyle}>Date Received *</label>
                                <input
                                    type="date"
                                    value={formData.date_received}
                                    onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Date Work Done */}
                            <div>
                                <label style={labelStyle}>Date Work Done (optional)</label>
                                <input
                                    type="date"
                                    value={formData.date_work_done}
                                    onChange={(e) => setFormData({ ...formData, date_work_done: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={labelStyle}>Notes</label>
                                <textarea
                                    placeholder="Optional notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveGratuity}
                                disabled={saving || !formData.customer || !formData.employee || !formData.amount}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    backgroundColor: '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

// Styles
const thStyle: React.CSSProperties = {
    padding: '16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
    padding: '16px',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#374151',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
};

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }: {
    label: string;
    value: string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={24} style={{ color }} />
            </div>
            <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{value}</div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>{label}</div>
            </div>
        </div>
    );
}
