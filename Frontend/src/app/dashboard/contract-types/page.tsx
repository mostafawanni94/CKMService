'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Clock,
    Building2,
    Users
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/dashboard';

// Types
interface ContractType {
    id: number;
    name: string;
    code: string;
    description: string;
    is_active: boolean;
    requires_end_date: boolean;
    requires_agency: boolean;
    default_duration_months: number | null;
    default_hours_type: string;
    sort_order: number;
}



export default function ContractTypesPage() {
    const { t } = useLanguage();
    const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<ContractType | null>(null);
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true,
        requires_end_date: false,
        requires_agency: false,
        default_duration_months: null as number | null,
        default_hours_type: '',
        sort_order: 0,
    });

    // Load contract types from API
    useEffect(() => {
        fetchContractTypes();
    }, []);

    const fetchContractTypes = async () => {
        try {
            setIsLoading(true);
            setLoadError(null);
            const API_URL = 'http://localhost:8000/api';
            const response = await fetch(`${API_URL}/employees/contract-types/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                // Handle both array and paginated response
                const types = Array.isArray(data) ? data : (data.results || []);
                setContractTypes(types);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch contract types:', response.status, errorText);
                setLoadError(`Failed to load contract types (${response.status})`);
                setContractTypes([]);
            }
        } catch (error) {
            console.error('Error fetching contract types:', error);
            setLoadError('Connection error. Please try again.');
            setContractTypes([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter contract types
    const filteredTypes = contractTypes.filter(type => {
        const matchesSearch = type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterActive === 'all' ||
            (filterActive === 'active' && type.is_active) ||
            (filterActive === 'inactive' && !type.is_active);
        return matchesSearch && matchesFilter;
    });

    // Stats
    const stats = {
        total: contractTypes.length,
        active: contractTypes.filter(c => c.is_active).length,
        withAgency: contractTypes.filter(c => c.requires_agency).length,
        withEndDate: contractTypes.filter(c => c.requires_end_date).length,
    };

    // Open modal for add/edit
    const openModal = (contractType?: ContractType) => {
        if (contractType) {
            setEditingType(contractType);
            setFormData({
                name: contractType.name,
                code: contractType.code,
                description: contractType.description,
                is_active: contractType.is_active,
                requires_end_date: contractType.requires_end_date,
                requires_agency: contractType.requires_agency,
                default_duration_months: contractType.default_duration_months,
                default_hours_type: contractType.default_hours_type,
                sort_order: contractType.sort_order,
            });
        } else {
            setEditingType(null);
            setFormData({
                name: '',
                code: '',
                description: '',
                is_active: true,
                requires_end_date: false,
                requires_agency: false,
                default_duration_months: null,
                default_hours_type: '',
                sort_order: contractTypes.length + 1,
            });
        }
        setIsModalOpen(true);
    };

    // Save contract type
    const saveContractType = async () => {
        try {
            const API_URL = 'http://localhost:8000/api';
            const url = editingType
                ? `${API_URL}/employees/contract-types/${editingType.id}/`
                : `${API_URL}/employees/contract-types/`;
            const method = editingType ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                fetchContractTypes();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error('Error saving contract type:', error);
        }
    };

    // Delete contract type
    const deleteContractType = async (id: number) => {
        if (!confirm('Are you sure you want to delete this contract type?')) return;

        try {
            const API_URL = 'http://localhost:8000/api';
            const response = await fetch(`${API_URL}/employees/contract-types/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (response.ok) {
                fetchContractTypes();
            }
        } catch (error) {
            console.error('Error deleting contract type:', error);
        }
    };

    // Toggle active status
    const toggleActive = async (type: ContractType) => {
        try {
            const API_URL = 'http://localhost:8000/api';
            const response = await fetch(`${API_URL}/employees/contract-types/${type.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !type.is_active }),
            });

            if (response.ok) {
                fetchContractTypes();
            }
        } catch (error) {
            console.error('Error toggling active status:', error);
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
                            Contract Types (NL)
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            marginTop: '6px',
                        }}>
                            Manage Dutch employment contract types for employees
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
                        Add Contract Type
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard label="Total Types" value={stats.total} icon={FileText} color="#6366F1" />
                    <StatCard label="Active" value={stats.active} icon={CheckCircle} color="#10B981" />
                    <StatCard label="Requires Agency" value={stats.withAgency} icon={Building2} color="#F59E0B" />
                    <StatCard label="Requires End Date" value={stats.withEndDate} icon={Calendar} color="#EC4899" />
                </div>

                {/* Search & Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '24px',
                }}>
                    {/* Search */}
                    <div style={{ flex: 1, position: 'relative' }}>
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
                            placeholder="Search contract types..."
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

                {/* Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 100px 1fr 100px 100px 100px 80px',
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
                        <div>Contract Type</div>
                        <div>Code</div>
                        <div>Description</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>End Date</div>
                        <div style={{ textAlign: 'center' }}>Agency</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {/* Table Body */}
                    {isLoading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            Loading...
                        </div>
                    ) : filteredTypes.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No contract types found</p>
                            <p style={{ fontSize: '14px', marginTop: '4px' }}>
                                {searchQuery ? 'Try a different search term' : 'Click "Add Contract Type" to create one'}
                            </p>
                        </div>
                    ) : (
                        filteredTypes.map((type, index) => (
                            <div
                                key={type.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 100px 1fr 100px 100px 100px 80px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    alignItems: 'center',
                                    borderBottom: index < filteredTypes.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    backgroundColor: type.is_active ? 'white' : '#FAFAFA',
                                }}
                            >
                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: type.is_active ? '#EEF2FF' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <FileText size={20} color={type.is_active ? '#6366F1' : '#9CA3AF'} />
                                    </div>
                                    <div>
                                        <p style={{
                                            fontWeight: 600,
                                            color: type.is_active ? '#1F2937' : '#9CA3AF',
                                            fontSize: '14px',
                                        }}>
                                            {type.name}
                                        </p>
                                        {type.default_duration_months && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '11px',
                                                color: '#6B7280',
                                                marginTop: '2px',
                                            }}>
                                                <Clock size={10} />
                                                {type.default_duration_months} months default
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Code */}
                                <span style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    color: '#6366F1',
                                    backgroundColor: '#EEF2FF',
                                    borderRadius: '6px',
                                }}>
                                    {type.code}
                                </span>

                                {/* Description */}
                                <p style={{
                                    fontSize: '13px',
                                    color: '#6B7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {type.description || 'No description'}
                                </p>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => toggleActive(type)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: type.is_active ? '#059669' : '#6B7280',
                                            backgroundColor: type.is_active ? '#D1FAE5' : '#F3F4F6',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {type.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {type.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Requires End Date */}
                                <div style={{ textAlign: 'center' }}>
                                    {type.requires_end_date ? (
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
                                            <Calendar size={12} />
                                            Required
                                        </span>
                                    ) : (
                                        <span style={{ color: '#D1D5DB', fontSize: '13px' }}>-</span>
                                    )}
                                </div>

                                {/* Requires Agency */}
                                <div style={{ textAlign: 'center' }}>
                                    {type.requires_agency ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: '#7C3AED',
                                            backgroundColor: '#EDE9FE',
                                            borderRadius: '6px',
                                        }}>
                                            <Building2 size={12} />
                                            Required
                                        </span>
                                    ) : (
                                        <span style={{ color: '#D1D5DB', fontSize: '13px' }}>-</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                }}>
                                    <button
                                        onClick={() => openModal(type)}
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
                                        onClick={() => deleteContractType(type.id)}
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
                                maxWidth: '560px',
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
                                    {editingType ? 'Edit Contract Type' : 'Add Contract Type'}
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: '#6B7280',
                                    marginTop: '4px',
                                }}>
                                    {editingType
                                        ? 'Update the contract type details'
                                        : 'Create a new Dutch employment contract type'}
                                </p>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '24px' }}>
                                {/* Name & Code */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={labelStyle}>Contract Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Onbepaalde tijd"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Code *</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. NL_IND"
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe this contract type..."
                                        rows={3}
                                        style={{ ...inputStyle, resize: 'vertical' }}
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
                                        description="Show in dropdown"
                                        checked={formData.is_active}
                                        onChange={(v) => setFormData({ ...formData, is_active: v })}
                                    />
                                    <ToggleOption
                                        label="Requires End Date"
                                        description="End date mandatory"
                                        checked={formData.requires_end_date}
                                        onChange={(v) => setFormData({ ...formData, requires_end_date: v })}
                                    />
                                    <ToggleOption
                                        label="Requires Agency"
                                        description="Agency dropdown shown"
                                        checked={formData.requires_agency}
                                        onChange={(v) => setFormData({ ...formData, requires_agency: v })}
                                    />
                                    {formData.requires_end_date && (
                                        <div>
                                            <label style={labelStyle}>Default Duration (months)</label>
                                            <input
                                                type="number"
                                                value={formData.default_duration_months || ''}
                                                onChange={(e) => setFormData({ ...formData, default_duration_months: parseInt(e.target.value) || null })}
                                                min={1}
                                                placeholder="12"
                                                style={{ ...inputStyle, width: '100px' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Hours Type */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>Default Hours Type</label>
                                    <select
                                        value={formData.default_hours_type}
                                        onChange={(e) => setFormData({ ...formData, default_hours_type: e.target.value })}
                                        style={inputStyle}
                                    >
                                        <option value="">No default</option>
                                        <option value="full_time">Full-time (Voltijd)</option>
                                        <option value="part_time">Part-time (Deeltijd)</option>
                                    </select>
                                </div>

                                {/* Sort Order */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={labelStyle}>Sort Order</label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        style={{ ...inputStyle, width: '100px' }}
                                    />
                                </div>

                                {/* Buttons */}
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
                                        onClick={saveContractType}
                                        disabled={!formData.name.trim() || !formData.code.trim()}
                                        style={{
                                            padding: '12px 24px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            backgroundColor: (formData.name.trim() && formData.code.trim()) ? '#3B82F6' : '#D1D5DB',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: (formData.name.trim() && formData.code.trim()) ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        {editingType ? 'Save Changes' : 'Create Contract Type'}
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

// Styles
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
            padding: '20px',
            border: '1px solid #E5E7EB',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>{label}</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>{value}</p>
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
    onChange: (v: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                padding: '14px',
                backgroundColor: checked ? '#EFF6FF' : '#F9FAFB',
                border: `1px solid ${checked ? '#3B82F6' : '#E5E7EB'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontWeight: 500, color: '#1F2937', fontSize: '14px' }}>{label}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{description}</p>
                </div>
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    backgroundColor: checked ? '#3B82F6' : 'white',
                    border: `2px solid ${checked ? '#3B82F6' : '#D1D5DB'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {checked && <CheckCircle size={14} color="white" />}
                </div>
            </div>
        </div>
    );
}
