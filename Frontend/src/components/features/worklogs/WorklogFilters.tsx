/**
 * The filter panel: customer, supervisor, employee, status and dates.
 *
 * Extracted from worklogs's page, which carried
 * every section inline. The JSX is unchanged; it reads the page's view-model.
 */
'use client';

import React from 'react';

import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button } from '@/components/ui';
import { WorkEntry } from '@/lib/api';
import { Clock, CheckCircle, XCircle, AlertCircle, Search, Eye, Check, X, Plus, Gift, Trash2, Edit2 } from 'lucide-react';
import type { AllowanceType, WorkLogAllowance, Project } from '@/hooks/useWorklogs';

import type { useWorklogs } from '@/hooks/useWorklogs';

type ViewModel = ReturnType<typeof useWorklogs>;

export function WorklogFilters({ vm }: { vm: ViewModel }) {
    const {
        t, router,
        workLogs, pendingLogs, displayedLogs, loading, error,
        filter, setFilter, search, setSearch,
        filteredLogs, stats,
        showAdvancedFilters, setShowAdvancedFilters,
        filterCustomer, setFilterCustomer,
        filterSupervisor, setFilterSupervisor,
        filterEmployees, setFilterEmployees,
        filterStartWeek, setFilterStartWeek,
        filterEndWeek, setFilterEndWeek,
        filterStartDate, setFilterStartDate,
        filterEndDate, setFilterEndDate,
        filterSupervisors, setFilterSupervisors, loadFilterSupervisors,
        showEmployeeDropdown, setShowEmployeeDropdown,
        employeeSearchFilter, setEmployeeSearchFilter,
        filterStatuses, setFilterStatuses,
        customerSearchFilter, setCustomerSearchFilter,
        showCustomerDropdown, setShowCustomerDropdown,
        supervisorSearchFilter, setSupervisorSearchFilter,
        showSupervisorDropdown, setShowSupervisorDropdown,
        showModal, setShowModal,
        editingId, saving,
        projects, allowanceTypes,
        formData, setFormData,
        allowances, setAllowances,
        employees, employeeSearch, setEmployeeSearch,
        customers, supervisors, setSupervisors, services, setServices,
        selectedCustomer, setSelectedCustomer,
        loadCustomerData,
        statusDropdownOpen, setStatusDropdownOpen,
        selectedIds, setSelectedIds,
        toggleSelectAll, toggleSelectOne,
        handleBulkDelete, handleBulkApprove,
        handleStatusChange, handleApprove, handleReject, handleDelete,
        openModal, openEditModal,
        addAllowance, updateAllowance, removeAllowance,
        handleSubmit, loadWorkLogs
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
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Customer</label>
                                    {filterCustomer ? (
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
                                                {customers.find(c => c.id === filterCustomer)?.company_name}
                                            </span>
                                            <button
                                                onClick={() => { setFilterCustomer(''); setFilterSupervisors([]); setFilterSupervisor(''); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: '16px' }}
                                            >✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                placeholder="Search customers..."
                                                value={customerSearchFilter}
                                                onChange={(e) => setCustomerSearchFilter(e.target.value)}
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
                                                        .filter(c => c.company_name.toLowerCase().includes(customerSearchFilter.toLowerCase()))
                                                        .slice(0, 10)
                                                        .map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setFilterCustomer(c.id);
                                                                    setCustomerSearchFilter('');
                                                                    setShowCustomerDropdown(false);
                                                                    loadFilterSupervisors(c.id);
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
                                                    {customers.filter(c => c.company_name.toLowerCase().includes(customerSearchFilter.toLowerCase())).length === 0 && (
                                                        <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '14px' }}>No customers found</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Supervisor Filter - Searchable */}
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                        Supervisor {filterCustomer && <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>(for selected customer)</span>}
                                    </label>
                                    {filterSupervisor ? (
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
                                                {filterSupervisors.find(s => s.id === filterSupervisor)?.full_name}
                                            </span>
                                            <button
                                                onClick={() => setFilterSupervisor('')}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: '16px' }}
                                            >✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                placeholder={filterCustomer ? "Search supervisors..." : "Select customer first"}
                                                value={supervisorSearchFilter}
                                                onChange={(e) => setSupervisorSearchFilter(e.target.value)}
                                                onFocus={() => filterCustomer && setShowSupervisorDropdown(true)}
                                                disabled={!filterCustomer}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    fontSize: '14px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #D1D5DB',
                                                    backgroundColor: filterCustomer ? '#FAFAFA' : '#F3F4F6',
                                                    outline: 'none',
                                                    opacity: filterCustomer ? 1 : 0.6,
                                                    cursor: filterCustomer ? 'text' : 'not-allowed'
                                                }}
                                            />
                                            {showSupervisorDropdown && filterCustomer && (
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
                                                    {filterSupervisors
                                                        .filter(s => s.full_name.toLowerCase().includes(supervisorSearchFilter.toLowerCase()))
                                                        .slice(0, 10)
                                                        .map(s => (
                                                            <div
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setFilterSupervisor(s.id);
                                                                    setSupervisorSearchFilter('');
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
                                                    {filterSupervisors.filter(s => s.full_name.toLowerCase().includes(supervisorSearchFilter.toLowerCase())).length === 0 && (
                                                        <div style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '14px' }}>No supervisors found</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Week Range - From */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>From Week</label>
                                    <input
                                        type="week"
                                        value={filterStartWeek}
                                        onChange={(e) => setFilterStartWeek(e.target.value)}
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

                                {/* Week Range - To */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>To Week</label>
                                    <input
                                        type="week"
                                        value={filterEndWeek}
                                        onChange={(e) => setFilterEndWeek(e.target.value)}
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

                                {/* Date Range - From */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>From Date</label>
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
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

                                {/* Date Range - To */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>To Date</label>
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
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

                            {/* Employee Multi-Select with Searchable Dropdown */}
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                        Employees {filterEmployees.length > 0 ? <span style={{ color: '#3B82F6', fontWeight: 500 }}>({filterEmployees.length} selected)</span> : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(All)</span>}
                                    </label>
                                    {filterEmployees.length > 0 && (
                                        <button
                                            onClick={() => setFilterEmployees([])}
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
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {/* Selected Employees as Chips */}
                                {filterEmployees.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        {filterEmployees.map(empId => {
                                            const emp = employees.find(e => e.id === empId);
                                            return emp ? (
                                                <div key={empId} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    backgroundColor: '#EFF6FF',
                                                    border: '1px solid #BFDBFE',
                                                    borderRadius: '20px',
                                                    fontSize: '13px',
                                                    color: '#1D4ED8'
                                                }}>
                                                    {emp.full_name}
                                                    <button
                                                        onClick={() => setFilterEmployees(filterEmployees.filter(id => id !== empId))}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '0',
                                                            display: 'flex',
                                                            color: '#3B82F6'
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}

                                {/* Searchable Dropdown */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search and select employees..."
                                        value={employeeSearchFilter}
                                        onChange={(e) => setEmployeeSearchFilter(e.target.value)}
                                        onFocus={() => setShowEmployeeDropdown(true)}
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
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 100,
                                            marginTop: '4px'
                                        }}>
                                            {/* All option */}
                                            <div
                                                onClick={() => {
                                                    setFilterEmployees([]);
                                                    setShowEmployeeDropdown(false);
                                                    setEmployeeSearchFilter('');
                                                }}
                                                style={{
                                                    padding: '10px 14px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    backgroundColor: filterEmployees.length === 0 ? '#EFF6FF' : 'white',
                                                    borderBottom: '1px solid #F3F4F6'
                                                }}
                                            >
                                                All Employees
                                            </div>
                                            {employees
                                                .filter(emp => emp.full_name.toLowerCase().includes(employeeSearchFilter.toLowerCase()))
                                                .map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => {
                                                            if (!filterEmployees.includes(emp.id)) {
                                                                setFilterEmployees([...filterEmployees, emp.id]);
                                                            }
                                                            setEmployeeSearchFilter('');
                                                        }}
                                                        style={{
                                                            padding: '10px 14px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: filterEmployees.includes(emp.id) ? '#EFF6FF' : 'white'
                                                        }}
                                                    >
                                                        {emp.full_name}
                                                        {filterEmployees.includes(emp.id) && (
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="3">
                                                                <polyline points="20,6 9,17 4,12"></polyline>
                                                            </svg>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                {showEmployeeDropdown && (
                                    <div
                                        onClick={() => setShowEmployeeDropdown(false)}
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                                    />
                                )}
                            </div>

                            {/* Status Multi-Select Filter */}
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                        Status {filterStatuses.length > 0 ? <span style={{ color: '#3B82F6', fontWeight: 500 }}>({filterStatuses.length} selected)</span> : <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(All)</span>}
                                    </label>
                                    {filterStatuses.length > 0 && (
                                        <button
                                            onClick={() => setFilterStatuses([])}
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
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {[
                                        { value: 'planned', label: 'Planned', color: '#3B82F6', bg: '#EFF6FF' },
                                        { value: 'confirmed', label: 'Confirmed', color: '#4F46E5', bg: '#E0E7FF' },
                                        { value: 'in_progress', label: 'In Progress', color: '#2563EB', bg: '#DBEAFE' },
                                        { value: 'draft', label: 'Draft', color: '#7C3AED', bg: '#F3E8FF' },
                                        { value: 'pending', label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
                                        { value: 'submitted', label: 'Submitted', color: '#D97706', bg: '#FEF3C7' },
                                        { value: 'approved', label: 'Approved', color: '#10B981', bg: '#D1FAE5' },
                                        { value: 'rejected', label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
                                        { value: 'cancelled', label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
                                        { value: 'no_show', label: 'No Show', color: '#EF4444', bg: '#FEE2E2' },
                                    ].map(statusOption => (
                                        <label
                                            key={statusOption.value}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 14px',
                                                backgroundColor: filterStatuses.includes(statusOption.value) ? statusOption.bg : '#F9FAFB',
                                                border: `1px solid ${filterStatuses.includes(statusOption.value) ? statusOption.color : '#E5E7EB'}`,
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: filterStatuses.includes(statusOption.value) ? 600 : 400,
                                                color: filterStatuses.includes(statusOption.value) ? statusOption.color : '#6B7280',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filterStatuses.includes(statusOption.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFilterStatuses([...filterStatuses, statusOption.value]);
                                                    } else {
                                                        setFilterStatuses(filterStatuses.filter(s => s !== statusOption.value));
                                                    }
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: statusOption.color
                                            }} />
                                            {statusOption.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Button */}
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => {
                                        setFilterCustomer('');
                                        setFilterSupervisor('');
                                        setFilterSupervisors([]);
                                        setFilterEmployees([]);
                                        setFilterStartWeek('');
                                        setFilterEndWeek('');
                                        setFilterStartDate('');
                                        setFilterEndDate('');
                                        setFilterStatuses([]);
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#DC2626',
                                        backgroundColor: 'white',
                                        border: '1px solid #FECACA',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    
    );
}
