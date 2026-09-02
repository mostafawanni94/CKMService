/**
 * Exporting an employee's documents.
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

export function ExtractDocumentsModal({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    // The page renders this only when there is one; guarding here keeps the
    // component independently safe and restores the narrowing.
    if (!extractEmployee) return null;

    return (

                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowExtractModal(false)} />
                        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%' }}>
                            <button onClick={() => setShowExtractModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                                <X style={{ width: '20px', height: '20px', color: '#6B7280' }} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #1E3A5F 0%, #3E5A8F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '20px', fontWeight: 700 }}>
                                    {extractEmployee.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Extract Documents</h3>
                                    <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>{extractEmployee.full_name}</p>
                                </div>
                            </div>

                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                                Select documents to include in the PDF export. The Werkgeversverklaring will always be included as the first page.
                            </p>

                            {loadingDocs ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
                                </div>
                            ) : (
                                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
                                    {availableDocuments.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>No documents found</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {availableDocuments.map((doc) => (
                                                <label
                                                    key={doc.key}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px 16px',
                                                        borderRadius: '10px',
                                                        border: `1px solid ${doc.available ? '#E5E7EB' : '#F3F4F6'}`,
                                                        backgroundColor: doc.available ? '#FFFFFF' : '#F9FAFB',
                                                        cursor: doc.available ? 'pointer' : 'not-allowed',
                                                        opacity: doc.available ? 1 : 0.5,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDocuments.includes(doc.key)}
                                                        disabled={!doc.available}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedDocuments([...selectedDocuments, doc.key]);
                                                            } else {
                                                                setSelectedDocuments(selectedDocuments.filter(k => k !== doc.key));
                                                            }
                                                        }}
                                                        style={{ width: '18px', height: '18px', accentColor: '#1E3A5F' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 500, color: doc.available ? '#111827' : '#9CA3AF' }}>
                                                            {doc.label}
                                                        </span>
                                                        {!doc.available && (
                                                            <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '8px' }}>(Not uploaded)</span>
                                                        )}
                                                    </div>
                                                    {doc.available && (
                                                        <CheckCircle style={{ width: '16px', height: '16px', color: '#22C55E' }} />
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowExtractModal(false)}
                                    style={{ flex: 1, padding: '14px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setExporting(true);
                                        try {
                                            const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/profiles/${extractEmployee.id}/export_documents/`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ document_types: selectedDocuments })
                                            });
                                            if (response.ok) {
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `werkgeversverklaring_${extractEmployee.full_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                window.URL.revokeObjectURL(url);
                                                setShowExtractModal(false);
                                            } else {
                                                const data = await response.json();
                                                alert(data.error || 'Failed to export PDF');
                                            }
                                        } catch (e) {
                                            console.error('Export failed', e);
                                            alert('Failed to export PDF');
                                        } finally {
                                            setExporting(false);
                                        }
                                    }}
                                    disabled={exporting}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #1E3A5F 0%, #3E5A8F 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: exporting ? 'not-allowed' : 'pointer',
                                        opacity: exporting ? 0.7 : 1
                                    }}
                                >
                                    <Download style={{ width: '16px', height: '16px' }} />
                                    {exporting ? 'Exporting...' : 'Export PDF'}
                                </button>
                            </div>
                        </div>
                    </div>
                
    );
}
