/**
 * Editing an employee profile.
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

export function EditEmployeeModal({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, editLoading, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    // The page renders this only when there is one; guarding here keeps the
    // component independently safe and restores the narrowing.
    if (!selectedEmployee) return null;

    // The full profile is fetched when the modal opens. Showing the form before
    // it arrives would present empty fields that a save would then write back.
    if (editLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="rounded-xl bg-white px-8 py-6 text-gray-600">
                    {t('Loading...')}
                </div>
            </div>
        );
    }

    return (

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2E5A8F] px-8 py-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                                            {selectedEmployee.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{t('Edit Employee Profile')}</h2>
                                            <p className="text-white/70 text-sm mt-1">{selectedEmployee.user_email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
                                <form onSubmit={handleSaveEdit} className="p-8 space-y-6">

                                    {/* Personal Information Section */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Users className="w-5 h-5 text-[#1E3A5F]" />
                                            <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
                                                {t('Personal Information')}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                                <Input
                                                    value={editForm.first_name}
                                                    onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                                                    placeholder="John"
                                                    className="h-11"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Prefix')}</label>
                                                <Input
                                                    value={editForm.prefix_name}
                                                    onChange={(e) => setEditForm(f => ({ ...f, prefix_name: e.target.value }))}
                                                    placeholder="van"
                                                    className="h-11"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                                <Input
                                                    value={editForm.last_name}
                                                    onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                                                    placeholder="Doe"
                                                    className="h-11"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Gender')}</label>
                                                <select
                                                    value={editForm.gender}
                                                    onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">{t('Select gender')}</option>
                                                    <option value="male">{t('Male')}</option>
                                                    <option value="female">{t('Female')}</option>
                                                    <option value="other">{t('Other')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Date of Birth')}</label>
                                                <Input
                                                    type="date"
                                                    value={editForm.date_of_birth}
                                                    onChange={(e) => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))}
                                                    className="h-11"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Birthplace')}</label>
                                                <Input
                                                    value={editForm.birthplace}
                                                    onChange={(e) => setEditForm(f => ({ ...f, birthplace: e.target.value }))}
                                                    placeholder="Amsterdam"
                                                    className="h-11"
                                                />
                                            </div>
                                            <div ref={nationalityDropdownRef} style={{ position: 'relative' }}>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Nationality')}</label>
                                                <div
                                                    onClick={() => setNationalityDropdownOpen(!nationalityDropdownOpen)}
                                                    style={{
                                                        width: '100%',
                                                        height: '44px',
                                                        padding: '0 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#FFFFFF',
                                                        cursor: 'pointer',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {editForm.nationality ? (
                                                            <>
                                                                <span style={{ fontSize: '20px' }}>
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
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        zIndex: 9999
                                                    }}>
                                                        {/* Search Input */}
                                                        <div style={{ padding: '8px', borderBottom: '1px solid #E5E7EB' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                                                <input
                                                                    type="text"
                                                                    value={nationalitySearch}
                                                                    onChange={(e) => setNationalitySearch(e.target.value)}
                                                                    placeholder={t('Search nationality...')}
                                                                    autoFocus
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 10px 8px 32px',
                                                                        border: '1px solid #E5E7EB',
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
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
                                                                            setEditForm(f => ({ ...f, nationality: nationality.name }));
                                                                            setNationalityDropdownOpen(false);
                                                                            setNationalitySearch('');
                                                                        }}
                                                                        style={{
                                                                            padding: '10px 12px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
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
                                                                <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                                                                    {t('No nationality found')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">BSN *</label>
                                                <Input
                                                    value={editForm.bsn}
                                                    onChange={(e) => setEditForm(f => ({ ...f, bsn: e.target.value }))}
                                                    placeholder="123456789"
                                                    className="h-11 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Information Section */}
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Phone className="w-5 h-5 text-[#1E3A5F]" />
                                            <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
                                                {t('Contact Information')}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                                                <Input
                                                    value={editForm.phone_number}
                                                    onChange={(e) => setEditForm(f => ({ ...f, phone_number: e.target.value }))}
                                                    placeholder="+31 6 12345678"
                                                    className="h-11"
                                                />
                                            </div>
                                            <div className="grid grid-cols-[1fr_90px_80px] gap-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Street Name')}</label>
                                                    <Input
                                                        value={editForm.street_name}
                                                        onChange={(e) => setEditForm(f => ({ ...f, street_name: e.target.value }))}
                                                        placeholder="Hoofdstraat"
                                                        className="h-11"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('House Nr.')}</label>
                                                    <Input
                                                        value={editForm.house_number}
                                                        onChange={(e) => setEditForm(f => ({ ...f, house_number: e.target.value }))}
                                                        placeholder="123"
                                                        className="h-11"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Add.')}</label>
                                                    <Input
                                                        value={editForm.house_number_addition}
                                                        onChange={(e) => setEditForm(f => ({ ...f, house_number_addition: e.target.value }))}
                                                        placeholder="A"
                                                        className="h-11"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Postcode')}</label>
                                                <Input
                                                    value={editForm.postcode}
                                                    onChange={(e) => setEditForm(f => ({ ...f, postcode: e.target.value }))}
                                                    placeholder="1234 AB"
                                                    className="h-11"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('City')}</label>
                                                <Input
                                                    value={editForm.city}
                                                    onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                                                    placeholder="Amsterdam"
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Information Section */}
                                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
                                        <div className="flex items-center gap-2 mb-5">
                                            <CreditCard className="w-5 h-5 text-[#1E3A5F]" />
                                            <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
                                                {t('Financial Information')}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">IBAN *</label>
                                                <Input
                                                    value={editForm.iban}
                                                    onChange={(e) => setEditForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                                                    placeholder="NL00BANK0123456789"
                                                    className="h-11 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Hourly Rate (€)')}</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.hourly_rate}
                                                    onChange={(e) => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))}
                                                    placeholder="25.00"
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ID Document Section */}
                                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100">
                                        <div className="flex items-center gap-2 mb-5">
                                            <FileText className="w-5 h-5 text-[#1E3A5F]" />
                                            <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
                                                {t('ID Document')}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Document Type')}</label>
                                                <select
                                                    value={editForm.document_type}
                                                    onChange={(e) => setEditForm(f => ({ ...f, document_type: e.target.value }))}
                                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                >
                                                    <option value="">{t('Select type')}</option>
                                                    <option value="passport">{t('Passport')}</option>
                                                    <option value="id_card">{t('ID Card')}</option>
                                                    <option value="residence_permit">{t('Residence Permit')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Document Number')}</label>
                                                <Input
                                                    value={editForm.document_number}
                                                    onChange={(e) => setEditForm(f => ({ ...f, document_number: e.target.value }))}
                                                    placeholder="NL123456789"
                                                    className="h-11 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Expiry Date')}</label>
                                                <Input
                                                    type="date"
                                                    value={editForm.document_expiry_date}
                                                    onChange={(e) => setEditForm(f => ({ ...f, document_expiry_date: e.target.value }))}
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.has_drivers_license}
                                                    onChange={(e) => setEditForm(f => ({ ...f, has_drivers_license: e.target.checked }))}
                                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Has Driver&apos;s License</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Contract Information Section */}
                                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                                        <div className="flex items-center gap-2 mb-5">
                                            <Calendar className="w-5 h-5 text-[#1E3A5F]" />
                                            <h3 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
                                                {t('Contract Information')}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Contract Phase')}</label>
                                                <select
                                                    value={editForm.contract_phase}
                                                    onChange={(e) => setEditForm(f => ({ ...f, contract_phase: e.target.value }))}
                                                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                                >
                                                    <option value="">{t('Select phase')}</option>
                                                    <option value="A">{t('Phase A')}</option>
                                                    <option value="B">{t('Phase B')}</option>
                                                    <option value="C">{t('Phase C')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('Start Date')}</label>
                                                <Input
                                                    type="date"
                                                    value={editForm.contract_start_date}
                                                    onChange={(e) => setEditForm(f => ({ ...f, contract_start_date: e.target.value }))}
                                                    className="h-11"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('End Date')}</label>
                                                <Input
                                                    type="date"
                                                    value={editForm.contract_end_date}
                                                    onChange={(e) => setEditForm(f => ({ ...f, contract_end_date: e.target.value }))}
                                                    className="h-11"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 h-12 text-base font-semibold rounded-xl"
                                            onClick={() => setShowEditModal(false)}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-[#1E3A5F] to-[#2E5A8F] hover:from-[#2E4A6F] hover:to-[#3E6A9F]"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                                    {t('Saving...')}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    {t('Save Changes')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                
    );
}
