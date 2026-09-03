/**
 * A read-only summary of one employee.
 *
 * Extracted from employees's page, which carried
 * every section inline. The JSX is unchanged; it reads the page's view-model.
 */
'use client';

import React from 'react';


import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
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






import type { EmployeesViewModel as ViewModel } from '@/hooks/useEmployees';

export function ViewEmployeeModal({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    // The page renders this only when there is one; guarding here keeps the
    // component independently safe and restores the narrowing.
    if (!selectedEmployee) return null;

    return (

                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
                            {/* Header */}
                            <div className="sticky top-0 z-10 bg-gradient-to-br from-[#1E3A5F] to-[#2E5A8F] p-6 rounded-t-2xl text-white">
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold">
                                        {selectedEmployee.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedEmployee.full_name || 'Unknown'}</h2>
                                        <p className="text-white/70">{selectedEmployee.user_email}</p>
                                        <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${selectedEmployee.status === 'approved' ? 'bg-green-500' :
                                            selectedEmployee.status === 'pending' ? 'bg-yellow-500' :
                                                selectedEmployee.status === 'incomplete' ? 'bg-gray-500' :
                                                    'bg-red-500'
                                            }`}>
                                            {selectedEmployee.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content - Sections */}
                            <div className="p-6 space-y-6">

                                {/* Personal Information */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        {t('Personal Information')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('First Name')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.first_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Last Name')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.last_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Gender')}</p>
                                            <p className="font-semibold text-gray-900 capitalize">{selectedEmployee.gender || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Date of Birth')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.date_of_birth || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Birthplace')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.birthplace || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Nationality')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.nationality || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('BSN')}</p>
                                            <p className="font-semibold text-gray-900 font-mono">{selectedEmployee.bsn || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        {t('Contact Information')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Email')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.user_email || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Phone')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.phone_number || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Address')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.address || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Postcode')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.postcode || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('City')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.city || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Information */}
                                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-100">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        {t('Financial Information')}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('IBAN')}</p>
                                            <p className="font-semibold text-gray-900 font-mono">{selectedEmployee.iban || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Hourly Rate')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.hourly_rate ? `€${selectedEmployee.hourly_rate}` : '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ID Document */}
                                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        {t('ID Document')}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Document Type')}</p>
                                            <p className="font-semibold text-gray-900 capitalize">{selectedEmployee.document_type_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Document Number')}</p>
                                            <p className="font-semibold text-gray-900 font-mono">{selectedEmployee.document_number || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Expiry Date')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.document_expiry_date || '-'}</p>
                                        </div>
                                    </div>
                                    {/* Document Preview */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {selectedEmployee.id_document_front && (
                                            <div className="relative group">
                                                <p className="text-xs text-gray-500 mb-2">{t('Front Side')}</p>
                                                <a href={selectedEmployee.id_document_front} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={selectedEmployee.id_document_front} alt="ID Front" className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-colors cursor-pointer" />
                                                </a>
                                            </div>
                                        )}
                                        {selectedEmployee.id_document_back && (
                                            <div className="relative group">
                                                <p className="text-xs text-gray-500 mb-2">{t('Back Side')}</p>
                                                <a href={selectedEmployee.id_document_back} target="_blank" rel="noopener noreferrer" className="block">
                                                    <img src={selectedEmployee.id_document_back} alt="ID Back" className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-colors cursor-pointer" />
                                                </a>
                                            </div>
                                        )}
                                        {selectedEmployee.id_document_pdf && (
                                            <div className="relative">
                                                <p className="text-xs text-gray-500 mb-2">{t('PDF Document')}</p>
                                                <a href={selectedEmployee.id_document_pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-colors">
                                                    <FileText className="w-8 h-8 text-red-500" />
                                                    <span className="font-medium text-gray-700">{t('View PDF')}</span>
                                                </a>
                                            </div>
                                        )}
                                        {!selectedEmployee.id_document_front && !selectedEmployee.id_document_back && !selectedEmployee.id_document_pdf && (
                                            <p className="text-gray-400 italic col-span-3">{t('No documents uploaded')}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Driver's License */}
                                {selectedEmployee.has_drivers_license && (
                                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-5 border border-orange-100">
                                        <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="text-lg">🚗</span>
                                            {t("Driver's License")}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedEmployee.drivers_license_front && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-2">{t('Front Side')}</p>
                                                    <a href={selectedEmployee.drivers_license_front} target="_blank" rel="noopener noreferrer">
                                                        <img src={selectedEmployee.drivers_license_front} alt="DL Front" className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors cursor-pointer" />
                                                    </a>
                                                </div>
                                            )}
                                            {selectedEmployee.drivers_license_back && (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-2">{t('Back Side')}</p>
                                                    <a href={selectedEmployee.drivers_license_back} target="_blank" rel="noopener noreferrer">
                                                        <img src={selectedEmployee.drivers_license_back} alt="DL Back" className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors cursor-pointer" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Contract Information */}
                                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                                    <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {t('Contract Information')}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Phase')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.contract_phase || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('Start Date')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.contract_start_date || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('End Date')}</p>
                                            <p className="font-semibold text-gray-900">{selectedEmployee.contract_end_date || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    {selectedEmployee.status === 'pending' && (
                                        <>
                                            <Button
                                                onClick={() => {
                                                    handleApprove(selectedEmployee.id);
                                                    setShowViewModal(false);
                                                }}
                                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg"
                                            >
                                                <CheckCircle className="w-5 h-5 mr-2" />
                                                {t('Approve Employee')}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    handleReject(selectedEmployee.id);
                                                    setShowViewModal(false);
                                                }}
                                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg"
                                            >
                                                <AlertCircle className="w-5 h-5 mr-2" />
                                                {t('Reject')}
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        onClick={() => openEditModal(selectedEmployee)}
                                        className="flex-1 bg-gradient-to-r from-[#1E3A5F] to-[#2E5A8F] hover:from-[#2E4A6F] hover:to-[#3E6A9F] text-white font-semibold py-3 rounded-xl shadow-lg"
                                    >
                                        <Edit className="w-5 h-5 mr-2" />
                                        {t('Edit Profile')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowViewModal(false)}
                                        className="flex-1 py-3 rounded-xl font-semibold"
                                    >
                                        {t('Close')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                
    );
}
