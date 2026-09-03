'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';
import {
    Building2, ArrowLeft, User, Mail, Phone, CreditCard, FileText, Shield, Car, Edit,
    Check, X, Save, ExternalLink, AlertTriangle, Clock, Briefcase, Lock,
    CheckCircle, XCircle, Upload, Trash2, Eye, Calendar, ChevronDown, Award, Plus, Image as ImageIcon, Search
} from 'lucide-react';
import { useEmployeeDetail } from '@/hooks/useEmployeeDetail';
import { OverviewTab } from '@/components/features/employees/detail/OverviewTab';
import { DocumentsTab } from '@/components/features/employees/detail/DocumentsTab';
import { ContractTab } from '@/components/features/employees/detail/ContractTab';
import { CertificatesTab } from '@/components/features/employees/detail/CertificatesTab';
import { AddCertificateModal } from '@/components/features/employees/detail/AddCertificateModal';
import { ViewCertificateModal } from '@/components/features/employees/detail/ViewCertificateModal';
import type { EmployeeDetail, TabType, CertificateType, EmployeeCertificate, RateHistory, ContractHistory } from '@/hooks/useEmployeeDetail';
import {
    Card, Field, TimelineRow, DocSlot,
    LICENSE_CATEGORIES, COUNTRIES, NATIONALITIES, DOCUMENT_TYPES
} from '@/components/features/employees/EmployeeHelpers';
import { apiFetch } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';




export default function EmployeeDetailPage() {
    const { t } = useLanguage();
    const vm = useEmployeeDetail();

    // Destructure everything from the hook for backwards-compatible JSX
    const {
        params, router, employee, setEmployee, loading, error, noPermission,
        activeTab, setActiveTab, isEditing, setIsEditing, saving,
        editForm, setEditForm, updateEditForm,
        showApproveModal, setShowApproveModal,
        showRejectModal, setShowRejectModal,
        rejectReason, setRejectReason,
        handleApprove, handleReject,
        rateHistory, contractHistory,
        showRateChangeModal, setShowRateChangeModal,
        pendingRateChange, setPendingRateChange,
        newContractFile, setNewContractFile,
        handleRateChangeModalResponse, handleContractFileSelected,
        handleSaveEdit, performSave, cancelEdit,
        selectedCategories, toggleCategory,
        uploadingFile, handleFileUpload, handleDeleteFile,
        contractTypes, agencies,
        contractDataLoading, contractDataLoaded, contractDataError, loadContractTypesAndAgencies,
        showTransferModal, setShowTransferModal,
        transferData, setTransferData,
        employeeCertificates, certificateTypes,
        certificatesLoading, certificatesLoaded,
        showAddCertificateModal, setShowAddCertificateModal,
        showViewCertificateModal, setShowViewCertificateModal,
        selectedCertificate, setSelectedCertificate,
        certificateForm, setCertificateForm,
        certificateFile, setCertificateFile,
        certificateFileBack, setCertificateFileBack,
        uploadMode, setUploadMode,
        savingCertificate,
        handleAddCertificate, handleDeleteCertificate,
        nationalitySearch, setNationalitySearch,
        nationalityDropdownOpen, setNationalityDropdownOpen,
        nationalityDropdownRef,
        postcodeLookupLoading, postcodeSuggestions,
        showPostcodeSuggestions, setShowPostcodeSuggestions,
        postcodeDropdownRef, lookupPostcode
    } = vm;

    // Approval data state (kept local as it's only used in the approve modal)
    const [approvalData, setApprovalData] = useState({ contract_phase: 'phase_a', contract_start_date: '', contract_end_date: '', contract_type_id: '', agency_id: '' });

    const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
        approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
        incomplete: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
        rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
    };

    const tabs = [
        { id: 'overview' as TabType, label: t('Overview'), icon: User },
        { id: 'documents' as TabType, label: t('Documents'), icon: FileText },
        { id: 'contract' as TabType, label: 'Contract', icon: Briefcase },
        { id: 'certificates' as TabType, label: t('Certificates'), icon: Award },
    ];

    if (noPermission) return <DashboardLayout><div className="flex items-center justify-center h-[80vh]"><div className="text-center"><Lock className="w-16 h-16 text-red-500 mx-auto mb-4" /><p className="text-gray-600 mb-4">{t('Access Denied')}</p><Button onClick={() => router.push('/dashboard')} className="bg-[#1E3A5F]">{t('Back')}</Button></div></div></DashboardLayout>;
    if (loading) return <DashboardLayout><div className="flex items-center justify-center h-[80vh]"><div className="w-10 h-10 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div></div></DashboardLayout>;
    if (error || !employee) return <DashboardLayout><div className="flex items-center justify-center h-[80vh]"><div className="text-center"><AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" /><p className="text-gray-500 mb-4">{error || 'Not found'}</p><Button onClick={() => router.push('/dashboard/employees')} className="bg-[#1E3A5F]">{t('Back')}</Button></div></div></DashboardLayout>;

    const status = statusStyles[employee.status] || statusStyles.incomplete;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Top Bar */}
                <div className="bg-white border-b sticky top-0 z-20">
                    <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                        <button onClick={() => router.push('/dashboard/employees')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" /> {t('Back to Employees')}
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 18px',
                                            backgroundColor: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X style={{ width: '16px', height: '16px' }} /> {t('Cancel')}
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 18px',
                                            backgroundColor: '#1E3A5F',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Save style={{ width: '16px', height: '16px' }} /> {saving ? t('Saving...') : t('Save')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 18px',
                                            backgroundColor: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Edit style={{ width: '16px', height: '16px' }} /> {t('Edit')}
                                    </button>
                                    {employee.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => setShowApproveModal(true)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '10px 18px',
                                                    backgroundColor: '#16A34A',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                                                }}
                                            >
                                                <Check style={{ width: '16px', height: '16px' }} /> {t('Approve')}
                                            </button>
                                            <button
                                                onClick={() => setShowRejectModal(true)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '10px 18px',
                                                    backgroundColor: '#DC2626',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                                                }}
                                            >
                                                <X style={{ width: '16px', height: '16px' }} /> {t('Reject')}
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Header */}
                <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5A8F 100%)' }}>
                    <div style={{
                        maxWidth: '1024px',
                        margin: '0 auto',
                        padding: '32px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px'
                    }}>
                        {/* Avatar */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#1E3A5F',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            flexShrink: 0
                        }}>
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </div>

                        {/* Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                color: 'white',
                                margin: 0,
                                letterSpacing: '-0.02em'
                            }}>
                                {employee.full_name || `${employee.first_name} ${employee.prefix_name || ''} ${employee.last_name}`.trim()}
                            </h1>
                            <p style={{
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: '14px',
                                margin: '4px 0 0'
                            }}>
                                {t('Employee Profile')}
                            </p>
                        </div>

                        {/* Status Badge - Clickable dropdown for admin */}
                        <div style={{ position: 'relative' }}>
                            <select
                                value={employee.status}
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                        const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
                                        const response = await apiFetch(`/employees/profiles/${params.id}/`, {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({ status: newStatus })
                                        });
                                        if (!response.ok) throw new Error('Failed to update status');
                                        // Refresh the page data
                                        setEmployee({ ...employee, status: newStatus });
                                    } catch (err) {
                                        alert('Failed to update status');
                                    }
                                }}
                                style={{
                                    appearance: 'none',
                                    padding: '12px 40px 12px 50px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    backgroundColor: employee.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' :
                                        employee.status === 'pending' ? 'rgba(251, 191, 36, 0.15)' :
                                            employee.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.1)',
                                    border: `1px solid ${employee.status === 'approved' ? 'rgba(16, 185, 129, 0.3)' :
                                        employee.status === 'pending' ? 'rgba(251, 191, 36, 0.3)' :
                                            employee.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.2)'}`,
                                    color: employee.status === 'approved' ? '#34D399' :
                                        employee.status === 'pending' ? '#FCD34D' :
                                            employee.status === 'rejected' ? '#F87171' : 'white',
                                    textTransform: 'capitalize',
                                    outline: 'none'
                                }}
                            >
                                <option value="incomplete" style={{ color: '#374151', backgroundColor: 'white' }}>{t('Incomplete')}</option>
                                <option value="pending" style={{ color: '#374151', backgroundColor: 'white' }}>{t('Pending')}</option>
                                <option value="approved" style={{ color: '#374151', backgroundColor: 'white' }}>{t('Approved')}</option>
                                <option value="rejected" style={{ color: '#374151', backgroundColor: 'white' }}>{t('Rejected')}</option>
                                <option value="suspended" style={{ color: '#374151', backgroundColor: 'white' }}>{t('Suspended')}</option>
                            </select>
                            {/* Status Icon */}
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: employee.status === 'approved' ? '#10B981' :
                                    employee.status === 'pending' ? '#FBBF24' :
                                        employee.status === 'rejected' ? '#EF4444' : '#6B7280',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none'
                            }}>
                                {employee.status === 'approved' && <CheckCircle size={16} color="white" />}
                                {employee.status === 'pending' && <Clock size={16} color="white" />}
                                {employee.status === 'rejected' && <X size={16} color="white" />}
                                {(employee.status !== 'approved' && employee.status !== 'pending' && employee.status !== 'rejected') && <AlertTriangle size={16} color="white" />}
                            </div>
                            {/* Dropdown Arrow */}
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none'
                            }}>
                                <ChevronDown size={16} color="rgba(255,255,255,0.6)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #E5E7EB',
                    position: 'sticky',
                    top: '60px',
                    zIndex: 10
                }}>
                    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '16px 24px' }}>
                        <nav style={{
                            display: 'inline-flex',
                            gap: '8px',
                            backgroundColor: '#F3F4F6',
                            padding: '6px',
                            borderRadius: '12px'
                        }}>
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: active ? 'white' : 'transparent',
                                            color: active ? '#1E3A5F' : '#6B7280',
                                            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                                        }}
                                    >
                                        <Icon size={16} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-5xl mx-auto px-6 py-6">
                    {employee.status === 'rejected' && employee.rejection_reason && (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            border: '1px solid #FCA5A5',
                            marginBottom: '24px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px 20px',
                                backgroundColor: '#FEF2F2',
                                borderBottom: '1px solid #FCA5A5'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    backgroundColor: '#FEE2E2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <AlertTriangle style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: 0 }}>{t('Application Rejected')}</h4>
                                    <p style={{ fontSize: '13px', color: '#B91C1C', margin: 0, marginTop: '2px' }}>{t("This employee's application was rejected")}</p>
                                </div>
                            </div>
                            <div style={{ padding: '16px 20px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Rejection Reason')}</label>
                                <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px', lineHeight: '1.6' }}>{employee.rejection_reason}</p>
                            </div>
                        </div>
                    )}

                    {/* OVERVIEW */}
                    {activeTab === 'overview' && <OverviewTab vm={vm} />}

                    {/* DOCUMENTS */}
                    {activeTab === 'documents' && <DocumentsTab vm={vm} />}

                    {/* CONTRACT */}
                    {activeTab === 'contract' && <ContractTab vm={vm} />}

                    {/* Certificates Tab */}
                    {activeTab === 'certificates' && <CertificatesTab vm={vm} />}

                    {/* Add Certificate Modal */}
                    {showAddCertificateModal && <AddCertificateModal vm={vm} />}

                    {/* View Certificate Modal */}
                    {showViewCertificateModal && selectedCertificate && <ViewCertificateModal vm={vm} />}

                    {/* Modals */}
                    {showApproveModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowApproveModal(false)} />
                            <div style={{
                                position: 'relative',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                maxWidth: '420px',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}>
                                {/* Success Icon */}
                                <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <CheckCircle style={{ width: '32px', height: '32px', color: '#16A34A' }} />
                                </div>

                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{t('Approve Employee')}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                    {t('Are you sure you want to approve')} <strong>{employee.first_name} {employee.last_name}</strong>?
                                    This will activate their account.
                                </p>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setShowApproveModal(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {t('Cancel')}
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: '#16A34A',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <CheckCircle style={{ width: '16px', height: '16px' }} /> {t('Approve')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rate Change Contract Modal */}
                    {showRateChangeModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => { setShowRateChangeModal(false); setPendingRateChange(null); }} />
                            <div style={{
                                position: 'relative',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                maxWidth: '480px',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <FileText style={{ width: '32px', height: '32px', color: '#D97706' }} />
                                </div>

                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{t('Rate Change Detected')}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                                    {t("You're changing the hourly rate to")} <strong>€{pendingRateChange}</strong>
                                </p>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                    {t('Do you want to upload a new contract document for this rate change?')}
                                </p>

                                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                    <button
                                        onClick={() => performSave(false)}
                                        disabled={saving}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {t('No, Save Rate Only')}
                                    </button>
                                    <label
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: '#7C3AED',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Upload style={{ width: '16px', height: '16px' }} />
                                        {saving ? t('Uploading...') : 'Yes, Upload Contract'}
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleContractFileSelected(file);
                                            }}
                                        />
                                    </label>
                                </div>

                                <button
                                    onClick={() => { setShowRateChangeModal(false); setPendingRateChange(null); }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '13px',
                                        color: '#9CA3AF',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('Cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                    {showRejectModal && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowRejectModal(false)} />
                            <div style={{
                                position: 'relative',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                maxWidth: '420px',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}>
                                {/* Warning Icon */}
                                <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <AlertTriangle style={{ width: '32px', height: '32px', color: '#DC2626' }} />
                                </div>

                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{t('Reject Employee')}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
                                    {t('Please provide a reason for rejecting')} <strong>{employee.first_name} {employee.last_name}</strong>.
                                </p>

                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder={t('Enter rejection reason (minimum 10 characters)...')}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            backgroundColor: '#F9FAFB',
                                            border: `2px solid ${rejectReason.length > 0 && rejectReason.trim().length < 10 ? '#FCA5A5' : '#E5E7EB'}`,
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            resize: 'none',
                                            height: '120px',
                                            marginBottom: '8px',
                                            textAlign: 'left',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <span style={{
                                            fontSize: '12px',
                                            color: rejectReason.length > 0 && rejectReason.trim().length < 10 ? '#DC2626' : '#9CA3AF'
                                        }}>
                                            {rejectReason.trim().length < 10 ? `Minimum 10 characters required (${rejectReason.trim().length}/10)` : '✓ Minimum met'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                            {rejectReason.trim().length} characters
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {t('Cancel')}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={rejectReason.trim().length < 10}
                                        style={{
                                            flex: 1,
                                            padding: '14px',
                                            backgroundColor: rejectReason.trim().length >= 10 ? '#DC2626' : '#FCA5A5',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: rejectReason.trim().length >= 10 ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X style={{ width: '16px', height: '16px' }} /> {t('Reject')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
