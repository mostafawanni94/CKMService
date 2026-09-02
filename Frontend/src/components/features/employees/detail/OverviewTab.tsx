/**
 * Personal details, contact, address and financial information.
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

export function OverviewTab({ vm }: { vm: ViewModel }) {
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title={t('Personal Information')} icon={User} iconColor="text-blue-600" iconBg="bg-blue-50">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={t('First Name')} value={editForm.first_name} editing={isEditing} onChange={v => setEditForm({ ...editForm, first_name: v })} />
                                    <Field label={t('Prefix')} value={editForm.prefix_name} editing={isEditing} onChange={v => setEditForm({ ...editForm, prefix_name: v })} />
                                    <Field label={t('Last Name')} value={editForm.last_name} editing={isEditing} onChange={v => setEditForm({ ...editForm, last_name: v })} />
                                    <Field label={t('Gender')} value={editForm.gender} editing={isEditing} type="select" options={['male', 'female', 'other']} onChange={v => setEditForm({ ...editForm, gender: v })} />
                                    <Field label={t('Date of Birth')} value={editForm.date_of_birth} editing={isEditing} type="date" onChange={v => setEditForm({ ...editForm, date_of_birth: v })} />
                                    <Field label={t('Birthplace')} value={editForm.birthplace} editing={isEditing} onChange={v => setEditForm({ ...editForm, birthplace: v })} />

                                    {/* Custom Searchable Nationality Dropdown */}
                                    {isEditing ? (
                                        <div ref={nationalityDropdownRef} style={{ position: 'relative' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>{t('Nationality')}</label>
                                            <div
                                                onClick={() => setNationalityDropdownOpen(!nationalityDropdownOpen)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: '#F9FAFB',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {editForm.nationality ? (
                                                        <>
                                                            <span style={{ fontSize: '18px' }}>
                                                                {NATIONALITIES.find(n => n.name === editForm.nationality)?.flag || '🌍'}
                                                            </span>
                                                            {editForm.nationality}
                                                        </>
                                                    ) : (
                                                        <span style={{ color: '#9CA3AF' }}>{t('Select nationality...')}</span>
                                                    )}
                                                </span>
                                                <ChevronDown size={16} color="#6B7280" style={{ transform: nationalityDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                            </div>

                                            {nationalityDropdownOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                                    zIndex: 9999
                                                }}>
                                                    {/* Search Input */}
                                                    <div style={{ padding: '10px', borderBottom: '1px solid #E5E7EB' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                                            <input
                                                                type="text"
                                                                value={nationalitySearch}
                                                                onChange={(e) => setNationalitySearch(e.target.value)}
                                                                placeholder={t('Search nationality...')}
                                                                autoFocus
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '10px 12px 10px 36px',
                                                                    border: '1px solid #E5E7EB',
                                                                    borderRadius: '8px',
                                                                    fontSize: '14px',
                                                                    outline: 'none'
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Options List */}
                                                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                                        {NATIONALITIES
                                                            .filter(n => n.name.toLowerCase().includes(nationalitySearch.toLowerCase()))
                                                            .map((nationality) => (
                                                                <div
                                                                    key={nationality.name}
                                                                    onClick={() => {
                                                                        setEditForm({ ...editForm, nationality: nationality.name });
                                                                        setNationalityDropdownOpen(false);
                                                                        setNationalitySearch('');
                                                                    }}
                                                                    style={{
                                                                        padding: '12px 14px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '12px',
                                                                        cursor: 'pointer',
                                                                        backgroundColor: editForm.nationality === nationality.name ? '#EFF6FF' : 'transparent',
                                                                        borderLeft: editForm.nationality === nationality.name ? '3px solid #2563EB' : '3px solid transparent'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (editForm.nationality !== nationality.name) {
                                                                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (editForm.nationality !== nationality.name) {
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '20px' }}>{nationality.flag}</span>
                                                                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: editForm.nationality === nationality.name ? 600 : 400 }}>{nationality.name}</span>
                                                                    {editForm.nationality === nationality.name && (
                                                                        <CheckCircle size={16} color="#2563EB" style={{ marginLeft: 'auto' }} />
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                        {NATIONALITIES.filter(n => n.name.toLowerCase().includes(nationalitySearch.toLowerCase())).length === 0 && (
                                                            <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                                                {t('No nationality found')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '4px 0' }}>
                                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('Nationality')}</p>
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {editForm.nationality ? (
                                                    <>
                                                        <span style={{ fontSize: '16px' }}>{NATIONALITIES.find(n => n.name === editForm.nationality)?.flag || '🌍'}</span>
                                                        {editForm.nationality}
                                                    </>
                                                ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                                            </p>
                                        </div>
                                    )}
                                    <Field
                                        label={t('BSN')}
                                        value={editForm.bsn ? editForm.bsn.replace(/\D/g, '').replace(/(\d{4})(\d{2})(\d{3})/, '$1.$2.$3') : ''}
                                        editing={isEditing}
                                        onChange={v => {
                                            // Remove all non-digits, limit to 9 digits
                                            const digitsOnly = v.replace(/\D/g, '').slice(0, 9);
                                            setEditForm({ ...editForm, bsn: digitsOnly });
                                        }}
                                    />
                                </div>
                            </Card>

                            <Card title={t('Contact Information')} icon={Phone} iconColor="text-green-600" iconBg="bg-green-50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Field label={t('Email')} value={editForm.user?.email || employee.user?.email} editing={isEditing} onChange={v => setEditForm({ ...editForm, user: { ...editForm.user, email: v } as any })} />
                                    </div>
                                    <Field label={t('Phone')} value={editForm.phone_number} editing={isEditing} onChange={v => setEditForm({ ...editForm, phone_number: v })} />
                                    <Field label={t('City')} value={editForm.city} editing={isEditing} onChange={v => setEditForm({ ...editForm, city: v })} />

                                    {/* Street Name with Icon */}
                                    {isEditing ? (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                {t('Street Name')}
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🛣️</span>
                                                <input
                                                    type="text"
                                                    value={editForm.street_name || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, street_name: e.target.value })}
                                                    placeholder="Kerkstraat"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px 12px 40px',
                                                        backgroundColor: '#F9FAFB',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '10px',
                                                        fontSize: '14px',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '4px 0' }}>
                                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('Street Name')}</p>
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px' }}>🛣️</span>
                                                {editForm.street_name || '—'}
                                            </p>
                                        </div>
                                    )}

                                    {/* House Number and Addition Row */}
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {/* House Number */}
                                        {isEditing ? (
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                    {t('House Nr.')}
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🏠</span>
                                                    <input
                                                        type="text"
                                                        value={editForm.house_number || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, house_number: e.target.value })}
                                                        placeholder="123"
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px 12px 40px',
                                                            backgroundColor: '#F9FAFB',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: '10px',
                                                            fontSize: '14px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '4px 0', flex: 1 }}>
                                                <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('House Nr.')}</p>
                                                <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px' }}>🏠</span>
                                                    {editForm.house_number || '—'}
                                                </p>
                                            </div>
                                        )}

                                        {/* House Number Addition */}
                                        {isEditing ? (
                                            <div style={{ width: '80px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                    {t('Add.')}
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>➕</span>
                                                    <input
                                                        type="text"
                                                        value={editForm.house_number_addition || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, house_number_addition: e.target.value.toUpperCase() })}
                                                        placeholder="A"
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 10px 12px 32px',
                                                            backgroundColor: '#F9FAFB',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: '10px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '4px 0', width: '80px' }}>
                                                <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('Add.')}</p>
                                                <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {editForm.house_number_addition && <span style={{ fontSize: '12px' }}>➕</span>}
                                                    {editForm.house_number_addition || ''}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Postcode Input with Lookup */}
                                    {isEditing ? (
                                        <div ref={postcodeDropdownRef} style={{ position: 'relative' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>{t('Postcode')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    value={editForm.postcode || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value.toUpperCase();
                                                        setEditForm({ ...editForm, postcode: value });
                                                        lookupPostcode(value);
                                                    }}
                                                    placeholder="1234AB"
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        paddingRight: postcodeLookupLoading ? '40px' : '16px',
                                                        backgroundColor: '#F9FAFB',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '10px',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        fontFamily: 'monospace'
                                                    }}
                                                />
                                                {postcodeLookupLoading && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        width: '16px',
                                                        height: '16px',
                                                        border: '2px solid #E5E7EB',
                                                        borderTopColor: '#2563EB',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite'
                                                    }} />
                                                )}
                                            </div>

                                            {showPostcodeSuggestions && postcodeSuggestions.length > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '10px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    zIndex: 9999,
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                                                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>🛣️ Select Address</span>
                                                    </div>
                                                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                        {postcodeSuggestions.map((suggestion, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        city: suggestion.city,
                                                                        street_name: suggestion.street || editForm.street_name,
                                                                        // house_number is NOT auto-filled - user must enter it
                                                                    });
                                                                    setShowPostcodeSuggestions(false);
                                                                }}
                                                                style={{
                                                                    padding: '12px 14px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: 'transparent',
                                                                    borderBottom: '1px solid #F3F4F6'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <div style={{
                                                                    width: '36px',
                                                                    height: '36px',
                                                                    borderRadius: '8px',
                                                                    backgroundColor: suggestion.street ? '#DBEAFE' : '#F3F4F6',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '16px'
                                                                }}>
                                                                    {suggestion.street ? '🛣️' : '🏙️'}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    {suggestion.street ? (
                                                                        <>
                                                                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{suggestion.street}</div>
                                                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{suggestion.city}</div>
                                                                        </>
                                                                    ) : (
                                                                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>{suggestion.city}</div>
                                                                    )}
                                                                </div>
                                                                <div style={{
                                                                    padding: '4px 8px',
                                                                    backgroundColor: '#ECFDF5',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    color: '#059669',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {t('Select')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '4px 0' }}>
                                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{t('Postcode')}</p>
                                            <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0, fontFamily: 'monospace' }}>{editForm.postcode || '—'}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <Card title={t('Financial Information')} icon={CreditCard} iconColor="text-amber-600" iconBg="bg-amber-50">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={t('IBAN')} value={editForm.iban} editing={isEditing} onChange={v => setEditForm({ ...editForm, iban: v.toUpperCase().replace(/\s/g, '') })} />
                                    <Field label="Hourly Rate (€)" value={editForm.hourly_rate} editing={isEditing} type="number" onChange={v => setEditForm({ ...editForm, hourly_rate: v })} />
                                </div>

                                {/* Travel Allowance Section */}
                                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Car size={18} color="#6B7280" />
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                            Travel Allowance
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {/* Travel Cost per KM Row */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px 20px',
                                                backgroundColor: editForm.travel_cost_per_km ? 'rgba(124, 58, 237, 0.03)' : '#F9FAFB',
                                                border: `2px solid ${editForm.travel_cost_per_km ? '#7C3AED' : '#E5E7EB'}`,
                                                borderRadius: '12px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {/* Checkbox */}
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({
                                                        ...editForm,
                                                        travel_cost_per_km: editForm.travel_cost_per_km ? null : ''
                                                    })}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        backgroundColor: editForm.travel_cost_per_km ? '#7C3AED' : 'white',
                                                        border: editForm.travel_cost_per_km ? 'none' : '2px solid #D1D5DB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {editForm.travel_cost_per_km !== null && editForm.travel_cost_per_km !== undefined && (
                                                        <Check size={16} color="white" />
                                                    )}
                                                </button>
                                            )}

                                            {/* Icon */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: editForm.travel_cost_per_km ? 'rgba(124, 58, 237, 0.1)' : '#E5E7EB',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Car size={20} color={editForm.travel_cost_per_km ? '#7C3AED' : '#9CA3AF'} />
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: editForm.travel_cost_per_km ? '#1F2937' : '#6B7280',
                                                    margin: 0
                                                }}>
                                                    Travel Cost per KM
                                                </p>
                                                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                                                    Cost per kilometer for travel reimbursement
                                                </p>
                                            </div>

                                            {/* Input or Badge */}
                                            {(editForm.travel_cost_per_km !== null && editForm.travel_cost_per_km !== undefined) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    {isEditing ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={editForm.travel_cost_per_km || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, travel_cost_per_km: e.target.value })}
                                                                style={{
                                                                    width: '70px',
                                                                    padding: '6px 10px',
                                                                    fontSize: '14px',
                                                                    fontWeight: 600,
                                                                    border: '1px solid #E5E7EB',
                                                                    borderRadius: '8px',
                                                                    textAlign: 'right'
                                                                }}
                                                            />
                                                            <span style={{ color: '#6B7280', fontWeight: 500, fontSize: '13px' }}>€/km</span>
                                                        </>
                                                    ) : (
                                                        <div style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#D1FAE5',
                                                            borderRadius: '8px'
                                                        }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                                                                €{parseFloat(editForm.travel_cost_per_km || '0').toFixed(2)}/km
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Travel Hour Percentage Row */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px 20px',
                                                backgroundColor: editForm.travel_hour_percentage ? 'rgba(59, 130, 246, 0.03)' : '#F9FAFB',
                                                border: `2px solid ${editForm.travel_hour_percentage ? '#3B82F6' : '#E5E7EB'}`,
                                                borderRadius: '12px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {/* Checkbox */}
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({
                                                        ...editForm,
                                                        travel_hour_percentage: editForm.travel_hour_percentage ? null : ''
                                                    })}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        backgroundColor: editForm.travel_hour_percentage ? '#3B82F6' : 'white',
                                                        border: editForm.travel_hour_percentage ? 'none' : '2px solid #D1D5DB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {editForm.travel_hour_percentage !== null && editForm.travel_hour_percentage !== undefined && (
                                                        <Check size={16} color="white" />
                                                    )}
                                                </button>
                                            )}

                                            {/* Icon */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: editForm.travel_hour_percentage ? 'rgba(59, 130, 246, 0.1)' : '#E5E7EB',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <Clock size={20} color={editForm.travel_hour_percentage ? '#3B82F6' : '#9CA3AF'} />
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: editForm.travel_hour_percentage ? '#1F2937' : '#6B7280',
                                                    margin: 0
                                                }}>
                                                    Travel Hour Percentage
                                                </p>
                                                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>
                                                    Percentage of travel time to compensate
                                                </p>
                                            </div>

                                            {/* Input or Badge */}
                                            {(editForm.travel_hour_percentage !== null && editForm.travel_hour_percentage !== undefined) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    {isEditing ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                value={editForm.travel_hour_percentage || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, travel_hour_percentage: e.target.value })}
                                                                style={{
                                                                    width: '70px',
                                                                    padding: '6px 10px',
                                                                    fontSize: '14px',
                                                                    fontWeight: 600,
                                                                    border: '1px solid #E5E7EB',
                                                                    borderRadius: '8px',
                                                                    textAlign: 'right'
                                                                }}
                                                            />
                                                            <span style={{ color: '#6B7280', fontWeight: 500, fontSize: '13px' }}>%</span>
                                                        </>
                                                    ) : (
                                                        <div style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#D1FAE5',
                                                            borderRadius: '8px'
                                                        }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                                                                {parseFloat(editForm.travel_hour_percentage || '0').toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Permission Flags Section */}
                                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <Check size={18} color="#6B7280" />
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                            Permission Flags
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {/* Can Add Allowances */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px 20px',
                                                backgroundColor: editForm.can_add_allowances ? 'rgba(139, 92, 246, 0.03)' : '#F9FAFB',
                                                border: `2px solid ${editForm.can_add_allowances ? '#8B5CF6' : '#E5E7EB'}`,
                                                borderRadius: '12px'
                                            }}
                                        >
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, can_add_allowances: !editForm.can_add_allowances })}
                                                    style={{
                                                        width: '24px', height: '24px', borderRadius: '6px',
                                                        backgroundColor: editForm.can_add_allowances ? '#8B5CF6' : 'white',
                                                        border: editForm.can_add_allowances ? 'none' : '2px solid #D1D5DB',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    {editForm.can_add_allowances && <Check size={16} color="white" />}
                                                </button>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Can Add Allowances</span>
                                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Allow employee to add Toeslag to work logs</p>
                                            </div>
                                            {!isEditing && (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                                                    backgroundColor: editForm.can_add_allowances ? '#D1FAE5' : '#FEE2E2',
                                                    color: editForm.can_add_allowances ? '#059669' : '#DC2626'
                                                }}>
                                                    {editForm.can_add_allowances ? 'Enabled' : 'Disabled'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Receives Surcharges */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px 20px',
                                                backgroundColor: editForm.receives_surcharges ? 'rgba(245, 158, 11, 0.03)' : '#F9FAFB',
                                                border: `2px solid ${editForm.receives_surcharges ? '#F59E0B' : '#E5E7EB'}`,
                                                borderRadius: '12px'
                                            }}
                                        >
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, receives_surcharges: !editForm.receives_surcharges })}
                                                    style={{
                                                        width: '24px', height: '24px', borderRadius: '6px',
                                                        backgroundColor: editForm.receives_surcharges ? '#F59E0B' : 'white',
                                                        border: editForm.receives_surcharges ? 'none' : '2px solid #D1D5DB',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    {editForm.receives_surcharges && <Check size={16} color="white" />}
                                                </button>
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Receives Surcharges</span>
                                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Receives night/weekend/holiday surcharge payments</p>
                                            </div>
                                            {!isEditing && (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                                                    backgroundColor: editForm.receives_surcharges ? '#D1FAE5' : '#FEE2E2',
                                                    color: editForm.receives_surcharges ? '#059669' : '#DC2626'
                                                }}>
                                                    {editForm.receives_surcharges ? 'Enabled' : 'Disabled'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Rate History Card */}
                            <Card title="Rate History" icon={Clock} iconColor="text-blue-600" iconBg="bg-blue-50">
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('Hourly Rate')}</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('Effective From')}</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('Effective To')}</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Changed By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rateHistory.length > 0 ? (
                                                rateHistory.map((history) => (
                                                    <tr key={history.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>
                                                            €{history.hourly_rate}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#374151' }}>
                                                            {new Date(history.effective_from).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#374151' }}>
                                                            {history.effective_to
                                                                ? new Date(history.effective_to).toLocaleDateString()
                                                                : <span style={{ color: '#059669', fontWeight: 500, backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{t('Current')}</span>
                                                            }
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                                                            {history.changed_by_name || '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>
                                                        No rate history available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card title="Timeline" icon={Clock} iconColor="text-purple-600" iconBg="bg-purple-50">
                                <div className="space-y-3">
                                    <TimelineRow label="Created" date={employee.created_at} />
                                    <TimelineRow label={t('Submitted')} date={employee.submitted_at} />
                                    <TimelineRow label={t('Approved')} date={employee.approved_at} />
                                </div>
                            </Card>
                        </div>
                    
    );
}
