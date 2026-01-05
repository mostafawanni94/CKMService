'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    Users,
    History,
    RotateCcw,
    Euro
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DashboardLayout } from '@/components/layout/dashboard';

// Types
interface Agency {
    id: number;
    name: string;
    code: string;
    description: string;
    is_active: boolean;
    is_deleted: boolean;
    employee_count: number;
    base_hourly_rate?: number;
    has_surcharges?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function AgenciesPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleted, setShowDeleted] = useState(false);

    // Load agencies from API
    useEffect(() => {
        fetchAgencies();
    }, [showDeleted]);

    const fetchAgencies = async () => {
        try {
            setIsLoading(true);
            const params = showDeleted ? '?include_deleted=true' : '';
            const response = await fetch(`${API_URL}/employees/agencies/${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const agencyList = Array.isArray(data) ? data : (data.results || []);
                setAgencies(agencyList);
            } else {
                setAgencies([]);
            }
        } catch (error) {
            console.error('Error fetching agencies:', error);
            setAgencies([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter agencies
    const agencyList = Array.isArray(agencies) ? agencies : [];
    const filteredAgencies = agencyList.filter(agency => {
        const matchesSearch = agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agency.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterActive === 'all' ||
            (filterActive === 'active' && agency.is_active && !agency.is_deleted) ||
            (filterActive === 'inactive' && !agency.is_active && !agency.is_deleted);
        const matchesDeleted = showDeleted || !agency.is_deleted;
        return matchesSearch && matchesFilter && matchesDeleted;
    });

    // Stats
    const stats = {
        total: agencyList.filter(a => !a.is_deleted).length,
        active: agencyList.filter(a => a.is_active && !a.is_deleted).length,
        deleted: agencyList.filter(a => a.is_deleted).length,
        totalEmployees: agencyList.filter(a => !a.is_deleted).reduce((sum, a) => sum + (a.employee_count || 0), 0),
    };

    // Navigate to create page
    const handleCreate = () => {
        router.push('/dashboard/agencies/new');
    };

    // Navigate to edit page
    const handleEdit = (agency: Agency) => {
        router.push(`/dashboard/agencies/${agency.id}`);
    };

    // Soft delete agency
    const deleteAgency = async (agency: Agency) => {
        if (agency.employee_count > 0) {
            alert('Cannot delete agency with assigned employees. Please transfer employees first.');
            return;
        }
        if (!confirm('Are you sure you want to delete this agency? This will soft delete it.')) return;

        try {
            const response = await fetch(`${API_URL}/employees/agencies/${agency.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (response.ok) {
                fetchAgencies();
            }
        } catch (error) {
            console.error('Error deleting agency:', error);
        }
    };

    // Restore agency
    const restoreAgency = async (agency: Agency) => {
        try {
            const response = await fetch(`${API_URL}/employees/agencies/${agency.id}/restore/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (response.ok) {
                fetchAgencies();
            }
        } catch (error) {
            console.error('Error restoring agency:', error);
        }
    };

    // Toggle active status
    const toggleActive = async (agency: Agency) => {
        try {
            const response = await fetch(`${API_URL}/employees/agencies/${agency.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ is_active: !agency.is_active }),
            });

            if (response.ok) {
                fetchAgencies();
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
                            Agencies (Uitzendbureaus)
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            marginTop: '6px',
                        }}>
                            Manage employment agencies and billing rates
                        </p>
                    </div>

                    <button
                        onClick={handleCreate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            backgroundColor: '#7C3AED',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Plus size={18} />
                        Add Agency
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard label="Total Agencies" value={stats.total} icon={Building2} color="#7C3AED" />
                    <StatCard label="Active" value={stats.active} icon={CheckCircle} color="#10B981" />
                    <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} color="#3B82F6" />
                    <StatCard label="Deleted (Archived)" value={stats.deleted} icon={History} color="#6B7280" />
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
                            placeholder="Search agencies..."
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

                    {/* Show Deleted Toggle */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#6B7280',
                    }}>
                        <input
                            type="checkbox"
                            checked={showDeleted}
                            onChange={(e) => setShowDeleted(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        Show deleted
                    </label>

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
                                    backgroundColor: filterActive === filter ? '#7C3AED' : 'transparent',
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
                        gridTemplateColumns: '2fr 100px 1fr 120px 100px 100px 80px',
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
                        <div>Agency</div>
                        <div>Code</div>
                        <div>Description</div>
                        <div style={{ textAlign: 'center' }}>Hourly Rate</div>
                        <div style={{ textAlign: 'center' }}>Status</div>
                        <div style={{ textAlign: 'center' }}>Employees</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {/* Table Body */}
                    {isLoading ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            Loading...
                        </div>
                    ) : filteredAgencies.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
                            <Building2 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No agencies found</p>
                            <p style={{ fontSize: '14px', marginTop: '4px' }}>
                                {searchQuery ? 'Try a different search term' : 'Click "Add Agency" to create one'}
                            </p>
                        </div>
                    ) : (
                        filteredAgencies.map((agency, index) => (
                            <div
                                key={agency.id}
                                onClick={() => !agency.is_deleted && handleEdit(agency)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 100px 1fr 120px 100px 100px 80px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    alignItems: 'center',
                                    borderBottom: index < filteredAgencies.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    backgroundColor: agency.is_deleted ? '#FEF2F2' : agency.is_active ? 'white' : '#FAFAFA',
                                    opacity: agency.is_deleted ? 0.7 : 1,
                                    cursor: agency.is_deleted ? 'default' : 'pointer',
                                    transition: 'background-color 0.15s ease',
                                }}
                                onMouseOver={(e) => {
                                    if (!agency.is_deleted) e.currentTarget.style.backgroundColor = '#F9FAFB';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = agency.is_deleted ? '#FEF2F2' : agency.is_active ? 'white' : '#FAFAFA';
                                }}
                            >
                                {/* Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: agency.is_deleted ? '#FEE2E2' : agency.is_active ? '#F3E8FF' : '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Building2 size={20} color={agency.is_deleted ? '#EF4444' : agency.is_active ? '#7C3AED' : '#9CA3AF'} />
                                    </div>
                                    <div>
                                        <p style={{
                                            fontWeight: 600,
                                            color: agency.is_deleted ? '#EF4444' : agency.is_active ? '#1F2937' : '#9CA3AF',
                                            fontSize: '14px',
                                            textDecoration: agency.is_deleted ? 'line-through' : 'none',
                                        }}>
                                            {agency.name}
                                        </p>
                                        {agency.has_surcharges && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                fontSize: '11px',
                                                color: '#7C3AED',
                                                marginTop: '2px',
                                            }}>
                                                Has surcharges
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
                                    color: '#7C3AED',
                                    backgroundColor: '#F3E8FF',
                                    borderRadius: '6px',
                                }}>
                                    {agency.code}
                                </span>

                                {/* Description */}
                                <p style={{
                                    fontSize: '13px',
                                    color: '#6B7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {agency.description || 'No description'}
                                </p>

                                {/* Hourly Rate */}
                                <div style={{ textAlign: 'center' }}>
                                    {agency.base_hourly_rate ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: '#059669',
                                            backgroundColor: '#D1FAE5',
                                            borderRadius: '6px',
                                        }}>
                                            <Euro size={12} />
                                            {Number(agency.base_hourly_rate ?? 0).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#D1D5DB', fontSize: '13px' }}>-</span>
                                    )}
                                </div>

                                {/* Status */}
                                <div style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    {agency.is_deleted ? (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: '#DC2626',
                                            backgroundColor: '#FEE2E2',
                                            borderRadius: '6px',
                                        }}>
                                            <XCircle size={12} />
                                            Deleted
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => toggleActive(agency)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 10px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: agency.is_active ? '#059669' : '#6B7280',
                                                backgroundColor: agency.is_active ? '#D1FAE5' : '#F3F4F6',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {agency.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {agency.is_active ? 'Active' : 'Inactive'}
                                        </button>
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
                                        {agency.employee_count || 0}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                }} onClick={(e) => e.stopPropagation()}>
                                    {agency.is_deleted ? (
                                        <button
                                            onClick={() => restoreAgency(agency)}
                                            style={{
                                                padding: '8px',
                                                color: '#10B981',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                            }}
                                            title="Restore"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEdit(agency)}
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
                                                onClick={() => deleteAgency(agency)}
                                                style={{
                                                    padding: '8px',
                                                    color: (agency.employee_count || 0) > 0 ? '#D1D5DB' : '#EF4444',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: (agency.employee_count || 0) > 0 ? 'not-allowed' : 'pointer',
                                                }}
                                                title={(agency.employee_count || 0) > 0 ? 'Cannot delete - has employees' : 'Delete'}
                                                disabled={(agency.employee_count || 0) > 0}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
