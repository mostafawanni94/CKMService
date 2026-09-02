/**
 * VCA and other certificates, with expiry.
 *
 * Extracted from the employee detail page, which had grown to 2,799 lines with
 * every tab inline. The JSX is unchanged; it reads the same view-model the page
 * does.
 */
'use client';

import React from 'react';

import { Button } from '@/components/ui';
import {
    Building2, ArrowLeft, User, Mail, Phone, CreditCard, FileText, Shield, Car, Edit,
    Check, X, Save, ExternalLink, AlertTriangle, Clock, Briefcase, Lock,
    CheckCircle, XCircle, Upload, Trash2, Eye, Calendar, ChevronDown, Award, Plus,
    Image as ImageIcon, Search,
} from 'lucide-react';
import {
    Card, Field, TimelineRow, DocSlot,
    LICENSE_CATEGORIES, COUNTRIES, NATIONALITIES, DOCUMENT_TYPES,
} from '@/components/features/employees/EmployeeHelpers';

import type { useEmployeeDetail } from '@/hooks/useEmployeeDetail';
import { useLanguage } from '@/lib/i18n';

type ViewModel = ReturnType<typeof useEmployeeDetail>;

export function CertificatesTab({ vm }: { vm: ViewModel }) {
    const { t } = useLanguage();
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

    // The page guards this before rendering a tab; guarding here too keeps the
    // component independently safe and restores the narrowing the page had.
    if (!employee) return null;

    return (

                        <div style={{ maxWidth: '800px' }}>
                            <div style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                border: '1px solid #E5E7EB',
                                overflow: 'hidden',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    padding: '20px 24px',
                                    borderBottom: '1px solid #E5E7EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                        Employee Certificates
                                    </h2>
                                    <button
                                        onClick={() => setShowAddCertificateModal(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            backgroundColor: '#3B82F6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={16} />
                                        {t('Add Certificate')}
                                    </button>
                                </div>

                                <div style={{ padding: '24px' }}>
                                    {certificatesLoading ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <p className="text-gray-500">Loading certificates...</p>
                                        </div>
                                    ) : employeeCertificates.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                            <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                            <p style={{ fontSize: '16px', fontWeight: 500 }}>No certificates found</p>
                                            <p style={{ fontSize: '14px' }}>Click "Add Certificate" to upload one</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            {employeeCertificates.map((cert) => (
                                                <div key={cert.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '16px',
                                                    backgroundColor: '#F9FAFB',
                                                    borderRadius: '12px',
                                                    border: '1px solid #E5E7EB'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '8px',
                                                            backgroundColor: '#DBEAFE',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Award size={20} color="#2563EB" />
                                                        </div>
                                                        <div>
                                                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: '0 0 4px 0' }}>
                                                                {cert.certificate_type_name}
                                                            </h3>
                                                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280' }}>
                                                                {cert.diploma_number && (
                                                                    <span>#{cert.diploma_number}</span>
                                                                )}
                                                                {cert.expiry_date && (
                                                                    <span style={{ color: cert.is_expired ? '#DC2626' : '#6B7280' }}>
                                                                        Expires: {cert.expiry_date}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <button
                                                            onClick={() => { setSelectedCertificate(cert); setShowViewCertificateModal(true); }}
                                                            style={{
                                                                padding: '8px',
                                                                color: '#6B7280',
                                                                borderRadius: '8px',
                                                                border: '1px solid #E5E7EB',
                                                                backgroundColor: 'white',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCertificate(cert.id)}
                                                            style={{
                                                                padding: '8px',
                                                                color: '#DC2626',
                                                                borderRadius: '8px',
                                                                border: '1px solid #FCA5A5',
                                                                backgroundColor: '#FEF2F2',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    
    );
}
