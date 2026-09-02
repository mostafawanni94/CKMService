/**
 * Filtering the worklog view by customer, employee and date.
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

export function InvoiceFilters({ vm }: { vm: ViewModel }) {
    const { t } = useLanguage();
    const {
        statusColors, customerSearch, customerSurcharges, customers, employeeSearch, employees, error, exportExcelForCustomer, exportExcelForEmployee, exportPDF, filter, filteredInvoices, generateInvoice, getFilteredHours, invoiceMessage, invoices, loadInvoiceDetail, loadInvoices, loadSupervisors, loading, loadingWorklogs, router, search, selectedCustomer, selectedEmployees, selectedInvoice, selectedSupervisor, setCustomerSearch, setEmployeeSearch, setFilter, setInvoiceMessage, setSearch, setSelectedCustomer, setSelectedEmployees, setSelectedInvoice, setSelectedSupervisor, setShowCustomerDropdown, setShowEmployeeDropdown, setShowExportModal, setShowFilters, setShowSupervisorDropdown, setSupervisorSearch, setSupervisors, setWeekEnd, setWeekStart, setWorklogStatusFilter, setWorklogs, showCustomerDropdown, showEmployeeDropdown, showExportModal, showFilters, showSupervisorDropdown, supervisorSearch, supervisors, weekEnd, weekStart, worklogStatusFilter, worklogs,
    } = vm;

    return (

                    <div style={{
                        marginTop: '16px',
                        padding: '24px',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            alignItems: 'start'
                        }}>
                            {/* Customer Filter - Searchable */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{t('Customer')}</label>
                                {selectedCustomer ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        backgroundColor: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: '10px'
                                    }}>
                                        <span style={{ flex: 1, fontSize: '14px', color: '#1E40AF', fontWeight: 500 }}>
                                            {customers.find(c => c.id === selectedCustomer)?.company_name}
                                        </span>
                                        <button
                                            onClick={() => { setSelectedCustomer(''); setSupervisors([]); setSelectedSupervisor(''); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: '16px' }}
                                        >✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            placeholder={t('Search customers...')}
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                fontSize: '14px',
                                                borderRadius: '10px',
                                                border: '1px solid #D1D5DB',
                                                backgroundColor: '#FAFAFA',
                                                outline: 'none'
                                            }}
                                        />
                                        {showCustomerDropdown && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                                                    zIndex: 50,
                                                    maxHeight: '200px',
                                                    overflowY: 'auto'
                                                }}
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
                                                {customers
                                                    .filter(c => c.company_name.toLowerCase().includes(customerSearch.toLowerCase()))
                                                    .slice(0, 10)
                                                    .map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(c.id);
                                                                setCustomerSearch('');
                                                                setShowCustomerDropdown(false);
                                                                loadSupervisors(c.id);
                                                            }}
                                                            style={{
                                                                padding: '10px 14px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #F3F4F6',
                                                                fontSize: '14px'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                        >
                                                            {c.company_name}
                                                        </div>
                                                    ))
                                                }
                                                {customers.filter(c => c.company_name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                                    <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '14px' }}>{t('No customers found')}</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Supervisor Filter - Searchable */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                    Supervisor {selectedCustomer && <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(for selected customer)</span>}
                                </label>
                                {selectedSupervisor ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 14px',
                                        backgroundColor: '#D1FAE5',
                                        border: '1px solid #6EE7B7',
                                        borderRadius: '10px'
                                    }}>
                                        <span style={{ flex: 1, fontSize: '14px', color: '#065F46', fontWeight: 500 }}>
                                            {supervisors.find(s => s.id === selectedSupervisor)?.full_name}
                                        </span>
                                        <button
                                            onClick={() => setSelectedSupervisor('')}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: '16px' }}
                                        >✕</button>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            placeholder={selectedCustomer ? "Search supervisors..." : "Select customer first"}
                                            value={supervisorSearch}
                                            onChange={(e) => setSupervisorSearch(e.target.value)}
                                            onFocus={() => selectedCustomer && setShowSupervisorDropdown(true)}
                                            disabled={!selectedCustomer}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                fontSize: '14px',
                                                borderRadius: '10px',
                                                border: '1px solid #D1D5DB',
                                                backgroundColor: selectedCustomer ? '#FAFAFA' : '#F3F4F6',
                                                outline: 'none',
                                                opacity: selectedCustomer ? 1 : 0.6,
                                                cursor: selectedCustomer ? 'text' : 'not-allowed'
                                            }}
                                        />
                                        {showSupervisorDropdown && selectedCustomer && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                                                    zIndex: 50,
                                                    maxHeight: '200px',
                                                    overflowY: 'auto'
                                                }}
                                                onMouseDown={(e) => e.preventDefault()}
                                            >
                                                {supervisors
                                                    .filter(s => s.full_name.toLowerCase().includes(supervisorSearch.toLowerCase()))
                                                    .slice(0, 10)
                                                    .map(s => (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => {
                                                                setSelectedSupervisor(s.id);
                                                                setSupervisorSearch('');
                                                                setShowSupervisorDropdown(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 14px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #F3F4F6',
                                                                fontSize: '14px'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                                        >
                                                            {s.full_name}
                                                        </div>
                                                    ))
                                                }
                                                {supervisors.filter(s => s.full_name.toLowerCase().includes(supervisorSearch.toLowerCase())).length === 0 && (
                                                    <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '14px' }}>{t('No supervisors found')}</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* From Week */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{t('From Week')}</label>
                                <input
                                    type="week"
                                    value={weekStart}
                                    onChange={(e) => setWeekStart(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        fontSize: '14px',
                                        borderRadius: '10px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: '#FAFAFA',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* To Week */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{t('To Week')}</label>
                                <input
                                    type="week"
                                    value={weekEnd}
                                    onChange={(e) => setWeekEnd(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        fontSize: '14px',
                                        borderRadius: '10px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: '#FAFAFA',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Employees Search Section */}
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                    Employees {selectedEmployees.length > 0 ? <span style={{ color: '#3B82F6', fontWeight: 500 }}>({selectedEmployees.length} selected)</span> : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(All)</span>}
                                </label>
                                {selectedEmployees.length > 0 && (
                                    <button
                                        onClick={() => setSelectedEmployees([])}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '12px',
                                            color: '#DC2626',
                                            backgroundColor: '#FEE2E2',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t('Clear All')}
                                    </button>
                                )}
                            </div>

                            {/* Selected employees chips */}
                            {selectedEmployees.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {selectedEmployees.map(empId => {
                                        const emp = employees.find(e => e.id === empId);
                                        return emp ? (
                                            <span key={empId} style={{
                                                fontSize: '12px',
                                                color: '#1E3A5F',
                                                backgroundColor: '#EFF6FF',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: 500,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                {emp.full_name}
                                                <button
                                                    onClick={() => setSelectedEmployees(selectedEmployees.filter(id => id !== empId))}
                                                    style={{ fontSize: '10px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                >✕</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Click to select or type to search employees..."
                                    value={employeeSearch}
                                    onChange={(e) => {
                                        setEmployeeSearch(e.target.value);
                                        setShowEmployeeDropdown(true);
                                    }}
                                    onFocus={() => setShowEmployeeDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        fontSize: '14px',
                                        borderRadius: '10px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: '#FAFAFA',
                                        outline: 'none'
                                    }}
                                />
                                {showEmployeeDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                        zIndex: 100,
                                        marginTop: '4px'
                                    }}>
                                        {(() => {
                                            const filtered = employees.filter(e =>
                                                !selectedEmployees.includes(e.id) &&
                                                (!employeeSearch || e.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                            );
                                            const shown = filtered.slice(0, 10);
                                            const hasMore = filtered.length > 10;

                                            return (
                                                <>
                                                    {shown.map(e => (
                                                        <div
                                                            key={e.id}
                                                            onClick={() => {
                                                                setSelectedEmployees([...selectedEmployees, e.id]);
                                                                setEmployeeSearch('');
                                                            }}
                                                            style={{
                                                                padding: '12px 14px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #F3F4F6',
                                                                fontSize: '14px',
                                                                color: '#1F2937',
                                                                backgroundColor: 'white'
                                                            }}
                                                            onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = '#F3F4F6'}
                                                            onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = 'white'}
                                                        >
                                                            {e.full_name}
                                                        </div>
                                                    ))}
                                                    {hasMore && (
                                                        <div style={{ padding: '10px 14px', color: '#3B82F6', fontSize: '13px', fontWeight: 500, textAlign: 'center', backgroundColor: '#EFF6FF' }}>
                                                            Type to search {filtered.length - 10} more...
                                                        </div>
                                                    )}
                                                    {shown.length === 0 && (
                                                        <div style={{ padding: '12px 14px', color: '#9CA3AF', fontSize: '14px' }}>
                                                            {employees.length === 0 ? 'No employees available' : 'No more employees to add'}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Worklog Status Filter */}
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                    {t('Worklog Status')} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({worklogStatusFilter === 'all' ? 'All' : worklogStatusFilter})</span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {[
                                    { key: 'all', label: 'All', color: '#6B7280' },
                                    { key: 'approved', label: t('Approved'), color: '#059669' },
                                    { key: 'pending', label: t('Pending'), color: '#D97706' },
                                    { key: 'rejected', label: t('Rejected'), color: '#DC2626' },
                                ].map((status) => (
                                    <button
                                        key={status.key}
                                        onClick={() => setWorklogStatusFilter(status.key)}
                                        style={{
                                            padding: '8px 16px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            border: worklogStatusFilter === status.key ? 'none' : '1px solid #D1D5DB',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            backgroundColor: worklogStatusFilter === status.key ? status.color : 'white',
                                            color: worklogStatusFilter === status.key ? 'white' : '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: worklogStatusFilter === status.key ? 'white' : status.color
                                        }} />
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters Button */}
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setSelectedCustomer('');
                                    setSelectedSupervisor('');
                                    setWeekStart('');
                                    setWeekEnd('');
                                    setSelectedEmployees([]);
                                    setSupervisors([]);
                                    setFilter('all');
                                    setWorklogStatusFilter('approved');
                                    setWorklogs([]);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#6B7280',
                                    backgroundColor: 'white',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <X size={16} />
                                {t('Clear Filters')}
                            </button>
                        </div>

                        {/* Analytics Summary Section */}
                        {worklogs.length > 0 && (
                            <div style={{
                                marginTop: '24px',
                                paddingTop: '24px',
                                borderTop: '2px solid #E5E7EB'
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E3A5F', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📊 Analytics Summary
                                    {loadingWorklogs && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>(Loading...)</span>}
                                </h3>

                                {/* Summary Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                    {/* Employees Count - Clickable */}
                                    <div
                                        onClick={() => {
                                            const employeesSection = document.getElementById('employees-list-section');
                                            if (employeesSection) employeesSection.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        style={{
                                            padding: '16px',
                                            backgroundColor: '#EFF6FF',
                                            borderRadius: '12px',
                                            border: '1px solid #BFDBFE',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <p style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{t('Employees')}</p>
                                        <p style={{ fontSize: '28px', fontWeight: 700, color: '#1E40AF', margin: '4px 0 0 0' }}>
                                            {new Set(worklogs.map(w => w.employee_id)).size}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#60A5FA', margin: '4px 0 0 0' }}>Click to see details ↓</p>
                                    </div>

                                    {/* Total Hours */}
                                    <div style={{ padding: '16px', backgroundColor: '#FEF3C7', borderRadius: '12px', border: '1px solid #FCD34D' }}>
                                        <p style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{t('Total Hours')}</p>
                                        <p style={{ fontSize: '28px', fontWeight: 700, color: '#92400E', margin: '4px 0 0 0' }}>
                                            {worklogs.reduce((sum, w) => sum + getFilteredHours(w), 0).toFixed(1)}h
                                        </p>
                                    </div>

                                    {/* Employee Cost (Estimate) */}
                                    <div style={{ padding: '16px', backgroundColor: '#FEE2E2', borderRadius: '12px', border: '1px solid #FECACA' }}>
                                        <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{t('To Pay Employees')}</p>
                                        <p style={{ fontSize: '28px', fontWeight: 700, color: '#991B1B', margin: '4px 0 0 0' }}>
                                            €{worklogs.reduce((sum, w) => {
                                                const hours = getFilteredHours(w);
                                                const rate = parseFloat(w.employee_hourly_rate) || 12; // default rate
                                                return sum + (hours * rate);
                                            }, 0).toFixed(2)}
                                        </p>
                                    </div>

                                    {/* Customer Charge (Estimate) */}
                                    <div style={{ padding: '16px', backgroundColor: '#D1FAE5', borderRadius: '12px', border: '1px solid #6EE7B7' }}>
                                        <p style={{ fontSize: '12px', color: '#059669', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{t('To Charge Customer')}</p>
                                        <p style={{ fontSize: '28px', fontWeight: 700, color: '#065F46', margin: '4px 0 0 0' }}>
                                            €{worklogs.reduce((sum, w) => {
                                                const hours = getFilteredHours(w);
                                                const rate = parseFloat(w.customer_hourly_rate) || parseFloat(w.service_rate) || 25; // default rate
                                                return sum + (hours * rate);
                                            }, 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Employees List - Detailed */}
                                <div id="employees-list-section" style={{ marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                                        👥 Employees ({new Set(worklogs.map(w => w.employee)).size})
                                    </h4>
                                    <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#F3F4F6' }}>
                                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '14%' }}>{t('Employee')}</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '12%' }}>{t('Project')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', width: '12%' }}>{t('Service')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#374151', width: '4%' }}>{t('Day')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#374151', width: '10%' }}>{t('Time')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#374151', width: '6%' }}>{t('Pause')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#374151', width: '7%' }}>{t('Hours')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#374151', width: '10%' }}>{t('Normal Hours')}</th>
                                                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#374151', width: '13%' }}>
                                                        {customerSurcharges.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
                                                                {customerSurcharges.slice(0, 3).map((s, i) => (
                                                                    <span key={i}>{s.name}</span>
                                                                ))}
                                                                {customerSurcharges.length > 3 && <span>+{customerSurcharges.length - 3} more</span>}
                                                            </div>
                                                        ) : 'Added Value'}
                                                    </th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#374151', width: '11%' }}>{t('To Charge')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {worklogs.map((worklog, idx) => {
                                                    const hours = parseFloat(worklog.calculated_hours) || 0;
                                                    const baseRate = worklog.surcharges_breakdown?.base_rate || 0;
                                                    const surchargeAmount = worklog.surcharges_breakdown?.total_surcharge_amount || 0;
                                                    const allowancesAmount = worklog.surcharges_breakdown?.total_allowances_amount || 0;
                                                    const totalCharge = (hours * baseRate) + surchargeAmount + allowancesAmount;

                                                    // Get surcharge breakdown by type - use API data directly
                                                    const hoursBreakdown = worklog.hours_breakdown || {};
                                                    const surchargesBreakdown = worklog.surcharges_breakdown?.breakdown || worklog.hours_breakdown?.surcharges || [];
                                                    const surchargeBreakdown: Record<string, { hours: number; amount: number }> = {};

                                                    // Use surcharges from API directly
                                                    if (Array.isArray(surchargesBreakdown)) {
                                                        surchargesBreakdown.forEach((s: any) => {
                                                            const name = s.name || s.category || 'surcharge';
                                                            surchargeBreakdown[name] = {
                                                                hours: s.hours || 0,
                                                                amount: s.amount || 0
                                                            };
                                                        });
                                                    }

                                                    // Calculate break minutes
                                                    let breakMinutes = 0;
                                                    if (worklog.breaks && Array.isArray(worklog.breaks)) {
                                                        breakMinutes = worklog.breaks.reduce((total: number, brk: any) => {
                                                            if (brk.start && brk.end) {
                                                                const [startH, startM] = brk.start.split(':').map(Number);
                                                                const [endH, endM] = brk.end.split(':').map(Number);
                                                                return total + ((endH * 60 + endM) - (startH * 60 + startM));
                                                            }
                                                            return total;
                                                        }, 0);
                                                    } else {
                                                        breakMinutes = worklog.break_minutes || worklog.break_duration || 0;
                                                    }

                                                    return (
                                                        <tr key={worklog.id} style={{ borderTop: idx > 0 ? '1px solid #E5E7EB' : 'none' }}>
                                                            <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1F2937' }}>
                                                                <a href={`/dashboard/employees/${worklog.employee_profile_id || worklog.employee}`} target="_blank" style={{ color: '#1E3A5F', textDecoration: 'none' }}>
                                                                    {worklog.employee_name || 'Unknown'}
                                                                </a>
                                                            </td>
                                                            <td style={{ padding: '12px 14px', textAlign: 'left', color: '#6B7280' }}>
                                                                {worklog.project_name || 'N/A'}
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'left', color: '#059669', fontSize: '12px', fontWeight: 500 }}>
                                                                {worklog.service_name || 'N/A'}
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                                                                {(() => {
                                                                    const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
                                                                    if (worklog.start_datetime) {
                                                                        return dayAbbr[new Date(worklog.start_datetime).getDay()];
                                                                    } else if (worklog.work_date) {
                                                                        return dayAbbr[new Date(worklog.work_date).getDay()];
                                                                    }
                                                                    return 'N/A';
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                                                                {(() => {
                                                                    if (worklog.start_datetime && worklog.end_datetime) {
                                                                        const startTime = new Date(worklog.start_datetime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                                                                        const endTime = new Date(worklog.end_datetime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                                                                        return `${startTime} - ${endTime}`;
                                                                    } else if (worklog.start_time && worklog.end_time) {
                                                                        return `${worklog.start_time.slice(0, 5)} - ${worklog.end_time.slice(0, 5)}`;
                                                                    }
                                                                    return 'N/A';
                                                                })()}
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#EF4444', fontSize: '12px', fontWeight: 500 }}>
                                                                {breakMinutes > 0 ? `${breakMinutes}min` : '-'}
                                                            </td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: '#D97706' }}>{hours.toFixed(1)}h</td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#6B7280' }}>€{baseRate.toFixed(2)}</td>
                                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#8B5CF6', fontSize: '11px' }}>
                                                                {Object.keys(surchargeBreakdown).length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        {Object.entries(surchargeBreakdown).map(([key, data]) => (
                                                                            <span key={key}>
                                                                                {data.hours.toFixed(1)}h → €{data.amount.toFixed(2)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: '#9CA3AF' }}>-</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>€{totalCharge.toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ backgroundColor: '#1E3A5F', color: 'white' }}>
                                                    <td colSpan={5} style={{ padding: '14px', fontWeight: 700, fontSize: '14px' }}>
                                                        {t('TOTAL')}
                                                    </td>
                                                    <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                                                        {worklogs.reduce((sum, w) => {
                                                            let breakMins = 0;
                                                            if (w.breaks && Array.isArray(w.breaks)) {
                                                                breakMins = w.breaks.reduce((t: number, b: any) => {
                                                                    if (b.start && b.end) {
                                                                        const [sh, sm] = b.start.split(':').map(Number);
                                                                        const [eh, em] = b.end.split(':').map(Number);
                                                                        return t + ((eh * 60 + em) - (sh * 60 + sm));
                                                                    }
                                                                    return t;
                                                                }, 0);
                                                            } else {
                                                                breakMins = w.break_minutes || w.break_duration || 0;
                                                            }
                                                            return sum + breakMins;
                                                        }, 0)}min
                                                    </td>
                                                    <td style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>
                                                        {worklogs.reduce((sum, w) => sum + (parseFloat(w.calculated_hours) || 0), 0).toFixed(1)}h
                                                    </td>
                                                    <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                                                        €{(worklogs.reduce((sum, w) => sum + (parseFloat(w.calculated_hours) || 0) * (w.surcharges_breakdown?.base_rate || 0), 0)).toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                                                        €{worklogs.reduce((sum, w) => sum + (w.surcharges_breakdown?.total_surcharge_amount || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '14px', textAlign: 'right', fontWeight: 700, fontSize: '15px' }}>
                                                        €{worklogs.reduce((sum, w) => {
                                                            const hours = parseFloat(w.calculated_hours) || 0;
                                                            const baseRate = w.surcharges_breakdown?.base_rate || 0;
                                                            const surchargeAmount = w.surcharges_breakdown?.total_surcharge_amount || 0;
                                                            const allowancesAmount = w.surcharges_breakdown?.total_allowances_amount || 0;
                                                            return sum + (hours * baseRate) + surchargeAmount + allowancesAmount;
                                                        }, 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Worklogs Count */}
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                    📋 {worklogs.length} work log entries ready to export
                                </p>
                            </div>
                        )}
                    </div>
                
    );
}
