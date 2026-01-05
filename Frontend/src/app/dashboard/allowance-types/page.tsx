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
    Euro
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
    sort_order: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function AllowanceTypesPage() {
    const { t } = useLanguage();

    // State
    const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        base_price: '0.00',
        description: '',
        is_active: true,
        sort_order: 0,
    });

    useEffect(() => {
        fetchAllowanceTypes();
    }, []);

    async function fetchAllowanceTypes() {
        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                // Handle both paginated {results: [...]} and direct array responses
                setAllowanceTypes(Array.isArray(data) ? data : (data.results || []));
            }
        } catch (error) {
            console.error('Failed to fetch allowance types:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter by search
    const filtered = allowanceTypes.filter(at =>
        at.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        at.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const totalActive = allowanceTypes.filter(at => at.is_active).length;
    const totalInactive = allowanceTypes.filter(at => !at.is_active).length;

    // Open modal for add/edit
    function openModal(type?: AllowanceType) {
        if (type) {
            setEditingId(type.id);
            setFormData({
                name: type.name,
                code: type.code,
                base_price: type.base_price,
                description: type.description,
                is_active: type.is_active,
                sort_order: type.sort_order,
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                code: '',
                base_price: '0.00',
                description: '',
                is_active: true,
                sort_order: allowanceTypes.length,
            });
        }
        setShowModal(true);
    }

    // Save allowance type
    async function saveAllowanceType() {
        setSaving(true);
        try {
            const url = editingId
                ? `${API_URL}/employees/allowance-types/${editingId}/`
                : `${API_URL}/employees/allowance-types/`;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchAllowanceTypes();
                setShowModal(false);
            } else {
                alert('Failed to save allowance type');
            }
        } catch (error) {
            alert('Failed to save allowance type');
        } finally {
            setSaving(false);
        }
    }

    // Delete allowance type
    async function deleteAllowanceType(id: number) {
        if (!confirm('Are you sure you want to delete this allowance type?')) return;

        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });

            if (response.ok) {
                await fetchAllowanceTypes();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            alert('Failed to delete');
        }
    }

    // Toggle active status
    async function toggleActive(type: AllowanceType) {
        try {
            const response = await fetch(`${API_URL}/employees/allowance-types/${type.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !type.is_active }),
            });

            if (response.ok) {
                await fetchAllowanceTypes();
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
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
                            Allowance Types (Toeslag)
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: '15px' }}>
                            Manage per-hour allowances like mask, EPZ, WZH, etc.
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
                        Add Allowance Type
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                    <StatCard label="Total" value={allowanceTypes.length} icon={Gift} color="#8B5CF6" />
                    <StatCard label="Active" value={totalActive} icon={CheckCircle} color="#059669" />
                    <StatCard label="Inactive" value={totalInactive} icon={XCircle} color="#EF4444" />
                </div>

                {/* Search */}
                <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search allowance types..."
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

                {/* Table */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Code</th>
                                <th style={thStyle}>Base Price</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((type) => (
                                <tr key={type.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Gift size={18} style={{ color: '#8B5CF6' }} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>{type.name}</div>
                                                {type.description && <div style={{ fontSize: '12px', color: '#6B7280' }}>{type.description}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ padding: '4px 10px', backgroundColor: '#F3F4F6', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                            {type.code}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 700, color: '#059669', fontSize: '15px' }}>
                                            €{parseFloat(type.base_price).toFixed(2)}/hr
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => toggleActive(type)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: type.is_active ? '#D1FAE5' : '#FEE2E2',
                                                color: type.is_active ? '#059669' : '#EF4444',
                                                border: 'none',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {type.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {type.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => openModal(type)}
                                                style={{ padding: '8px', backgroundColor: '#EEF2FF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                <Edit2 size={16} style={{ color: '#4F46E5' }} />
                                            </button>
                                            <button
                                                onClick={() => deleteAllowanceType(type.id)}
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
                            {searchQuery ? 'No allowance types found matching your search' : 'No allowance types yet. Click "Add Allowance Type" to create one.'}
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
                            {editingId ? 'Edit Allowance Type' : 'Add Allowance Type'}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Name */}
                            <div>
                                <label style={labelStyle}>Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Ademlucht (mask)"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Code */}
                            <div>
                                <label style={labelStyle}>Code *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., MASK"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Base Price */}
                            <div>
                                <label style={labelStyle}>Base Price (€/hour) *</label>
                                <div style={{ position: 'relative' }}>
                                    <Euro style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} size={18} />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.base_price}
                                        onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                        style={{ ...inputStyle, paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    placeholder="Optional description..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            {/* Active Toggle */}
                            <div
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    backgroundColor: formData.is_active ? '#D1FAE5' : '#F3F4F6',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                }}
                            >
                                <span style={{ fontWeight: 500, color: '#374151' }}>Active</span>
                                <div style={{
                                    width: '44px',
                                    height: '24px',
                                    backgroundColor: formData.is_active ? '#059669' : '#D1D5DB',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    transition: 'background-color 0.2s',
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: formData.is_active ? '22px' : '2px',
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        transition: 'left 0.2s',
                                    }} />
                                </div>
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
                                onClick={saveAllowanceType}
                                disabled={saving || !formData.name || !formData.code}
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
    value: number;
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
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{value}</div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>{label}</div>
            </div>
        </div>
    );
}
