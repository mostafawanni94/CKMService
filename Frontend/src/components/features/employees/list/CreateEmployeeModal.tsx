/**
 * Creating an employee and issuing credentials.
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

export function CreateEmployeeModal({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        statusColors, availableDocuments, copied, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    } = vm;

    return (

                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}>
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                            onClick={() => setShowCreateModal(false)}
                        />
                        <div style={{
                            position: 'relative',
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            width: '100%',
                            maxWidth: '520px',
                            overflow: 'hidden'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5A8F 100%)',
                                padding: '28px 32px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div>
                                        <h2 style={{
                                            fontSize: '22px',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            margin: 0
                                        }}>Add New Employee</h2>
                                        <p style={{
                                            color: 'rgba(255,255,255,0.7)',
                                            fontSize: '14px',
                                            marginTop: '6px'
                                        }}>Create a new employee account</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'rgba(255,255,255,0.1)',
                                            cursor: 'pointer',
                                            display: 'flex'
                                        }}
                                    >
                                        <X style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '32px' }}>
                                {createError && (
                                    <div style={{
                                        marginBottom: '24px',
                                        padding: '16px',
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px'
                                    }}>
                                        <AlertCircle style={{ width: '20px', height: '20px', color: '#ef4444', flexShrink: 0 }} />
                                        <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>{createError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleCreateEmployee}>
                                    {/* Name Section */}
                                    <div style={{ marginBottom: '28px' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: '12px'
                                        }}>
                                            Full Name
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <input
                                                value={createForm.first_name}
                                                onChange={(e) => setCreateForm(f => ({ ...f, first_name: e.target.value }))}
                                                required
                                                placeholder={t('First name')}
                                                style={{
                                                    width: '100%',
                                                    height: '52px',
                                                    padding: '0 18px',
                                                    fontSize: '15px',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <input
                                                value={createForm.last_name}
                                                onChange={(e) => setCreateForm(f => ({ ...f, last_name: e.target.value }))}
                                                required
                                                placeholder={t('Last name')}
                                                style={{
                                                    width: '100%',
                                                    height: '52px',
                                                    padding: '0 18px',
                                                    fontSize: '15px',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Email Section */}
                                    <div style={{ marginBottom: '28px' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: '12px'
                                        }}>
                                            {t('Email Address')}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail style={{
                                                position: 'absolute',
                                                left: '18px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '20px',
                                                height: '20px',
                                                color: '#9ca3af'
                                            }} />
                                            <input
                                                type="email"
                                                value={createForm.email}
                                                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                                required
                                                placeholder="employee@example.com"
                                                style={{
                                                    width: '100%',
                                                    height: '52px',
                                                    padding: '0 18px 0 52px',
                                                    fontSize: '15px',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Section */}
                                    <div style={{ marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <label style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Temporary Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={generatePassword}
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: '#1E3A5F',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Plus style={{ width: '14px', height: '14px' }} />
                                                {t('Generate')}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                            required
                                            placeholder="Min 8 characters"
                                            minLength={8}
                                            style={{
                                                width: '100%',
                                                height: '52px',
                                                padding: '0 18px',
                                                fontSize: '15px',
                                                fontFamily: 'monospace',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '12px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#9ca3af',
                                            marginTop: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            margin: '10px 0 0 0'
                                        }}>
                                            <AlertCircle style={{ width: '14px', height: '14px' }} />
                                            Employee will change password on first login
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '16px',
                                        paddingTop: '20px',
                                        borderTop: '1px solid #f3f4f6'
                                    }}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowCreateModal(false)}
                                            style={{ flex: 1, height: '52px', fontSize: '15px' }}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={creating}
                                            style={{
                                                flex: 1,
                                                height: '52px',
                                                fontSize: '15px',
                                                backgroundColor: '#1E3A5F'
                                            }}
                                        >
                                            {creating ? (
                                                <>
                                                    <div style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        border: '2px solid #ffffff',
                                                        borderTopColor: 'transparent',
                                                        borderRadius: '50%',
                                                        animation: 'spin 1s linear infinite'
                                                    }} />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus style={{ width: '18px', height: '18px' }} />
                                                    Create Employee
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
