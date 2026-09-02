'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { useWorklogCreate } from '@/hooks/useWorklogCreate';
import { ArrowLeft, Plus, Gift, Trash2, Coffee, User, Building2, Briefcase, MapPin, Clock, FileText, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';








export default function AddWorkLogPage() {
    const { t } = useLanguage();
    const vm = useWorklogCreate();
    const {
        addAllowance, addBreak, allowanceTypes, allowances, breaks, customer, customerSearch, customers, employeeSearch, employees, endDatetime, errors, filteredProjects, getEmployeeName, handleSubmit, loadingCustomers, loadingEmployees, loadingProjects, loadingServices, loadingSupervisors, location, notes, originalLocation, project, projectSearch, projects, removeAllowance, removeBreak, returnUrl, router, saving, selectedEmployees, service, serviceSearch, services, setCustomer, setCustomerSearch, setEmployeeSearch, setEndDatetime, setLocation, setNotes, setProject, setProjectSearch, setService, setServiceSearch, setShowCustomerDropdown, setShowEmployeeDropdown, setShowProjectDropdown, setShowServiceDropdown, setShowSupervisorDropdown, setStartDatetime, setSupervisor, setSupervisorSearch, showCustomerDropdown, showEmployeeDropdown, showProjectDropdown, showServiceDropdown, showSupervisorDropdown, startDatetime, supervisor, supervisorSearch, supervisors, toggleEmployee, updateAllowance, updateBreak,
    } = vm;

    return (
        <DashboardLayout>
            <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5A8F 100%)',
                    padding: '24px 32px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <button
                            onClick={() => router.push(returnUrl)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: '14px', marginBottom: '16px'
                            }}
                        >
                            <ArrowLeft size={16} /> {t('Back to Work Logs')}
                        </button>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0 }}>
                            {t('Add Work Log')}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 0', fontSize: '15px' }}>
                            Create a new work log entry by filling out the form below
                        </p>
                    </div>
                </div>

                {/* Form Content */}
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
                    {/* General Error */}
                    {errors.general && (
                        <div style={{
                            padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '12px',
                            border: '1px solid #FECACA', marginBottom: '24px',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <AlertCircle size={20} style={{ color: '#DC2626' }} />
                            <span style={{ color: '#DC2626', fontSize: '14px' }}>{errors.general}</span>
                        </div>
                    )}

                    {/* Assignment Section */}
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <User size={20} style={{ color: '#3B82F6' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    {t('Assignment Details')}
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                    Select employee, customer, project and supervisor
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {/* Multi-Employee Selection */}
                                <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>
                                        {t('Employees')} <span style={{ color: '#EF4444' }}>*</span>
                                        {selectedEmployees.length > 0 && (
                                            <span style={{ color: '#6B7280', fontWeight: 400, marginLeft: '8px' }}>
                                                ({selectedEmployees.length} selected)
                                            </span>
                                        )}
                                    </label>

                                    {/* Selected employees chips */}
                                    {selectedEmployees.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                            {selectedEmployees.map(empId => (
                                                <div key={empId} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px', background: '#10B981', color: 'white',
                                                    borderRadius: '20px', fontSize: '13px', fontWeight: 500
                                                }}>
                                                    {getEmployeeName(empId)}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleEmployee(empId)}
                                                        style={{ background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '50%', fontSize: '12px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search input */}
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => {
                                            setEmployeeSearch(e.target.value);
                                            setShowEmployeeDropdown(true);
                                        }}
                                        onFocus={() => setShowEmployeeDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                                        placeholder={loadingEmployees ? t('Loading...') : t('Search and select employees...')}
                                        style={{ ...inputStyle, borderColor: errors.employee ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.employee && <span style={errorStyle}>{errors.employee}</span>}

                                    {/* Dropdown with checkboxes */}
                                    {showEmployeeDropdown && (
                                        <div style={dropdownStyle}>
                                            {employees
                                                .filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                                .filter(emp => !selectedEmployees.includes(emp.id)) // Hide already selected
                                                .slice(0, 10)
                                                .map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onMouseDown={() => {
                                                            toggleEmployee(emp.id);
                                                            setEmployeeSearch('');
                                                        }}
                                                        style={{
                                                            ...dropdownItemStyle,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px'
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: '18px', height: '18px', borderRadius: '4px',
                                                            border: '2px solid #10B981', display: 'flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            background: 'white'
                                                        }}>
                                                            +
                                                        </span>
                                                        {emp.full_name}
                                                    </div>
                                                ))}
                                            {employees.filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).filter(emp => !selectedEmployees.includes(emp.id)).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {selectedEmployees.length > 0 && employees.filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === employees.length
                                                        ? 'All matching employees selected'
                                                        : t('No employees found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Customer */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>
                                        {t('Customer')} <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerDropdown(true);
                                            if (customer) {
                                                const selectedCust = customers.find(c => c.id === customer);
                                                if (selectedCust && !selectedCust.company_name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setCustomer('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                        placeholder={loadingCustomers ? t('Loading...') : 'Search customer...'}
                                        style={{ ...inputStyle, borderColor: errors.customer ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.customer && <span style={errorStyle}>{errors.customer}</span>}
                                    {showCustomerDropdown && (
                                        <div style={dropdownStyle}>
                                            {customers
                                                .filter(c => c.company_name.toLowerCase().includes(customerSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(c => (
                                                    <div
                                                        key={c.id}
                                                        onMouseDown={() => {
                                                            setCustomer(c.id);
                                                            setCustomerSearch(c.company_name);
                                                            setShowCustomerDropdown(false);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {c.company_name}
                                                    </div>
                                                ))}
                                            {customers.filter(c => c.company_name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No customers found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Project */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>
                                        {t('Project')} <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={projectSearch}
                                        onChange={(e) => {
                                            setProjectSearch(e.target.value);
                                            setShowProjectDropdown(true);
                                            if (project) {
                                                const selectedProj = filteredProjects.find(p => p.id === project);
                                                if (selectedProj && !selectedProj.name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setProject('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowProjectDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                                        placeholder={!customer ? 'Select customer first...' : loadingProjects ? t('Loading...') : 'Search project...'}
                                        style={{ ...inputStyle, borderColor: errors.project ? '#EF4444' : '#E5E7EB' }}
                                        disabled={!customer}
                                    />
                                    {errors.project && <span style={errorStyle}>{errors.project}</span>}
                                    {showProjectDropdown && customer && (
                                        <div style={dropdownStyle}>
                                            {filteredProjects
                                                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        onMouseDown={() => {
                                                            setProject(p.id);
                                                            setProjectSearch(p.name);
                                                            setShowProjectDropdown(false);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {p.name}
                                                    </div>
                                                ))}
                                            {filteredProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No projects found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Supervisor */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('Supervisor')}</label>
                                    <input
                                        type="text"
                                        value={supervisorSearch}
                                        onChange={(e) => {
                                            setSupervisorSearch(e.target.value);
                                            setShowSupervisorDropdown(true);
                                            if (supervisor) {
                                                const selectedSup = supervisors.find(s => s.id === supervisor);
                                                if (selectedSup && !selectedSup.full_name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setSupervisor('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowSupervisorDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowSupervisorDropdown(false), 200)}
                                        placeholder={!project ? 'Select project first...' : loadingSupervisors ? t('Loading...') : 'Search supervisor...'}
                                        style={inputStyle}
                                        disabled={!project}
                                    />
                                    {showSupervisorDropdown && project && (
                                        <div style={dropdownStyle}>
                                            {supervisors
                                                .filter(s => s.full_name.toLowerCase().includes(supervisorSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(s => (
                                                    <div
                                                        key={s.id}
                                                        onMouseDown={() => {
                                                            setSupervisor(s.id);
                                                            setSupervisorSearch(s.full_name);
                                                            setShowSupervisorDropdown(false);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {s.full_name}
                                                    </div>
                                                ))}
                                            {supervisors.filter(s => s.full_name.toLowerCase().includes(supervisorSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No supervisors found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Service */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('Service Type')}</label>
                                    <input
                                        type="text"
                                        value={serviceSearch}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            setShowServiceDropdown(true);
                                            if (service) {
                                                const selectedServ = services.find(s => s.id === service);
                                                if (selectedServ && !selectedServ.name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setService('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowServiceDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                                        placeholder={!project ? 'Select project first...' : loadingServices ? t('Loading...') : 'Search service...'}
                                        style={inputStyle}
                                        disabled={!project}
                                    />
                                    {showServiceDropdown && project && (
                                        <div style={dropdownStyle}>
                                            {services
                                                .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(s => (
                                                    <div
                                                        key={s.id}
                                                        onMouseDown={() => {
                                                            setService(s.id);
                                                            setServiceSearch(s.name);
                                                            setShowServiceDropdown(false);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {s.name}
                                                    </div>
                                                ))}
                                            {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No services found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Location */}
                                <div>
                                    <label style={labelStyle}>
                                        <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        {t('Location')}
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder={!project ? 'Select project to auto-fill...' : t('Work location')}
                                        style={inputStyle}
                                        disabled={!project}
                                    />
                                    {project && originalLocation && location !== originalLocation && (
                                        <button
                                            type="button"
                                            onClick={() => setLocation(originalLocation)}
                                            style={{
                                                marginTop: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: '#EFF6FF',
                                                color: '#3B82F6',
                                                border: '1px solid #3B82F6',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            ↩ Reset to: {originalLocation.length > 30 ? originalLocation.substring(0, 30) + '...' : originalLocation}
                                        </button>
                                    )}
                                    {project && location === originalLocation && (
                                        <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                                            Auto-filled from project (editable)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time Section */}
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Clock size={20} style={{ color: '#16A34A' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    {t('Date & Time')}
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                    Set work hours and break times
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                                {/* Start DateTime */}
                                <div>
                                    <label style={labelStyle}>
                                        {t('Start Date/Time')} <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={startDatetime}
                                        onChange={(e) => setStartDatetime(e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.startDatetime ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.startDatetime && <span style={errorStyle}>{errors.startDatetime}</span>}
                                </div>

                                {/* End DateTime */}
                                <div>
                                    <label style={labelStyle}>
                                        {t('End Date/Time')} <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={endDatetime}
                                        onChange={(e) => setEndDatetime(e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.endDatetime ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.endDatetime && <span style={errorStyle}>{errors.endDatetime}</span>}
                                </div>
                            </div>

                            {/* Breaks */}
                            <div style={{
                                backgroundColor: '#FEF3C7', borderRadius: '12px', padding: '20px',
                                border: '1px solid #FCD34D'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Coffee size={18} style={{ color: '#D97706' }} />
                                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#92400E' }}>
                                            {t('Breaks')} <span style={{ color: '#EF4444' }}>*</span>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addBreak}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', backgroundColor: '#D97706', color: 'white',
                                            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} />
                                        {t('Add Break')}
                                    </button>
                                </div>

                                {errors.breaks && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={errorStyle}>{errors.breaks}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {breaks.map((brk, index) => {
                                        // Calculate break duration in minutes
                                        let durationMins = 0;
                                        if (brk.start && brk.end) {
                                            const [sh, sm] = brk.start.split(':').map(Number);
                                            const [eh, em] = brk.end.split(':').map(Number);
                                            durationMins = (eh * 60 + em) - (sh * 60 + sm);
                                            if (durationMins < 0) durationMins += 24 * 60; // Handle overnight
                                        }

                                        const breakError = errors[`break_${index}`];

                                        return (
                                            <div key={index}>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ ...labelStyle, fontSize: '12px', color: breakError ? '#DC2626' : '#92400E' }}>{t('Start')}</label>
                                                        <input
                                                            type="time"
                                                            value={brk.start}
                                                            onChange={(e) => updateBreak(index, 'start', e.target.value)}
                                                            style={{
                                                                ...inputStyle,
                                                                padding: '10px 12px',
                                                                backgroundColor: breakError ? '#FEF2F2' : 'white',
                                                                borderColor: breakError ? '#DC2626' : '#E5E7EB'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ ...labelStyle, fontSize: '12px', color: breakError ? '#DC2626' : '#92400E' }}>{t('End')}</label>
                                                        <input
                                                            type="time"
                                                            value={brk.end}
                                                            onChange={(e) => updateBreak(index, 'end', e.target.value)}
                                                            style={{
                                                                ...inputStyle,
                                                                padding: '10px 12px',
                                                                backgroundColor: breakError ? '#FEF2F2' : 'white',
                                                                borderColor: breakError ? '#DC2626' : '#E5E7EB'
                                                            }}
                                                        />
                                                    </div>
                                                    {/* Duration display */}
                                                    <div style={{
                                                        padding: '10px 14px',
                                                        backgroundColor: breakError ? '#DC2626' : '#F59E0B',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        minWidth: '60px',
                                                        textAlign: 'center'
                                                    }}>
                                                        {durationMins > 0 ? `${durationMins} min` : '--'}
                                                    </div>
                                                    {breaks.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeBreak(index)}
                                                            style={{
                                                                padding: '10px', backgroundColor: '#FEE2E2',
                                                                border: 'none', borderRadius: '8px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={16} style={{ color: '#DC2626' }} />
                                                        </button>
                                                    )}
                                                </div>
                                                {breakError && (
                                                    <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                                                        {breakError}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FileText size={20} style={{ color: '#6B7280' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    {t('Notes')}
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                    Additional information about this work log
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes or comments..."
                                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Allowances Section */}
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Gift size={20} style={{ color: '#8B5CF6' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                        {t('Allowances (Toeslag)')}
                                    </h2>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                        Add special allowances for this work log
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addAllowance}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '10px 18px', backgroundColor: '#8B5CF6', color: 'white',
                                    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} />
                                {t('Add Allowance')}
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {allowances.length === 0 ? (
                                <p style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
                                    No allowances added. Click "Add Allowance" to add one.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {allowances.map((allowance, index) => (
                                        <div key={index} style={{
                                            padding: '20px', backgroundColor: '#F9FAFB',
                                            borderRadius: '12px', border: '1px solid #E5E7EB'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '16px', marginBottom: '16px' }}>
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>{t('Allowance Type')}</label>
                                                    <select
                                                        value={allowance.allowance_type || ''}
                                                        onChange={(e) => updateAllowance(index, 'allowance_type', e.target.value ? parseInt(e.target.value) : null)}
                                                        style={inputStyle}
                                                    >
                                                        <option value="">{t('Custom / Other')}</option>
                                                        {allowanceTypes.map(at => (
                                                            <option key={at.id} value={at.id}>
                                                                {at.name} (€{at.base_price}/hr)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>{t('Hours')}</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        value={allowance.hours}
                                                        onChange={(e) => updateAllowance(index, 'hours', e.target.value)}
                                                        placeholder="0"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAllowance(index)}
                                                    style={{
                                                        alignSelf: 'flex-end', padding: '12px',
                                                        backgroundColor: '#FEE2E2', border: 'none',
                                                        borderRadius: '8px', cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={18} style={{ color: '#DC2626' }} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: allowance.allowance_type ? '0' : '16px' }}>
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>{t('From Time')}</label>
                                                    <input
                                                        type="time"
                                                        value={allowance.start_time || ''}
                                                        onChange={(e) => {
                                                            const start = e.target.value;
                                                            updateAllowance(index, 'start_time', start);
                                                            if (start && allowance.end_time) {
                                                                const [sh, sm] = start.split(':').map(Number);
                                                                const [eh, em] = (allowance.end_time || '').split(':').map(Number);
                                                                let hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                                                                if (hours < 0) hours += 24;
                                                                updateAllowance(index, 'hours', hours.toFixed(2));
                                                            }
                                                        }}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>{t('To Time')}</label>
                                                    <input
                                                        type="time"
                                                        value={allowance.end_time || ''}
                                                        onChange={(e) => {
                                                            const end = e.target.value;
                                                            updateAllowance(index, 'end_time', end);
                                                            if (allowance.start_time && end) {
                                                                const [sh, sm] = (allowance.start_time || '').split(':').map(Number);
                                                                const [eh, em] = end.split(':').map(Number);
                                                                let hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                                                                if (hours < 0) hours += 24;
                                                                updateAllowance(index, 'hours', hours.toFixed(2));
                                                            }
                                                        }}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                            </div>

                                            {!allowance.allowance_type && (
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>{t('Custom Allowance Name')}</label>
                                                    <input
                                                        type="text"
                                                        value={allowance.custom_allowance_name}
                                                        onChange={(e) => updateAllowance(index, 'custom_allowance_name', e.target.value)}
                                                        placeholder={t('Enter custom allowance name...')}
                                                        style={inputStyle}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex', gap: '16px', justifyContent: 'flex-end',
                        padding: '24px', backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <button
                            onClick={() => router.push('/dashboard/worklogs')}
                            style={{
                                padding: '14px 28px', backgroundColor: '#F3F4F6', color: '#374151',
                                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {t('Cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || Object.keys(errors).some(k => k.startsWith('break_'))}
                            style={{
                                padding: '14px 36px',
                                backgroundColor: (saving || Object.keys(errors).some(k => k.startsWith('break_'))) ? '#9CA3AF' : '#059669',
                                color: 'white',
                                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                                cursor: (saving || Object.keys(errors).some(k => k.startsWith('break_'))) ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? 'Creating...' : 'Create Work Log'}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#374151'
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    backgroundColor: 'white',
    transition: 'border-color 0.2s'
};

const errorStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: '#EF4444',
    marginTop: '4px'
};

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: 1000,
    marginTop: '4px'
};

const dropdownItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    borderBottom: '1px solid #F3F4F6',
    color: '#111827',
    fontSize: '14px'
};
