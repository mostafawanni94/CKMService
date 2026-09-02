/**
 * The bulk-action bar shown when rows are selected.
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

export function WorklogBulkBar({ vm }: { vm: ViewModel }) {
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
                        backgroundColor: '#1E3A5F',
                        borderRadius: '12px',
                        padding: '16px 24px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="checkbox"
                                checked={selectedIds.size === displayedLogs.length}
                                onChange={toggleSelectAll}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                                {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94A3B8',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Clear selection
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleBulkApprove}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    backgroundColor: '#10B981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Check size={16} />
                                Approve All
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    backgroundColor: '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} />
                                Delete All
                            </button>
                        </div>
                    </div>
                
    );
}
