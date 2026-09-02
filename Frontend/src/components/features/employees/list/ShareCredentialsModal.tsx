/**
 * Sharing the new credentials.
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

export function ShareCredentialsModal({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    // The page renders this only when there is one; guarding here keeps the
    // component independently safe and restores the narrowing.
    if (!createdEmployee) return null;

    return (

                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowShareModal(false)} />
                        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
                            {/* Success Icon */}
                            <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircle style={{ width: '32px', height: '32px', color: '#16A34A' }} />
                            </div>

                            {/* Title */}
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Employee Created!</h3>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                Share these credentials with <strong>{createdEmployee.name}</strong>
                            </p>

                            {/* Credentials Card */}
                            <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '20px', border: '1px solid #E5E7EB', marginBottom: '24px', textAlign: 'left' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>{createdEmployee.email}</p>
                                </div>
                                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginTop: '4px', fontFamily: 'monospace', letterSpacing: '1px' }}>{createdEmployee.password}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={copyCredentials}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        color: copied ? '#16A34A' : '#374151'
                                    }}
                                >
                                    {copied ? (
                                        <><CheckCircle style={{ width: '18px', height: '18px' }} /> Copied to Clipboard!</>
                                    ) : (
                                        <><Copy style={{ width: '18px', height: '18px' }} /> Copy Credentials</>
                                    )}
                                </button>
                                <button
                                    onClick={shareWhatsApp}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        backgroundColor: '#25D366',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <MessageCircle style={{ width: '18px', height: '18px' }} /> Share via WhatsApp
                                </button>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#6B7280',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                
    );
}
