/**
 * Adding a certificate, with front and back images.
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

export function AddCertificateModal({ vm }: { vm: ViewModel }) {
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

    return (

                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAddCertificateModal(false)} />
                            <div style={{
                                position: 'relative',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                maxWidth: '500px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{t('Add Certificate')}</h3>
                                    <button onClick={() => setShowAddCertificateModal(false)}><X size={20} color="#6B7280" /></button>
                                </div>

                                <form onSubmit={handleAddCertificate}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                            Certificate Type *
                                        </label>
                                        <select
                                            value={certificateForm.certificate_type_id}
                                            onChange={e => setCertificateForm({ ...certificateForm, certificate_type_id: e.target.value })}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #D1D5DB',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <option value="">{t('Select a type...')}</option>
                                            {certificateTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                            {t('Diploma / Certificate Number')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={certificateForm.diploma_number}
                                            onChange={e => setCertificateForm({ ...certificateForm, diploma_number: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #D1D5DB',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                                {t('Start Date')} *
                                            </label>
                                            <input
                                                type="date"
                                                value={certificateForm.issue_date}
                                                onChange={e => setCertificateForm({ ...certificateForm, issue_date: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #D1D5DB',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                                {t('Expiry Date')} *
                                            </label>
                                            <input
                                                type="date"
                                                value={certificateForm.expiry_date}
                                                onChange={e => setCertificateForm({ ...certificateForm, expiry_date: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #D1D5DB',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                            {t('Upload Type')}
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#F3F4F6', borderRadius: '8px', marginBottom: '16px' }}>
                                            <button
                                                type="button"
                                                onClick={() => { setUploadMode('pdf'); setCertificateFile(null); setCertificateFileBack(null); }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    backgroundColor: uploadMode === 'pdf' ? 'white' : 'transparent',
                                                    color: uploadMode === 'pdf' ? '#1E3A5F' : '#6B7280',
                                                    boxShadow: uploadMode === 'pdf' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {t('PDF Document')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setUploadMode('images'); setCertificateFile(null); setCertificateFileBack(null); }}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    backgroundColor: uploadMode === 'images' ? 'white' : 'transparent',
                                                    color: uploadMode === 'images' ? '#1E3A5F' : '#6B7280',
                                                    boxShadow: uploadMode === 'images' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {t('Photos (Front & Back)')}
                                            </button>
                                        </div>

                                        {uploadMode === 'pdf' ? (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                                    {t('Certificate PDF')} *
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="file"
                                                        onChange={e => setCertificateFile(e.target.files?.[0] || null)}
                                                        required={uploadMode === 'pdf'}
                                                        accept=".pdf"
                                                        style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                                                    />
                                                    <div style={{
                                                        border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '24px', backgroundColor: '#F9FAFB', textAlign: 'center', transition: 'all 0.2s'
                                                    }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                                            <Upload size={20} color="#3B82F6" />
                                                        </div>
                                                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>{certificateFile ? certificateFile.name : 'Upload PDF Certificate'}</p>
                                                        <p style={{ fontSize: '12px', color: certificateFile ? '#16A34A' : '#9CA3AF', margin: 0 }}>{certificateFile ? 'File selected' : 'PDF (max 10MB)'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                                        {t('Front Side')} *
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="file"
                                                            onChange={e => setCertificateFile(e.target.files?.[0] || null)}
                                                            required={uploadMode === 'images'}
                                                            accept="image/*"
                                                            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                                                        />
                                                        <div style={{
                                                            border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '24px 12px', backgroundColor: '#F9FAFB', textAlign: 'center'
                                                        }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '16px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                                                <ImageIcon size={16} color="#3B82F6" />
                                                            </div>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{certificateFile ? certificateFile.name : 'Front Photo'}</p>
                                                            <p style={{ fontSize: '11px', color: certificateFile ? '#16A34A' : '#9CA3AF' }}>{certificateFile ? t('Selected') : 'JPG/PNG'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                                        {t('Back Side')} *
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="file"
                                                            onChange={e => setCertificateFileBack(e.target.files?.[0] || null)}
                                                            required={uploadMode === 'images'}
                                                            accept="image/*"
                                                            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                                                        />
                                                        <div style={{
                                                            border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '24px 12px', backgroundColor: '#F9FAFB', textAlign: 'center'
                                                        }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '16px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                                                <ImageIcon size={16} color="#3B82F6" />
                                                            </div>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{certificateFileBack ? certificateFileBack.name : 'Back Photo'}</p>
                                                            <p style={{ fontSize: '11px', color: certificateFileBack ? '#16A34A' : '#9CA3AF' }}>{certificateFileBack ? t('Selected') : 'JPG/PNG'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCertificateModal(false)}
                                            style={{
                                                padding: '10px 16px',
                                                backgroundColor: 'white',
                                                border: '1px solid #D1D5DB',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                color: '#374151',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t('Cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                savingCertificate ||
                                                !certificateForm.certificate_type_id ||
                                                !certificateForm.diploma_number ||
                                                !certificateForm.issue_date ||
                                                !certificateForm.expiry_date ||
                                                (uploadMode === 'pdf' && !certificateFile) ||
                                                (uploadMode === 'images' && (!certificateFile || !certificateFileBack))
                                            }
                                            style={{
                                                padding: '10px 16px',
                                                backgroundColor: (
                                                    savingCertificate ||
                                                    !certificateForm.certificate_type_id ||
                                                    !certificateForm.diploma_number ||
                                                    !certificateForm.issue_date ||
                                                    !certificateForm.expiry_date ||
                                                    (uploadMode === 'pdf' && !certificateFile) ||
                                                    (uploadMode === 'images' && (!certificateFile || !certificateFileBack))
                                                ) ? '#9CA3AF' : '#3B82F6',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                cursor: (
                                                    savingCertificate ||
                                                    !certificateForm.certificate_type_id ||
                                                    !certificateForm.diploma_number ||
                                                    !certificateForm.issue_date ||
                                                    !certificateForm.expiry_date ||
                                                    (uploadMode === 'pdf' && !certificateFile) ||
                                                    (uploadMode === 'images' && (!certificateFile || !certificateFileBack))
                                                ) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {savingCertificate ? t('Saving...') : 'Save Certificate'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    
    );
}
