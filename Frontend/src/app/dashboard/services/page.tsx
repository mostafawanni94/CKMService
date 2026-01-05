'use client';

import { useState, useEffect } from 'react';
import {
    CreditCard,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Hash,
    GripVertical,
    Save,
    X,
    Filter
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';

// Types
interface CertificateType {
    id: number;
    name: string;
}

interface Service {
    id: number;
    name: string;
    code: string;
    description: string;
    is_active: boolean;
    required_certificates: number[];
    required_certificates_detail?: { id: number; name: string }[];
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Certificate types for multi-select
    const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);

    // Form & UI State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [saving, setSaving] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true,
        required_certificates: [] as number[],
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    // Load services from API
    useEffect(() => {
        loadServices();
        loadCertificateTypes();
    }, []);

    async function loadServices() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/customers/services/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to load services');
            const data = await response.json();
            setServices(data.results || data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load services');
        } finally {
            setLoading(false);
        }
    }

    async function loadCertificateTypes() {
        try {
            const response = await fetch(`${API_URL}/certificates/types/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setCertificateTypes(data.results || data || []);
            }
        } catch (err) {
            console.error('Failed to load certificate types', err);
        }
    }

    // Filter services
    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterActive === 'all' ||
            (filterActive === 'active' && service.is_active) ||
            (filterActive === 'inactive' && !service.is_active);
        return matchesSearch && matchesFilter;
    });

    // Stats
    const stats = {
        total: services.length,
        active: services.filter(s => s.is_active).length,
        inactive: services.filter(s => !s.is_active).length,
    };

    // Toggle Form
    const toggleAddForm = () => {
        if (showAddForm) {
            setShowAddForm(false);
            setFormData({ name: '', code: '', description: '', is_active: true, required_certificates: [] });
        } else {
            setEditingId(null);
            setFormData({ name: '', code: '', description: '', is_active: true, required_certificates: [] });
            setShowAddForm(true);
        }
    };

    // Start Editing
    const startEditing = (service: Service) => {
        setEditingId(service.id);
        setFormData({
            name: service.name,
            code: service.code,
            description: service.description,
            is_active: service.is_active,
            required_certificates: service.required_certificates || [],
        });
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Save Service (Create or Update)
    const saveService = async () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            alert('Service name and code are required');
            return;
        }

        setSaving(true);
        try {
            const url = editingId
                ? `${API_URL}/customers/services/${editingId}/`
                : `${API_URL}/customers/services/`;

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to save service');
            }

            await loadServices();
            setShowAddForm(false);
            setEditingId(null);
            setFormData({ name: '', code: '', description: '', is_active: true, required_certificates: [] });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save service');
        } finally {
            setSaving(false);
        }
    };

    // Delete Service
    const deleteService = async (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            const response = await fetch(`${API_URL}/customers/services/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                throw new Error('Failed to delete service');
            }

            await loadServices();
        } catch (err) {
            alert('Failed to delete service');
        }
    };

    // Toggle Active Status
    const toggleActive = async (service: Service) => {
        try {
            const response = await fetch(`${API_URL}/customers/services/${service.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !service.is_active }),
            });

            if (response.ok) {
                loadServices();
            }
        } catch (err) {
            console.error('Failed to toggle status', err);
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
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                            Services
                        </h1>
                        <p style={{ fontSize: '15px', color: '#6B7280', marginTop: '6px' }}>
                            Manage billing services offered to customers
                        </p>
                    </div>

                    <button
                        onClick={toggleAddForm}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            backgroundColor: showAddForm ? '#EF4444' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: showAddForm ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {showAddForm ? <X size={18} /> : <Plus size={18} />}
                        {showAddForm ? 'Cancel' : 'Add Service'}
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard label="Total Services" value={stats.total} icon={CreditCard} color="#6366F1" />
                    <StatCard label="Active Services" value={stats.active} icon={CheckCircle} color="#10B981" />
                    <StatCard label="Inactive Services" value={stats.inactive} icon={XCircle} color="#9CA3AF" />
                </div>

                {/* Inline Add/Edit Form */}
                {showAddForm && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        padding: '24px',
                        marginBottom: '32px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        animation: 'slideDown 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                {editingId ? 'Edit Service' : 'New Service Details'}
                            </h2>
                            {editingId && (
                                <span style={{ fontSize: '12px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>
                                    Editing ID: {editingId}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={labelStyle}>Service Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Cleaning"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Service Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SRV-01"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the service..."
                                rows={2}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* Required Certificates */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Required Certificates (Optional)</label>
                            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                                Select which certificates employees must have to perform this service
                            </p>
                            {certificateTypes.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>No certificate types available.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {certificateTypes.map(cert => {
                                        const isSelected = formData.required_certificates.includes(cert.id);
                                        return (
                                            <button
                                                key={cert.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFormData({
                                                            ...formData,
                                                            required_certificates: formData.required_certificates.filter(id => id !== cert.id)
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            required_certificates: [...formData.required_certificates, cert.id]
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 14px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '2px solid #3B82F6' : '2px solid #E5E7EB',
                                                    backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                                    color: isSelected ? '#1D4ED8' : '#374151',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {isSelected && <CheckCircle size={14} color="#3B82F6" />}
                                                {cert.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F3F4F6' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    style={{ width: '16px', height: '16px', accentColor: '#3B82F6', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>Active Service</span>
                            </label>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Button
                                    onClick={() => setShowAddForm(false)}
                                    variant="outline"
                                    className="border-gray-200 text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveService}
                                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white gap-2"
                                    disabled={saving}
                                >
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                                    {editingId ? 'Update Service' : 'Create Service'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                }}>
                    {/* Search */}
                    <div style={{
                        flex: 1,
                        position: 'relative',
                    }}>
                        <Search
                            size={18}
                            style={{
                                position: 'absolute',
                                left: '14px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search services..."
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
                                transition: 'border-color 0.15s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                    </div>

                    {/* Filter Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        backgroundColor: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                    }}>
                        {(['all', 'active', 'inactive'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setFilterActive(filter)}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: filterActive === filter ? 'white' : '#6B7280',
                                    backgroundColor: filterActive === filter ? '#3B82F6' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Services Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 2fr 1fr 2fr 100px 100px',
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
                        <div></div>
                        <div>Service Name</div>
                        <div>Code</div>
                        <div>Description</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {/* Table Body */}
                    {loading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                            <p style={{ fontSize: '14px' }}>Loading services...</p>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <CreditCard size={48} style={{ marginBottom: '16px', opacity: 0.5, margin: '0 auto' }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No services found</p>
                            <p style={{ fontSize: '14px', marginTop: '4px' }}>
                                {searchQuery ? 'Try a different search term' : 'Click "Add Service" to create one'}
                            </p>
                        </div>
                    ) : (
                        filteredServices.map((service, index) => (
                            <div
                                key={service.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '32px 2fr 1fr 2fr 100px 100px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    alignItems: 'center',
                                    borderBottom: index < filteredServices.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    backgroundColor: service.is_active ? 'white' : '#FAFAFA',
                                    transition: 'background-color 0.15s ease',
                                }}
                            >
                                {/* Icon */}
                                <div style={{ color: '#D1D5DB' }}>
                                    <GripVertical size={18} style={{ cursor: 'grab' }} />
                                </div>

                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        backgroundColor: service.is_active ? '#EFF6FF' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <CreditCard size={18} color={service.is_active ? '#3B82F6' : '#9CA3AF'} />
                                    </div>
                                    <p style={{
                                        fontWeight: 600,
                                        color: service.is_active ? '#1F2937' : '#9CA3AF',
                                        fontSize: '14px',
                                    }}>
                                        {service.name}
                                    </p>
                                </div>

                                {/* Code */}
                                <div>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#4B5563',
                                        backgroundColor: '#F3F4F6',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace'
                                    }}>
                                        <Hash size={10} />
                                        {service.code}
                                    </span>
                                </div>

                                {/* Description + Required Certificates */}
                                <div>
                                    <p style={{
                                        fontSize: '13px',
                                        color: '#6B7280',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginBottom: service.required_certificates_detail?.length ? '6px' : 0,
                                    }}>
                                        {service.description || '-'}
                                    </p>
                                    {service.required_certificates_detail && service.required_certificates_detail.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {service.required_certificates_detail.map(cert => (
                                                <span
                                                    key={cert.id}
                                                    style={{
                                                        fontSize: '10px',
                                                        fontWeight: 500,
                                                        color: '#7C3AED',
                                                        backgroundColor: '#F3E8FF',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    {cert.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleActive(service)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: service.is_active ? '#059669' : '#6B7280',
                                            backgroundColor: service.is_active ? '#D1FAE5' : '#F3F4F6',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {service.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {service.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                }}>
                                    <button
                                        onClick={() => startEditing(service)}
                                        style={{
                                            padding: '8px',
                                            color: '#6B7280',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteService(service.id)}
                                        style={{
                                            padding: '8px',
                                            color: '#EF4444',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout>
    );
}

// Styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
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
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
                <p style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1,
                    marginBottom: '4px'
                }}>
                    {value}
                </p>
                <p style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#6B7280',
                    margin: 0
                }}>
                    {label}
                </p>
            </div>
        </div>
    );
}
