'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { useEmployees } from '@/hooks/useEmployees';
import { CreateEmployeeModal } from '@/components/features/employees/list/CreateEmployeeModal';
import { ShareCredentialsModal } from '@/components/features/employees/list/ShareCredentialsModal';
import { ViewEmployeeModal } from '@/components/features/employees/list/ViewEmployeeModal';
import { EditEmployeeModal } from '@/components/features/employees/list/EditEmployeeModal';
import { ExtractDocumentsModal } from '@/components/features/employees/list/ExtractDocumentsModal';
import { DeleteEmployeeModal } from '@/components/features/employees/list/DeleteEmployeeModal';
import { Card, Button, Badge, Input } from '@/components/ui';
import { api, Employee } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Users, UserCheck, UserX, Search, Eye, Plus, X, Mail, Phone, Copy, MessageCircle, CheckCircle, AlertCircle, MapPin, Calendar, CreditCard, Globe, FileText, Edit, Save, Trash2, AlertTriangle, ChevronDown, Download } from 'lucide-react';
import { apiFetch, readApiError, apiGetAll } from '@/hooks/useApi';

// Comprehensive list of nationalities with country flags
const NATIONALITIES = [
    { name: 'Netherlands', flag: '🇳🇱' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Belgium', flag: '🇧🇪' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'Spain', flag: '🇪🇸' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'Poland', flag: '🇵🇱' },
    { name: 'Portugal', flag: '🇵🇹' },
    { name: 'Greece', flag: '🇬🇷' },
    { name: 'Romania', flag: '🇷🇴' },
    { name: 'Bulgaria', flag: '🇧🇬' },
    { name: 'Hungary', flag: '🇭🇺' },
    { name: 'Czech Republic', flag: '🇨🇿' },
    { name: 'Austria', flag: '🇦🇹' },
    { name: 'Sweden', flag: '🇸🇪' },
    { name: 'Denmark', flag: '🇩🇰' },
    { name: 'Finland', flag: '🇫🇮' },
    { name: 'Norway', flag: '🇳🇴' },
    { name: 'Ireland', flag: '🇮🇪' },
    { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'Turkey', flag: '🇹🇷' },
    { name: 'Morocco', flag: '🇲🇦' },
    { name: 'Algeria', flag: '🇩🇿' },
    { name: 'Tunisia', flag: '🇹🇳' },
    { name: 'Egypt', flag: '🇪🇬' },
    { name: 'Libya', flag: '🇱🇾' },
    { name: 'Syria', flag: '🇸🇾' },
    { name: 'Iraq', flag: '🇮🇶' },
    { name: 'Iran', flag: '🇮🇷' },
    { name: 'Lebanon', flag: '🇱🇧' },
    { name: 'Jordan', flag: '🇯🇴' },
    { name: 'Palestine', flag: '🇵🇸' },
    { name: 'Saudi Arabia', flag: '🇸🇦' },
    { name: 'United Arab Emirates', flag: '🇦🇪' },
    { name: 'Kuwait', flag: '🇰🇼' },
    { name: 'Qatar', flag: '🇶🇦' },
    { name: 'Oman', flag: '🇴🇲' },
    { name: 'Bahrain', flag: '🇧🇭' },
    { name: 'Yemen', flag: '🇾🇪' },
    { name: 'Afghanistan', flag: '🇦🇫' },
    { name: 'Pakistan', flag: '🇵🇰' },
    { name: 'India', flag: '🇮🇳' },
    { name: 'Bangladesh', flag: '🇧🇩' },
    { name: 'Sri Lanka', flag: '🇱🇰' },
    { name: 'Nepal', flag: '🇳🇵' },
    { name: 'China', flag: '🇨🇳' },
    { name: 'Japan', flag: '🇯🇵' },
    { name: 'South Korea', flag: '🇰🇷' },
    { name: 'Vietnam', flag: '🇻🇳' },
    { name: 'Thailand', flag: '🇹🇭' },
    { name: 'Philippines', flag: '🇵🇭' },
    { name: 'Indonesia', flag: '🇮🇩' },
    { name: 'Malaysia', flag: '🇲🇾' },
    { name: 'Singapore', flag: '🇸🇬' },
    { name: 'Russia', flag: '🇷🇺' },
    { name: 'Ukraine', flag: '🇺🇦' },
    { name: 'Belarus', flag: '🇧🇾' },
    { name: 'Kazakhstan', flag: '🇰🇿' },
    { name: 'Uzbekistan', flag: '🇺🇿' },
    { name: 'Azerbaijan', flag: '🇦🇿' },
    { name: 'Georgia', flag: '🇬🇪' },
    { name: 'Armenia', flag: '🇦🇲' },
    { name: 'United States', flag: '🇺🇸' },
    { name: 'Canada', flag: '🇨🇦' },
    { name: 'Mexico', flag: '🇲🇽' },
    { name: 'Brazil', flag: '🇧🇷' },
    { name: 'Argentina', flag: '🇦🇷' },
    { name: 'Colombia', flag: '🇨🇴' },
    { name: 'Peru', flag: '🇵🇪' },
    { name: 'Chile', flag: '🇨🇱' },
    { name: 'Venezuela', flag: '🇻🇪' },
    { name: 'Ecuador', flag: '🇪🇨' },
    { name: 'Cuba', flag: '🇨🇺' },
    { name: 'South Africa', flag: '🇿🇦' },
    { name: 'Nigeria', flag: '🇳🇬' },
    { name: 'Ghana', flag: '🇬🇭' },
    { name: 'Kenya', flag: '🇰🇪' },
    { name: 'Ethiopia', flag: '🇪🇹' },
    { name: 'Somalia', flag: '🇸🇴' },
    { name: 'Eritrea', flag: '🇪🇷' },
    { name: 'Sudan', flag: '🇸🇩' },
    { name: 'Cameroon', flag: '🇨🇲' },
    { name: 'Congo', flag: '🇨🇬' },
    { name: 'Senegal', flag: '🇸🇳' },
    { name: 'Australia', flag: '🇦🇺' },
    { name: 'New Zealand', flag: '🇳🇿' },
    { name: 'Stateless', flag: '🏳️' },
    { name: 'Other', flag: '🌍' },
];





export default function EmployeesPage() {
    const vm = useEmployees();
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('employees')}</h1>
                        <p className="text-gray-500">{t('manageProfiles')}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={loadEmployees}>
                            {t('refresh')}
                        </Button>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('addEmployee')}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '20px',
                    marginBottom: '8px'
                }}>
                    <Card style={{ padding: '20px', background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)', borderColor: '#dbeafe' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '12px' }}>
                                <Users style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>{t('totalEmployees')}</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{employees.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card style={{ padding: '20px', background: 'linear-gradient(to bottom right, #f0fdf4, #ffffff)', borderColor: '#bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                                <UserCheck style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>{t('active')}</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a', margin: 0 }}>
                                    {employees.filter(e => e.status === 'approved').length}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card style={{ padding: '20px', background: 'linear-gradient(to bottom right, #fefce8, #ffffff)', borderColor: '#fde68a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '12px' }}>
                                <Users style={{ width: '24px', height: '24px', color: '#ca8a04' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>{t('pending')}</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#ca8a04', margin: 0 }}>{pendingEmployees.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card style={{ padding: '20px', background: 'linear-gradient(to bottom right, #f9fafb, #ffffff)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                                <UserX style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Incomplete</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#4b5563', margin: 0 }}>
                                    {employees.filter(e => e.status === 'incomplete').length}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>



                {/* Filters + Table Container - matching Customers page layout */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                }}>
                    {/* Filters and Search */}
                    <div style={{
                        padding: '16px 24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['all', 'approved', 'pending', 'incomplete', 'rejected', 'suspended'].map((status) => {
                                const statusCounts = {
                                    all: employees.length,
                                    approved: employees.filter(e => e.status === 'approved').length,
                                    pending: pendingEmployees.length,
                                    incomplete: employees.filter(e => e.status === 'incomplete').length,
                                    rejected: employees.filter(e => e.status === 'rejected').length,
                                    suspended: employees.filter(e => e.status === 'suspended').length
                                };
                                const count = statusCounts[status as keyof typeof statusCounts] || 0;
                                const isPending = status === 'pending';
                                const isRejected = status === 'rejected';
                                const isSuspended = status === 'suspended';
                                const isActive = filter === status;

                                // Determine colors based on status
                                let bgColor = isActive ? '#1E3A5F' : '#F3F4F6';
                                let textColor = isActive ? '#FFFFFF' : '#4B5563';
                                let badgeBg = 'rgba(255,255,255,0.2)';

                                if (isPending && count > 0) {
                                    bgColor = isActive ? '#EA580C' : '#FFF7ED';
                                    textColor = isActive ? '#FFFFFF' : '#EA580C';
                                    badgeBg = isActive ? 'rgba(255,255,255,0.25)' : '#FDBA74';
                                } else if (isRejected && count > 0) {
                                    bgColor = isActive ? '#DC2626' : '#FEF2F2';
                                    textColor = isActive ? '#FFFFFF' : '#DC2626';
                                    badgeBg = isActive ? 'rgba(255,255,255,0.25)' : '#FECACA';
                                } else if (isSuspended && count > 0) {
                                    bgColor = isActive ? '#6B7280' : '#F9FAFB';
                                    textColor = isActive ? '#FFFFFF' : '#6B7280';
                                    badgeBg = isActive ? 'rgba(255,255,255,0.25)' : '#E5E7EB';
                                }

                                const label = status === 'all' ? 'All' :
                                    status === 'approved' ? 'Approved' :
                                        status === 'pending' ? 'Pending' :
                                            status === 'rejected' ? 'Rejected' :
                                                status === 'suspended' ? 'Suspended' : 'Incomplete';

                                return (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            backgroundColor: bgColor,
                                            color: textColor,
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: isActive ? '0 4px 12px rgba(30, 58, 95, 0.25)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {label}
                                        {(isPending || isRejected || isSuspended) && count > 0 && (
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                backgroundColor: badgeBg,
                                                color: isActive ? 'white' : textColor
                                            }}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Search style={{
                                position: 'absolute',
                                left: '14px',
                                width: '18px',
                                height: '18px',
                                color: '#9CA3AF',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '280px',
                                    height: '44px',
                                    paddingLeft: '46px',
                                    paddingRight: '16px',
                                    fontSize: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#F9FAFB',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#1E3A5F';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#E5E7EB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Employees Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={loadEmployees}>Retry</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                <thead style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                                    <tr>
                                        <th style={{ width: '30%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th style={{ width: '25%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th style={{ width: '15%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th style={{ width: '30%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No employees found</p>
                                                <p className="text-gray-400 text-sm mt-1">Click "Add Employee" to create one</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A5F] to-[#3E5A8F] rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                                                            {emp.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{emp.full_name || 'Unknown'}</p>
                                                            <p className="text-sm text-gray-500">{emp.nationality || 'Not provided'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                            {emp.user_email}
                                                        </p>
                                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                            {emp.phone_number || '0000000000'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors[emp.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'approved' ? 'bg-green-500' :
                                                            emp.status === 'pending' ? 'bg-yellow-500' :
                                                                emp.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'
                                                            }`}></span>
                                                        {emp.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 14px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#4B5563',
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #E5E7EB',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Eye style={{ width: '14px', height: '14px' }} />
                                                            View
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                setExtractEmployee(emp);
                                                                setShowExtractModal(true);
                                                                setLoadingDocs(true);
                                                                try {
                                                                    const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/profiles/${emp.id}/available_documents/`, {
                                                                    });
                                                                    if (response.ok) {
                                                                        const docs = await response.json();
                                                                        setAvailableDocuments(docs);
                                                                        setSelectedDocuments(docs.filter((d: any) => d.available).map((d: any) => d.key));
                                                                    }
                                                                } catch (e) {
                                                                    console.error('Failed to load documents', e);
                                                                } finally {
                                                                    setLoadingDocs(false);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 14px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#1E3A5F',
                                                                backgroundColor: '#EFF6FF',
                                                                border: '1px solid #BFDBFE',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Download style={{ width: '14px', height: '14px' }} />
                                                            Extract
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(emp)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '8px 14px',
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#DC2626',
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #FECACA',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create Employee Modal */}
                {showCreateModal && <CreateEmployeeModal vm={vm} />}

                {/* Share Credentials Modal */}
                {showShareModal && createdEmployee && <ShareCredentialsModal vm={vm} />}

                {/* View Employee Modal */}
                {showViewModal && selectedEmployee && <ViewEmployeeModal vm={vm} />}

                {/* Edit Employee Modal */}
                {showEditModal && selectedEmployee && <EditEmployeeModal vm={vm} />}

                {/* Extract Documents Modal */}
                {showExtractModal && extractEmployee && <ExtractDocumentsModal vm={vm} />}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && selectedEmployee && <DeleteEmployeeModal vm={vm} />}
            </div>
        </DashboardLayout>
    );
}
