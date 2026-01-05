'use client';

import { useState, useEffect } from 'react';
import {
    Award,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Hash,
    GripVertical,
    MoreVertical,
    ChevronRight,
    Users
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/dashboard';

// Types
interface CertificateType {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    is_required: boolean;
    has_expiry: boolean;
    has_diploma_number: boolean;
    sort_order: number;
    employee_count?: number;
}

export default function CertificatesPage() {
    const { t } = useLanguage();
    const [certificates, setCertificates] = useState<CertificateType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCertificate, setEditingCertificate] = useState<CertificateType | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        is_required: false,
        has_expiry: true,
        has_diploma_number: true,
        sort_order: 0,
    });

    // Load certificate types from API
    useEffect(() => {
        loadCertificates();
    }, []);

    async function loadCertificates() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/certificates/types/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to load certificate types');
            const data = await response.json();
            setCertificates(data.results || data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load certificate types');
        } finally {
            setLoading(false);
        }
    }

    // Filter certificates
    const filteredCertificates = certificates.filter(cert => {
        const matchesSearch = cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterActive === 'all' ||
            (filterActive === 'active' && cert.is_active) ||
            (filterActive === 'inactive' && !cert.is_active);
        return matchesSearch && matchesFilter;
    });

    // Stats
    const stats = {
        total: certificates.length,
        active: certificates.filter(c => c.is_active).length,
        required: certificates.filter(c => c.is_required).length,
        totalEmployees: certificates.reduce((sum, c) => sum + (c.employee_count || 0), 0),
    };

    // Open modal for add/edit
    const openModal = (certificate?: CertificateType) => {
        if (certificate) {
            setEditingCertificate(certificate);
            setFormData({
                name: certificate.name,
                description: certificate.description,
                is_active: certificate.is_active,
                is_required: certificate.is_required,
                has_expiry: certificate.has_expiry,
                has_diploma_number: certificate.has_diploma_number,
                sort_order: certificate.sort_order,
            });
        } else {
            setEditingCertificate(null);
            setFormData({
                name: '',
                description: '',
                is_active: true,
                is_required: false,
                has_expiry: true,
                has_diploma_number: true,
                sort_order: certificates.length + 1,
            });
        }
        setIsModalOpen(true);
    };

    // Save certificate (create or update via API)
    const saveCertificate = async () => {
        setSaving(true);
        try {
            const url = editingCertificate
                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/certificates/types/${editingCertificate.id}/`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/certificates/types/`;

            const response = await fetch(url, {
                method: editingCertificate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || data.name?.[0] || 'Failed to save certificate type');
            }

            setIsModalOpen(false);
            await loadCertificates(); // Reload from API
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save certificate type');
        } finally {
            setSaving(false);
        }
    };

    // Delete certificate via API
    const deleteCertificate = async (id: number) => {
        if (!confirm('Are you sure you want to delete this certificate type?')) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/certificates/types/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to delete certificate type');
            }

            await loadCertificates(); // Reload from API
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete certificate type');
        }
    };

    // Toggle active status via API
    const toggleActive = async (id: number) => {
        const cert = certificates.find(c => c.id === id);
        if (!cert) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/certificates/types/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !cert.is_active }),
            });

            if (!response.ok) {
                throw new Error('Failed to toggle status');
            }

            await loadCertificates(); // Reload from API
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
                            Certificate Types
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            marginTop: '6px',
                        }}>
                            Manage certificate types that employees can upload
                        </p>
                    </div>

                    <button
                        onClick={() => openModal()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={18} />
                        Add Certificate Type
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard
                        label="Total Types"
                        value={stats.total}
                        icon={Award}
                        color="#6366F1"
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={CheckCircle}
                        color="#10B981"
                    />
                    <StatCard
                        label="Required"
                        value={stats.required}
                        icon={AlertTriangle}
                        color="#F59E0B"
                    />
                    <StatCard
                        label="Total Certificates"
                        value={stats.totalEmployees}
                        icon={Users}
                        color="#EC4899"
                    />
                </div>

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
                            placeholder="Search certificate types..."
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

                    {/* Filter Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        backgroundColor: '#F3F4F6',
                        padding: '4px',
                        borderRadius: '10px',
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

                {/* Certificate Types Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 2fr 1fr 100px 100px 100px 100px 80px',
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
                        <div>Certificate Name</div>
                        <div>Description</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>Required</div>
                        <div style={{ textAlign: 'center' }}>Has Expiry</div>
                        <div style={{ textAlign: 'center' }}>Employees</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {/* Table Body */}
                    {loading ? (
                        <div style={{
                            padding: '60px 20px',
                            textAlign: 'center',
                            color: '#9CA3AF',
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid #E5E7EB',
                                borderTopColor: '#3B82F6',
                                borderRadius: '50%',
                                margin: '0 auto 16px',
                                animation: 'spin 1s linear infinite',
                            }} />
                            <p style={{ fontSize: '14px' }}>Loading certificate types...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : error ? (
                        <div style={{
                            padding: '60px 20px',
                            textAlign: 'center',
                            color: '#EF4444',
                        }}>
                            <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>{error}</p>
                            <button
                                onClick={loadCertificates}
                                style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    backgroundColor: '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredCertificates.length === 0 ? (
                        <div style={{
                            padding: '60px 20px',
                            textAlign: 'center',
                            color: '#9CA3AF',
                        }}>
                            <Award size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No certificate types found</p>
                            <p style={{ fontSize: '14px', marginTop: '4px' }}>
                                {searchQuery ? 'Try a different search term' : 'Click "Add Certificate Type" to create one'}
                            </p>
                        </div>
                    ) : (
                        filteredCertificates.map((cert, index) => (
                            <div
                                key={cert.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '32px 2fr 1fr 100px 100px 100px 100px 80px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    alignItems: 'center',
                                    borderBottom: index < filteredCertificates.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    backgroundColor: cert.is_active ? 'white' : '#FAFAFA',
                                    transition: 'background-color 0.15s ease',
                                }}
                            >
                                {/* Drag Handle */}
                                <div style={{ color: '#D1D5DB', cursor: 'grab' }}>
                                    <GripVertical size={18} />
                                </div>

                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: cert.is_active ? '#EEF2FF' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Award size={20} color={cert.is_active ? '#6366F1' : '#9CA3AF'} />
                                    </div>
                                    <div>
                                        <p style={{
                                            fontWeight: 600,
                                            color: cert.is_active ? '#1F2937' : '#9CA3AF',
                                            fontSize: '14px',
                                        }}>
                                            {cert.name}
                                        </p>
                                        {cert.has_diploma_number && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '11px',
                                                color: '#6B7280',
                                                marginTop: '2px',
                                            }}>
                                                <Hash size={10} />
                                                Has diploma number
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <p style={{
                                    fontSize: '13px',
                                    color: '#6B7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {cert.description || 'No description'}
                                </p>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleActive(cert.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: cert.is_active ? '#059669' : '#6B7280',
                                            backgroundColor: cert.is_active ? '#D1FAE5' : '#F3F4F6',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {cert.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {cert.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Required */}
                                <div style={{ textAlign: 'center' }}>
                                    {cert.is_required ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: '#D97706',
                                            backgroundColor: '#FEF3C7',
                                            borderRadius: '6px',
                                        }}>
                                            <AlertTriangle size={12} />
                                            Required
                                        </span>
                                    ) : (
                                        <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Optional</span>
                                    )}
                                </div>

                                {/* Has Expiry */}
                                <div style={{ textAlign: 'center' }}>
                                    {cert.has_expiry ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            color: '#6B7280',
                                        }}>
                                            <Calendar size={14} />
                                            Yes
                                        </span>
                                    ) : (
                                        <span style={{ color: '#D1D5DB', fontSize: '13px' }}>No</span>
                                    )}
                                </div>

                                {/* Employees */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#3B82F6',
                                        backgroundColor: '#EFF6FF',
                                        borderRadius: '6px',
                                    }}>
                                        <Users size={12} />
                                        {cert.employee_count || 0}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                }}>
                                    <button
                                        onClick={() => openModal(cert)}
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
                                        onClick={() => deleteCertificate(cert.id)}
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

                {/* Modal */}
                {isModalOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                        }}
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '520px',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '24px 24px 0',
                                borderBottom: '1px solid #F3F4F6',
                                paddingBottom: '20px',
                            }}>
                                <h2 style={{
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    color: '#1F2937',
                                    margin: 0,
                                }}>
                                    {editingCertificate ? 'Edit Certificate Type' : 'Add Certificate Type'}
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#6B7280',
                                    marginTop: '4px',
                                }}>
                                    {editingCertificate
                                        ? 'Update the certificate type details'
                                        : 'Create a new certificate type for employees to upload'}
                                </p>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '24px' }}>
                                {/* Name */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        marginBottom: '8px',
                                        color: '#374151',
                                    }}>
                                        Certificate Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. VCA Basis, Forklift License"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '10px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {/* Description */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        marginBottom: '8px',
                                        color: '#374151',
                                    }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Enter a description for this certificate type..."
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '10px',
                                            outline: 'none',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>

                                {/* Toggles Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    marginBottom: '20px',
                                }}>
                                    <ToggleOption
                                        label="Is Active"
                                        description="Show to employees"
                                        checked={formData.is_active}
                                        onChange={(v) => setFormData({ ...formData, is_active: v })}
                                    />
                                    <ToggleOption
                                        label="Is Required"
                                        description="Mandatory for all"
                                        checked={formData.is_required}
                                        onChange={(v) => setFormData({ ...formData, is_required: v })}
                                    />
                                    <ToggleOption
                                        label="Has Expiry Date"
                                        description="Certificate expires"
                                        checked={formData.has_expiry}
                                        onChange={(v) => setFormData({ ...formData, has_expiry: v })}
                                    />
                                    <ToggleOption
                                        label="Has Diploma Number"
                                        description="Extract via OCR"
                                        checked={formData.has_diploma_number}
                                        onChange={(v) => setFormData({ ...formData, has_diploma_number: v })}
                                    />
                                </div>

                                {/* Sort Order */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        marginBottom: '8px',
                                        color: '#374151',
                                    }}>
                                        Sort Order
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        style={{
                                            width: '100px',
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '10px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>

                                {/* Buttons */}
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    justifyContent: 'flex-end',
                                }}>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        style={{
                                            padding: '12px 20px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#6B7280',
                                            backgroundColor: '#F3F4F6',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveCertificate}
                                        disabled={!formData.name.trim() || saving}
                                        style={{
                                            padding: '12px 24px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            backgroundColor: (formData.name.trim() && !saving) ? '#3B82F6' : '#D1D5DB',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: (formData.name.trim() && !saving) ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        {saving ? 'Saving...' : (editingCertificate ? 'Save Changes' : 'Create Certificate Type')}
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
            padding: '20px',
            border: '1px solid #E5E7EB',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        marginBottom: '6px',
                    }}>
                        {label}
                    </p>
                    <p style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#1F2937',
                    }}>
                        {value}
                    </p>
                </div>
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
            </div>
        </div>
    );
}

// Toggle Option Component
function ToggleOption({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                padding: '14px',
                backgroundColor: checked ? '#EFF6FF' : '#F9FAFB',
                border: `2px solid ${checked ? '#3B82F6' : '#E5E7EB'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
            }}>
                <span style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: checked ? '#3B82F6' : '#374151',
                }}>
                    {label}
                </span>
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: checked ? '#3B82F6' : 'white',
                    border: `2px solid ${checked ? '#3B82F6' : '#D1D5DB'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {checked && <CheckCircle size={12} color="white" />}
                </div>
            </div>
            <p style={{
                fontSize: '11px',
                color: '#6B7280',
            }}>
                {description}
            </p>
        </div>
    );
}
