/**
 * Contract terms, rate history and agency transfers.
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

export function ContractTab({ vm }: { vm: ViewModel }) {
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Loading State */}
                            {contractDataLoading && (
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    border: '1px solid #E5E7EB',
                                    padding: '60px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        border: '4px solid #E5E7EB',
                                        borderTop: '4px solid #3B82F6',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                                        {t('Loading contract data...')}
                                    </p>
                                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                </div>
                            )}

                            {/* Error State */}
                            {contractDataError && !contractDataLoading && (
                                <div style={{
                                    backgroundColor: '#FEF2F2',
                                    borderRadius: '16px',
                                    border: '2px solid #FCA5A5',
                                    padding: '40px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '16px'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: '#FEE2E2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <AlertTriangle size={24} color="#DC2626" />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#991B1B', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                                            {t('Failed to load contract data')}
                                        </p>
                                        <p style={{ color: '#DC2626', fontSize: '14px', margin: '8px 0 0' }}>
                                            {contractDataError}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => loadContractTypesAndAgencies()}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            backgroundColor: '#DC2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Clock size={16} /> {t('Retry')}
                                    </button>
                                </div>
                            )}

                            {/* Content - only show when loaded and no error */}
                            {!contractDataLoading && !contractDataError && (
                                <>
                                    {/* Contract Type Card */}
                                    <div style={{
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            borderBottom: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: '#DBEAFE',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <FileText size={20} color="#2563EB" />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                                    {t('Contract Type')}
                                                </h2>
                                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                                    {t('Select the employment contract type')}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            <div style={{ marginBottom: '20px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                    Contract Type *
                                                </label>
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.contract_type_id || ''}
                                                        onChange={e => setEditForm({ ...editForm, contract_type_id: e.target.value ? parseInt(e.target.value) : null })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            fontSize: '15px',
                                                            lineHeight: '1.5',
                                                            border: '2px solid #E5E7EB',
                                                            borderRadius: '12px',
                                                            backgroundColor: '#F9FAFB',
                                                            color: '#1F2937',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                            height: '48px'
                                                        }}
                                                    >
                                                        <option value="">{t('Select contract type...')}</option>
                                                        {contractTypes.map(ct => (
                                                            <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div style={{
                                                        padding: '14px 16px',
                                                        backgroundColor: '#F9FAFB',
                                                        borderRadius: '12px',
                                                        border: '1px solid #E5E7EB'
                                                    }}>
                                                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                                                            {contractTypes.find(ct => ct.id === editForm.contract_type_id)?.name || (
                                                                <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{t('Not set')}</span>
                                                            )}
                                                        </span>
                                                        {contractTypes.find(ct => ct.id === editForm.contract_type_id)?.code && (
                                                            <span style={{
                                                                marginLeft: '8px',
                                                                padding: '2px 8px',
                                                                backgroundColor: '#E0E7FF',
                                                                color: '#4338CA',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                borderRadius: '4px'
                                                            }}>
                                                                {contractTypes.find(ct => ct.id === editForm.contract_type_id)?.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Show selected contract type requirements */}
                                            {editForm.contract_type_id && contractTypes.find(ct => ct.id === Number(editForm.contract_type_id)) && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {contractTypes.find(ct => ct.id === Number(editForm.contract_type_id))?.requires_end_date && (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            backgroundColor: '#FEF3C7',
                                                            color: '#92400E',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            borderRadius: '8px'
                                                        }}>
                                                            <Calendar size={14} /> {t('End Date Required')}
                                                        </span>
                                                    )}
                                                    {contractTypes.find(ct => ct.id === Number(editForm.contract_type_id))?.requires_agency && (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            backgroundColor: '#F3E8FF',
                                                            color: '#7C3AED',
                                                            fontSize: '12px',
                                                            fontWeight: 500,
                                                            borderRadius: '8px'
                                                        }}>
                                                            <Building2 size={14} /> {t('Agency Required')}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Agency Card - Always visible for agency assignment */}
                                    {(
                                        <div style={{
                                            backgroundColor: 'white',
                                            borderRadius: '16px',
                                            border: '2px solid #DDD6FE',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                padding: '20px 24px',
                                                borderBottom: '1px solid #DDD6FE',
                                                backgroundColor: '#FAF5FF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#DDD6FE',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Building2 size={20} color="#7C3AED" />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#5B21B6', margin: 0 }}>
                                                        {t('Agency Assignment')}
                                                    </h2>
                                                    <p style={{ fontSize: '13px', color: '#7C3AED', margin: 0 }}>
                                                        {t('Required for Uitzendkracht contracts')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div style={{ padding: '24px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    {/* Agency Select */}
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7C3AED', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                            Agency *
                                                        </label>
                                                        {isEditing ? (
                                                            <select
                                                                value={editForm.current_agency_id || ''}
                                                                onChange={e => setEditForm({ ...editForm, current_agency_id: e.target.value ? parseInt(e.target.value) : null })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 16px',
                                                                    fontSize: '15px',
                                                                    lineHeight: '1.5',
                                                                    border: '2px solid #DDD6FE',
                                                                    borderRadius: '12px',
                                                                    backgroundColor: '#FAF5FF',
                                                                    color: '#5B21B6',
                                                                    outline: 'none',
                                                                    cursor: 'pointer',
                                                                    height: '48px'
                                                                }}
                                                            >
                                                                <option value="">{t('Select agency...')}</option>
                                                                {agencies.map(ag => (
                                                                    <option key={ag.id} value={ag.id}>{ag.name} ({ag.code})</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <div style={{
                                                                padding: '14px 16px',
                                                                backgroundColor: '#FAF5FF',
                                                                borderRadius: '12px',
                                                                border: '1px solid #DDD6FE'
                                                            }}>
                                                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#5B21B6' }}>
                                                                    {agencies.find(ag => ag.id === editForm.current_agency_id)?.name || (
                                                                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{t('Not set')}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contract Dates Card */}
                                    <div style={{
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            borderBottom: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: '#D1FAE5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Calendar size={20} color="#059669" />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                                    {t('Contract Period')}
                                                </h2>
                                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                                    {t('Start and end dates of the contract')}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                        {t('Start Date')}
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            type="date"
                                                            value={editForm.contract_start_date || ''}
                                                            onChange={e => setEditForm({ ...editForm, contract_start_date: e.target.value })}
                                                            style={{
                                                                width: '100%',
                                                                padding: '14px 16px',
                                                                fontSize: '15px',
                                                                border: '2px solid #E5E7EB',
                                                                borderRadius: '12px',
                                                                backgroundColor: '#F9FAFB',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            padding: '14px 16px',
                                                            backgroundColor: '#F9FAFB',
                                                            borderRadius: '12px',
                                                            border: '1px solid #E5E7EB'
                                                        }}>
                                                            <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                                                                {editForm.contract_start_date || (
                                                                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{t('Not set')}</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                        End Date {contractTypes.find(ct => ct.id === Number(editForm.contract_type_id))?.requires_end_date && (
                                                            <span style={{ color: '#DC2626' }}>*</span>
                                                        )}
                                                    </label>
                                                    {isEditing ? (
                                                        <input
                                                            type="date"
                                                            value={editForm.contract_end_date || ''}
                                                            onChange={e => setEditForm({ ...editForm, contract_end_date: e.target.value })}
                                                            style={{
                                                                width: '100%',
                                                                padding: '14px 16px',
                                                                fontSize: '15px',
                                                                border: `2px solid ${contractTypes.find(ct => ct.id === Number(editForm.contract_type_id))?.requires_end_date ? '#FCA5A5' : '#E5E7EB'}`,
                                                                borderRadius: '12px',
                                                                backgroundColor: '#F9FAFB',
                                                                outline: 'none'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            padding: '14px 16px',
                                                            backgroundColor: '#F9FAFB',
                                                            borderRadius: '12px',
                                                            border: '1px solid #E5E7EB'
                                                        }}>
                                                            <span style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>
                                                                {editForm.contract_end_date || (
                                                                    <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{t('Not set (Indefinite)')}</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contract History Card */}
                                    <div style={{
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            borderBottom: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: '#DBEAFE',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <FileText size={20} color="#3B82F6" />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                                    {t('Contract History')}
                                                </h2>
                                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                                    {t('All historical contracts for this employee')}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            {contractHistory.length > 0 ? (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                                                            <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Rate')}</th>
                                                            <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('From')}</th>
                                                            <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('To')}</th>
                                                            <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Uploaded By')}</th>
                                                            <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Document')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {contractHistory.map((contract) => (
                                                            <tr key={contract.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <td style={{ padding: '12px 8px', color: '#111827', fontWeight: 500 }}>
                                                                    €{contract.hourly_rate}
                                                                </td>
                                                                <td style={{ padding: '12px 8px', color: '#374151' }}>
                                                                    {new Date(contract.effective_from).toLocaleDateString()}
                                                                </td>
                                                                <td style={{ padding: '12px 8px', color: '#374151' }}>
                                                                    {contract.effective_to
                                                                        ? new Date(contract.effective_to).toLocaleDateString()
                                                                        : <span style={{ color: '#059669', fontWeight: 500, backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{t('Current')}</span>
                                                                    }
                                                                </td>
                                                                <td style={{ padding: '12px 8px', color: '#6B7280' }}>
                                                                    {contract.uploaded_by_name || '-'}
                                                                </td>
                                                                <td style={{ padding: '12px 8px' }}>
                                                                    {contract.contract_document_url && (
                                                                        <a
                                                                            href={contract.contract_document_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                                color: '#3B82F6',
                                                                                textDecoration: 'none',
                                                                                fontSize: '13px',
                                                                                fontWeight: 500
                                                                            }}
                                                                        >
                                                                            <Eye size={14} />
                                                                            {t('View')}
                                                                        </a>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>
                                                    <FileText size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                                    <p>{t('No contract history available')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contract Document Card */}
                                    <div style={{
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            borderBottom: '1px solid #E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: '#FEF3C7',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Upload size={20} color="#D97706" />
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                                    {t('Contract Document')}
                                                </h2>
                                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                                    {t('Upload signed contract PDF')}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ padding: '24px' }}>
                                            <div style={{ maxWidth: '300px' }}>
                                                <DocSlot
                                                    title="Contract"
                                                    url={employee.contract_document_url}
                                                    field="contract_document"
                                                    accept=".pdf,.doc,.docx"
                                                    type="pdf"
                                                    editing={isEditing}
                                                    uploading={uploadingFile === 'contract_document'}
                                                    onUpload={handleFileUpload}
                                                    onDelete={handleDeleteFile}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    
    );
}
