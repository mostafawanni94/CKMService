/**
 * Exporting a customer worklog sheet to Excel.
 *
 * Extracted from invoices's page, which carried
 * every section inline. The JSX is unchanged; it reads the page's view-model.
 */
'use client';

import React from 'react';


import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button, Input } from '@/components/ui';
import { api, Invoice } from '@/lib/api';
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, DollarSign, X, Gift, Coins, Users, User, Briefcase } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useRouter } from 'next/navigation';
import { apiDownload, apiFetch, apiGetAll } from '@/hooks/useApi';








import type { InvoicesViewModel as ViewModel } from '@/hooks/useInvoices';
import { useLanguage } from '@/lib/i18n';

export function ExportInvoiceModal({ vm }: { vm: ViewModel }) {
    const { t } = useLanguage();
    const {
        statusColors, customerSearch, customerSurcharges, customers, employeeSearch, employees, error, exportExcelForCustomer, exportExcelForEmployee, exportPDF, filter, filteredInvoices, generateInvoice, getFilteredHours, invoiceMessage, invoices, loadInvoiceDetail, loadInvoices, loadSupervisors, loading, loadingWorklogs, router, search, selectedCustomer, selectedEmployees, selectedInvoice, selectedSupervisor, setCustomerSearch, setEmployeeSearch, setFilter, setInvoiceMessage, setSearch, setSelectedCustomer, setSelectedEmployees, setSelectedInvoice, setSelectedSupervisor, setShowCustomerDropdown, setShowEmployeeDropdown, setShowExportModal, setShowFilters, setShowSupervisorDropdown, setSupervisorSearch, setSupervisors, setWeekEnd, setWeekStart, setWorklogStatusFilter, setWorklogs, showCustomerDropdown, showEmployeeDropdown, showExportModal, showFilters, showSupervisorDropdown, supervisorSearch, supervisors, weekEnd, weekStart, worklogStatusFilter, worklogs,
    } = vm;

    return (

                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>
                                {t('Export Timesheet')}
                            </h2>
                            <button
                                onClick={() => setShowExportModal(false)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#F3F4F6',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} style={{ color: '#6B7280' }} />
                            </button>
                        </div>

                        {/* Worklogs count indicator */}
                        <div style={{
                            padding: '16px',
                            backgroundColor: loadingWorklogs ? '#FEF3C7' : worklogs.length > 0 ? '#D1FAE5' : '#FEE2E2',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {loadingWorklogs ? (
                                <>
                                    <Clock size={20} style={{ color: '#D97706' }} />
                                    <span style={{ color: '#92400E', fontWeight: 500 }}>{t('Loading worklogs...')}</span>
                                </>
                            ) : worklogs.length > 0 ? (
                                <>
                                    <CheckCircle size={20} style={{ color: '#059669' }} />
                                    <span style={{ color: '#065F46', fontWeight: 500 }}>{worklogs.length} worklogs ready to export</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={20} style={{ color: '#DC2626' }} />
                                    <span style={{ color: '#991B1B', fontWeight: 500 }}>{t('No worklogs found. Please select filters first.')}</span>
                                </>
                            )}
                        </div>

                        {/* Toast Message */}
                        {invoiceMessage && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: invoiceMessage.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                                borderRadius: '12px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border: `1px solid ${invoiceMessage.type === 'success' ? '#10B981' : '#EF4444'}`
                            }}>
                                {invoiceMessage.type === 'success' ? (
                                    <CheckCircle size={20} style={{ color: '#059669' }} />
                                ) : (
                                    <AlertCircle size={20} style={{ color: '#DC2626' }} />
                                )}
                                <span style={{
                                    color: invoiceMessage.type === 'success' ? '#065F46' : '#991B1B',
                                    fontWeight: 500,
                                    flex: 1
                                }}>
                                    {invoiceMessage.text}
                                </span>
                                <button
                                    onClick={() => setInvoiceMessage(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: invoiceMessage.type === 'success' ? '#059669' : '#DC2626'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '24px' }}>
                            {t('Choose the export format based on who will receive the file:')}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Export for HR */}
                            <button
                                onClick={() => exportExcelForCustomer('hr')}
                                disabled={worklogs.length === 0 || loadingWorklogs}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px',
                                    backgroundColor: worklogs.length > 0 ? '#16A34A' : '#E5E7EB',
                                    border: 'none',
                                    borderRadius: '14px',
                                    cursor: worklogs.length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Users size={24} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <p style={{ color: 'white', fontWeight: 600, fontSize: '16px', margin: 0 }}>
                                        {t('Export for HR')}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                        {t('Hours overview with TOTAAL UREN (A-P)')}
                                    </p>
                                </div>
                            </button>

                            {/* Export for Finance */}
                            <button
                                onClick={() => exportExcelForCustomer('finance')}
                                disabled={worklogs.length === 0 || loadingWorklogs}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px',
                                    backgroundColor: worklogs.length > 0 ? '#1E3A5F' : '#E5E7EB',
                                    border: 'none',
                                    borderRadius: '14px',
                                    cursor: worklogs.length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Briefcase size={24} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <p style={{ color: 'white', fontWeight: 600, fontSize: '16px', margin: 0 }}>
                                        {t('Export for Finance')}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                        {t('Full report with surcharges and TOTAAL BEDRAG (A-O, Q-X)')}
                                    </p>
                                </div>
                            </button>

                            {/* Export for Employee */}
                            <button
                                onClick={exportExcelForEmployee}
                                disabled={worklogs.length === 0 || loadingWorklogs}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px',
                                    backgroundColor: worklogs.length > 0 ? '#F9FAFB' : '#E5E7EB',
                                    border: worklogs.length > 0 ? '2px solid #E5E7EB' : 'none',
                                    borderRadius: '14px',
                                    cursor: worklogs.length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: '#EFF6FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <User size={24} style={{ color: '#3B82F6' }} />
                                </div>
                                <div>
                                    <p style={{ color: '#1F2937', fontWeight: 600, fontSize: '16px', margin: 0 }}>
                                        {t('Export for Employee (Simple)')}
                                    </p>
                                    <p style={{ color: '#6B7280', fontSize: '13px', margin: '4px 0 0 0' }}>
                                        {t('Basic hours overview: date, start, end, break, total')}
                                    </p>
                                </div>
                            </button>

                            {/* Divider */}
                            <div style={{
                                borderTop: '1px dashed #E5E7EB',
                                margin: '8px 0',
                                position: 'relative'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'white',
                                    padding: '0 12px',
                                    fontSize: '12px',
                                    color: '#9CA3AF'
                                }}>or</span>
                            </div>

                            {/* Create Invoice Button */}
                            <button
                                onClick={generateInvoice}
                                disabled={worklogs.length === 0 || loadingWorklogs || !selectedCustomer || !weekStart}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px',
                                    backgroundColor: (worklogs.length > 0 && selectedCustomer && weekStart) ? '#7C3AED' : '#E5E7EB',
                                    border: 'none',
                                    borderRadius: '14px',
                                    cursor: (worklogs.length > 0 && selectedCustomer && weekStart) ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FileText size={24} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <p style={{ color: 'white', fontWeight: 600, fontSize: '16px', margin: 0 }}>
                                        {t('Create Invoice')}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                        {t('Generate invoice record from these worklogs')}
                                    </p>
                                </div>
                            </button>
                        </div>

                    </div>
                </div>
            
    );
}
