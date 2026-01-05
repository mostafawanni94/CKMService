'use client';

import { useState, useEffect } from 'react';
import {
    Gift,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Euro,
    Hash,
    Users
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/dashboard';

// Types
interface AllowanceType {
    id: number;
    name: string;
    code: string;
    base_price: string;
    description: string;
    is_active: boolean;
    customer_count?: number;
}

export default function AllowancesPage() {
    const { t } = useLanguage();
    const [allowances, setAllowances] = useState<AllowanceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAllowance, setEditingAllowance] = useState<AllowanceType | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        base_price: '',
        description: '',
        is_active: true,
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    // Load allowance types from API
    useEffect(() => {
        loadAllowances();
    }, []);

    async function loadAllowances() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to load allowance types');
            const data = await response.json();
            setAllowances(data.results || data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load allowance types');
        } finally {
            setLoading(false);
        }
    }

    // Filter allowances
    const filteredAllowances = allowances.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterActive === 'all' ||
            (filterActive === 'active' && a.is_active) ||
            (filterActive === 'inactive' && !a.is_active);
        return matchesSearch && matchesFilter;
    });

    // Stats
    const stats = {
        total: allowances.length,
        active: allowances.filter(a => a.is_active).length,
        totalValue: allowances.reduce((sum, a) => sum + (parseFloat(a.base_price) || 0), 0),
    };

    // Open modal for add/edit
    const openModal = (allowance?: AllowanceType) => {
        if (allowance) {
            setEditingAllowance(allowance);
            setFormData({
                name: allowance.name,
                code: allowance.code,
                base_price: allowance.base_price,
                description: allowance.description || '',
                is_active: allowance.is_active,
            });
        } else {
            setEditingAllowance(null);
            setFormData({
                name: '',
                code: '',
                base_price: '0.00',
                description: '',
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    // Save allowance (create or update via API)
    const saveAllowance = async () => {
        if (!formData.name.trim()) {
            alert('Please enter an allowance name');
            return;
        }
        if (!formData.code.trim()) {
            alert('Please enter an allowance code');
            return;
        }

        setSaving(true);
        try {
            const url = editingAllowance
                ? `${API_URL}/employees/allowance-types/${editingAllowance.id}/`
                : `${API_URL}/employees/allowance-types/`;

            console.log('Saving allowance to:', url, formData);

            const response = await fetch(url, {
                method: editingAllowance ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(formData),
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                console.error('Save error:', data);
                throw new Error(data.detail || data.name?.[0] || data.code?.[0] || 'Failed to save allowance type');
            }

            const savedData = await response.json();
            console.log('Saved successfully:', savedData);

            setIsModalOpen(false);
            await loadAllowances();
            alert(editingAllowance ? 'Allowance type updated successfully!' : 'Allowance type created successfully!');
        } catch (err) {
            console.error('Save exception:', err);
            alert(err instanceof Error ? err.message : 'Failed to save allowance type');
        } finally {
            setSaving(false);
        }
    };

    // Delete allowance via API
    const deleteAllowance = async (id: number) => {
        if (!confirm('Are you sure you want to delete this allowance type?')) return;

        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to delete allowance type');
            }

            await loadAllowances();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete allowance type');
        }
    };

    // Toggle active status via API
    const toggleActive = async (id: number) => {
        const allowance = allowances.find(a => a.id === id);
        if (!allowance) return;

        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !allowance.is_active }),
            });

            if (!response.ok) {
                throw new Error('Failed to toggle status');
            }

            await loadAllowances();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to toggle status');
        }
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '0 0 32px 0' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1F2937',
                            margin: 0,
                        }}>
                            Allowance Types
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            marginTop: '6px',
                        }}>
                            Manage allowance types that can be assigned to customers
                        </p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            backgroundColor: '#DC2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={18} />
                        Add Allowance Type
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard label="Total Types" value={stats.total} icon={Gift} color="#DC2626" />
                    <StatCard label="Active" value={stats.active} icon={CheckCircle} color="#10B981" />
                    <StatCard label="Avg. Rate" value={`€${(stats.totalValue / (stats.total || 1)).toFixed(2)}/hr`} icon={Euro} color="#6366F1" isText />
                </div>

                {/* Search & Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            placeholder="Search allowance types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 44px',
                                fontSize: '14px',
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '12px',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
                        {(['all', 'active', 'inactive'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setFilterActive(filter)}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: filterActive === filter ? 'white' : '#6B7280',
                                    backgroundColor: filterActive === filter ? '#DC2626' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Allowances Table */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 120px 100px 80px',
                        gap: '16px',
                        padding: '16px 20px',
                        backgroundColor: '#F9FAFB',
                        borderBottom: '1px solid #E5E7EB',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        <div>Allowance Name</div>
                        <div>Code</div>
                        <div style={{ textAlign: 'center' }}>Base Price</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {/* Table Body */}
                    {loading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#DC2626', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                            <p style={{ fontSize: '14px' }}>Loading allowance types...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#EF4444' }}>
                            <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>{error}</p>
                            <button onClick={loadAllowances} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
                        </div>
                    ) : filteredAllowances.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <Gift size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No allowance types found</p>
                            <p style={{ fontSize: '14px', marginTop: '4px' }}>
                                {searchQuery ? 'Try a different search term' : 'Click "Add Allowance Type" to create one'}
                            </p>
                        </div>
                    ) : (
                        filteredAllowances.map((allowance, index) => (
                            <div
                                key={allowance.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 120px 100px 80px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    alignItems: 'center',
                                    borderBottom: index < filteredAllowances.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    backgroundColor: allowance.is_active ? 'white' : '#FAFAFA',
                                }}
                            >
                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: allowance.is_active ? '#FEE2E2' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Gift size={20} color={allowance.is_active ? '#DC2626' : '#9CA3AF'} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, color: allowance.is_active ? '#1F2937' : '#9CA3AF', fontSize: '14px' }}>{allowance.name}</p>
                                        {allowance.description && (
                                            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{allowance.description}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Code */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Hash size={14} color="#9CA3AF" />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{allowance.code}</span>
                                </div>

                                {/* Base Price */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 12px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#059669',
                                        backgroundColor: '#D1FAE5',
                                        borderRadius: '8px',
                                    }}>
                                        €{parseFloat(allowance.base_price).toFixed(2)}/hr
                                    </span>
                                </div>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleActive(allowance.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: allowance.is_active ? '#059669' : '#6B7280',
                                            backgroundColor: allowance.is_active ? '#D1FAE5' : '#F3F4F6',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {allowance.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {allowance.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <button onClick={() => openModal(allowance)} style={{ padding: '8px', color: '#6B7280', backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Edit">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deleteAllowance(allowance.id)} style={{ padding: '8px', color: '#EF4444', backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div
                            style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #F3F4F6', paddingBottom: '20px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                                    {editingAllowance ? 'Edit Allowance Type' : 'Add Allowance Type'}
                                </h2>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                                    {editingAllowance ? 'Update the allowance type details' : 'Create a new allowance type for customers'}
                                </p>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '24px' }}>
                                {/* Name */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Allowance Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Mask, Hazard Pay, Travel"
                                        style={{ width: '100%', padding: '12px 16px', fontSize: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', outline: 'none' }}
                                    />
                                </div>

                                {/* Code */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Code *</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. MSK, HAZ, TRV"
                                        maxLength={10}
                                        style={{ width: '100%', padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid #E5E7EB', borderRadius: '10px', outline: 'none', textTransform: 'uppercase' }}
                                    />
                                </div>

                                {/* Base Price */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Base Price (€/hr) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '14px' }}>€</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.base_price}
                                            onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '12px 16px 12px 36px', fontSize: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Optional description..."
                                        rows={2}
                                        style={{ width: '100%', padding: '12px 16px', fontSize: '14px', border: '1px solid #E5E7EB', borderRadius: '10px', outline: 'none', resize: 'vertical' }}
                                    />
                                </div>

                                {/* Is Active */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            style={{ width: '20px', height: '20px' }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Active (available for selection)</span>
                                    </label>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveAllowance}
                                        disabled={saving}
                                        style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: '#DC2626', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                                    >
                                        {saving ? 'Saving...' : (editingAllowance ? 'Update' : 'Create')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// StatCard Component
function StatCard({ label, value, icon: Icon, color, isText }: { label: string; value: number | string; icon: any; color: string; isText?: boolean }) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E5E7EB',
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
                <Icon size={24} color={color} />
            </div>
            <div>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: isText ? '18px' : '24px', fontWeight: 700, color: '#1F2937' }}>
                    {value}
                </p>
            </div>
        </div>
    );
}
