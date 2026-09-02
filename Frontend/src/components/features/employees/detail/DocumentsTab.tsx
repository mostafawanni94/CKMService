/**
 * Uploaded identity documents and contracts.
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

export function DocumentsTab({ vm }: { vm: ViewModel }) {
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

                        <div className="space-y-6">
                            <Card title={t('ID Document')} icon={Shield} iconColor="text-indigo-600" iconBg="bg-indigo-50"
                                badge={employee.id_document_front_url || employee.id_document_back_url || employee.id_document_pdf_url ?
                                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Uploaded</span> :
                                    <span className="text-xs font-medium text-amber-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Missing</span>}>
                                <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">{t('Type')}</label>
                                        {isEditing ? (
                                            <select value={editForm.document_type_id || ''} onChange={e => setEditForm({ ...editForm, document_type_id: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm">
                                                <option value="">{t('Select...')}</option>
                                                {DOCUMENT_TYPES.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                                            </select>
                                        ) : <p className="text-sm font-medium">{employee.document_type_name || '—'}</p>}
                                    </div>
                                    <Field label={t('Document Number')} value={editForm.document_number} editing={isEditing} onChange={v => setEditForm({ ...editForm, document_number: v.toUpperCase() })} />
                                    <Field label={t('Issue Date')} value={editForm.document_issue_date} editing={isEditing} type="date" onChange={v => setEditForm({ ...editForm, document_issue_date: v })} />
                                    <Field label={t('Expiry Date')} value={editForm.document_expiry_date} editing={isEditing} type="date" onChange={v => setEditForm({ ...editForm, document_expiry_date: v })} />
                                </div>
                                {/* Upload ID Document Section */}
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Upload ID Document</p>
                                    <p className="text-xs text-gray-400 mb-4">Upload front and back, or a single PDF</p>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <DocSlot title={t('Front Side')} url={employee.id_document_front_url} field="id_document_front" accept="image/*" editing={isEditing} uploading={uploadingFile === 'id_document_front'} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                                        <DocSlot title={t('Back Side')} url={employee.id_document_back_url} field="id_document_back" accept="image/*" editing={isEditing} uploading={uploadingFile === 'id_document_back'} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                                    </div>

                                    {/* OR Divider */}
                                    <div className="flex items-center gap-4 my-5">
                                        <div className="flex-1 border-t border-gray-200"></div>
                                        <span className="text-xs font-medium text-gray-400 uppercase">OR</span>
                                        <div className="flex-1 border-t border-gray-200"></div>
                                    </div>

                                    {/* PDF Upload */}
                                    <div className="max-w-xs">
                                        <DocSlot title="Upload PDF" url={employee.id_document_pdf_url} field="id_document_pdf" accept=".pdf,image/*" type="pdf" editing={isEditing} uploading={uploadingFile === 'id_document_pdf'} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                                    </div>
                                </div>
                            </Card>

                            <Card title={t("Driver's License")} icon={Car} iconColor="text-orange-600" iconBg="bg-orange-50">
                                <div className="mb-4">
                                    {isEditing ? (
                                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                                            <input
                                                type="checkbox"
                                                checked={editForm.has_drivers_license || false}
                                                onChange={e => setEditForm({ ...editForm, has_drivers_license: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer"
                                                style={{ accentColor: '#1E3A5F' }}
                                            />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Has Driver's License</span>
                                        </label>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${employee.has_drivers_license ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {employee.has_drivers_license ? <><CheckCircle className="w-4 h-4" />{t('Yes')}</> : <><XCircle className="w-4 h-4" />{t('No')}</>}
                                        </span>
                                    )}
                                </div>
                                {(employee.has_drivers_license || editForm.has_drivers_license) && (
                                    <>
                                        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                                            <Field label="License Number" value={editForm.drivers_license_number} editing={isEditing} onChange={v => setEditForm({ ...editForm, drivers_license_number: v })} />
                                            <Field label={t('Issue Date')} value={editForm.drivers_license_issue_date} editing={isEditing} type="date" onChange={v => setEditForm({ ...editForm, drivers_license_issue_date: v })} />
                                            <Field label={t('Expiry Date')} value={editForm.drivers_license_expiry_date} editing={isEditing} type="date" onChange={v => setEditForm({ ...editForm, drivers_license_expiry_date: v })} />
                                        </div>
                                        <div className="mb-6 pb-6 border-b">
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-4">License Categories</label>
                                            <div className="grid grid-cols-4 gap-3">
                                                {LICENSE_CATEGORIES.map(cat => {
                                                    const sel = selectedCategories.includes(cat.code);
                                                    return (
                                                        <button key={cat.code} type="button" disabled={!isEditing} onClick={() => isEditing && toggleCategory(cat.code)}
                                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${sel
                                                                ? 'bg-[#1E3A5F] text-white shadow-md'
                                                                : isEditing
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-[#1E3A5F]/10 hover:text-[#1E3A5F]'
                                                                    : 'bg-gray-100 text-gray-400'
                                                                }`}>
                                                            <span className="text-base">{cat.icon}</span>
                                                            <span>{cat.code}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* Upload License Section */}
                                        <div className="mt-2">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Upload License</p>
                                            <p className="text-xs text-gray-400 mb-4">Upload front and back, or a single PDF</p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <DocSlot title={t('Front Side')} url={employee.drivers_license_front_url} field="drivers_license_front" accept="image/*" editing={isEditing} uploading={uploadingFile === 'drivers_license_front'} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                                                <DocSlot title={t('Back Side')} url={employee.drivers_license_back_url} field="drivers_license_back" accept="image/*" editing={isEditing} uploading={uploadingFile === 'drivers_license_back'} onUpload={handleFileUpload} onDelete={handleDeleteFile} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>
                    
    );
}
