/**
 * Viewing a stored certificate.
 *
 * Extracted from the employee detail page. A modal is a self-contained overlay
 * with its own form state; keeping it inline made the page unreadable.
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

export function ViewCertificateModal({ vm }: { vm: ViewModel }) {
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

    // The page renders this only with a certificate selected; guarding here
    // keeps the component independently safe.
    if (!selectedCertificate) return null;

    return (

                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowViewCertificateModal(false)} />
                            <div style={{
                                position: 'relative',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                maxWidth: '600px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Certificate Details</h3>
                                    <button onClick={() => setShowViewCertificateModal(false)}><X size={20} color="#6B7280" /></button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>{t('Type')}</p>
                                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>{selectedCertificate.certificate_type_name}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>{t('Status')}</p>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            borderRadius: '9999px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            backgroundColor: selectedCertificate.is_expired ? '#FEE2E2' : '#DCFCE7',
                                            color: selectedCertificate.is_expired ? '#991B1B' : '#166534'
                                        }}>
                                            {selectedCertificate.is_expired ? 'Expired' : t('Active')}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>{t('Start Date')}</p>
                                        <p style={{ fontSize: '14px', color: '#1F2937' }}>{selectedCertificate.issue_date || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Expire Date</p>
                                        <p style={{ fontSize: '14px', color: '#1F2937' }}>{selectedCertificate.expiry_date || 'N/A'}</p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Diploma / Certificate Number</p>
                                        <p style={{ fontSize: '14px', color: '#1F2937', fontFamily: 'monospace' }}>{selectedCertificate.diploma_number || 'N/A'}</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>Certificate Document</p>

                                    {selectedCertificate.certificate_file_back ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            {/* Front Side Card */}
                                            <div style={{
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '12px',
                                                backgroundColor: 'white',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    aspectRatio: '1.58/1', // Credit card ratio
                                                    backgroundColor: '#F9FAFB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderBottom: '1px solid #F3F4F6'
                                                }}>
                                                    <img
                                                        src={selectedCertificate.certificate_file}
                                                        alt="Front Side"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t('Front Side')}</span>
                                                    <a
                                                        href={selectedCertificate.certificate_file}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            color: '#374151',
                                                            textDecoration: 'none',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                    >
                                                        {t('View')}
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Back Side Card */}
                                            <div style={{
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '12px',
                                                backgroundColor: 'white',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    aspectRatio: '1.58/1',
                                                    backgroundColor: '#F9FAFB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderBottom: '1px solid #F3F4F6'
                                                }}>
                                                    <img
                                                        src={selectedCertificate.certificate_file_back}
                                                        alt="Back Side"
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{t('Back Side')}</span>
                                                    <a
                                                        href={selectedCertificate.certificate_file_back!}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            color: '#374151',
                                                            textDecoration: 'none',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                    >
                                                        {t('View')}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            backgroundColor: 'white', // Changed to white as per screenshot usually (or keep transparent if card is on grey)
                                            // The user image shows the card inside a modal. 
                                            // Let's stick to the 'card' look.
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#EFF6FF',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <FileText size={24} color="#3B82F6" />
                                                </div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                                        {selectedCertificate.certificate_file.split('/').pop()}
                                                    </p>
                                                    <p style={{ fontSize: '13px', color: '#6B7280' }}>{t('PDF Document')}</p>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedCertificate.certificate_file}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #D1D5DB',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    color: '#374151',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                }}
                                            >
                                                {t('Download')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    
    );
}
