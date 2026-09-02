'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { useWorklogDetail } from '@/hooks/useWorklogDetail';
import { ArrowLeft, Plus, Gift, Trash2, Coffee, User, Clock, FileText, AlertCircle, CheckCircle, XCircle, MapPin, Camera, Image, X } from 'lucide-react';
import { apiFetch } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';




export default function WorkLogEditPage() {
    const { t } = useLanguage();
    const vm = useWorklogDetail();
    const {
        statusStyles, addAllowance, addBreak, allowanceTypes, allowances, breaks, customer, customerSearch, customers, employee, employeeSearch, employees, endDatetime, error, errors, fileInputRef, handleApprove, handlePhotoDelete, handlePhotoUpload, handleReject, handleSave, hasChanges, loadProjectDetails, loading, loadingServices, loadingSupervisors, location, notes, photos, project, projectSearch, projects, removeAllowance, removeBreak, router, saving, service, serviceSearch, services, setCustomer, setCustomerSearch, setEmployee, setEmployeeSearch, setEndDatetime, setLocation, setNotes, setProject, setProjectSearch, setService, setServiceSearch, setShowCustomerDropdown, setShowEmployeeDropdown, setShowProjectDropdown, setShowServiceDropdown, setShowSupervisorDropdown, setStartDatetime, setStatus, setSupervisor, setSupervisorSearch, showCustomerDropdown, showEmployeeDropdown, showProjectDropdown, showServiceDropdown, showSupervisorDropdown, startDatetime, status, supervisor, supervisorSearch, supervisors, updateAllowance, updateBreak, uploadingPhoto, worklog,
    } = vm;

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #1E3A5F', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !worklog) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                    <div style={{ textAlign: 'center' }}>
                        <AlertCircle style={{ width: '64px', height: '64px', color: '#EF4444', margin: '0 auto 16px' }} />
                        <p style={{ color: '#6B7280', marginBottom: '16px' }}>{error || 'Work log not found'}</p>
                        <button onClick={() => router.push('/dashboard/worklogs')} style={{ padding: '10px 20px', backgroundColor: '#1E3A5F', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                            {t('Back to Work Logs')}
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const currentStatus = statusStyles[status] || statusStyles.pending;

    return (
        <DashboardLayout>
            <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5A8F 100%)',
                    padding: '20px 32px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        {/* Top row: Back button + Approve/Reject */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <button
                                onClick={() => router.push('/dashboard/worklogs')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px', padding: '8px 14px',
                                    cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <ArrowLeft size={14} /> {t('Back')}
                            </button>

                            {status !== 'approved' && status !== 'cancelled' && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={handleApprove}
                                        disabled={saving}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px', backgroundColor: '#10B981', color: 'white',
                                            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.7 : 1
                                        }}
                                    >
                                        <CheckCircle size={14} /> {['pending', 'submitted'].includes(status) ? t('Approve') : 'Force Approve'}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={saving}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px', backgroundColor: '#EF4444', color: 'white',
                                            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.7 : 1
                                        }}
                                    >
                                        <XCircle size={14} /> {t('Reject')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Main info row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '14px',
                            padding: '16px 20px'
                        }}>
                            {/* Left: Employee info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '15px', fontWeight: 700, color: 'white',
                                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
                                }}>
                                    {worklog.employee_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>
                                        {worklog.employee_name}
                                    </h1>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: '2px 0 0', fontSize: '13px' }}>
                                        {worklog.project_name} • {worklog.customer_name}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Status badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {t('Status')}
                                </span>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: currentStatus.bg,
                                    border: `1px solid ${currentStatus.border}`,
                                    color: currentStatus.text
                                }}>
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: currentStatus.text
                                    }} />
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </div>
                                {/* Status dropdown - always visible */}
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    style={{
                                        appearance: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: 'white',
                                        outline: 'none',
                                        minWidth: '120px'
                                    }}
                                    title="Change status"
                                >
                                    <option value="planned" style={{ color: '#333' }}>Planned</option>
                                    <option value="pending" style={{ color: '#333' }}>{t('Pending')}</option>
                                    <option value="approved" style={{ color: '#333' }}>{t('Approved')}</option>
                                    <option value="rejected" style={{ color: '#333' }}>{t('Rejected')}</option>
                                </select>

                            </div>
                        </div>
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

                    {/* Rejection Reason */}
                    {worklog.rejection_reason && (
                        <div style={{
                            padding: '16px 20px', backgroundColor: '#FEF2F2', borderRadius: '12px',
                            border: '1px solid #FECACA', marginBottom: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <XCircle size={18} style={{ color: '#DC2626' }} />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626' }}>{t('Rejection Reason')}</span>
                            </div>
                            <p style={{ margin: 0, color: '#7F1D1D', fontSize: '14px' }}>{worklog.rejection_reason}</p>
                        </div>
                    )}

                    {/* Assignment Section */}
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
                                backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <User size={20} style={{ color: '#3B82F6' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    {t('Assignment Details')}
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                    Project, supervisor and location information
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {/* Customer - Searchable */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('Customer')} <span style={{ color: '#EF4444' }}>*</span></label>
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
                                                    setProject('');
                                                    setProjectSearch('');
                                                    setSupervisor('');
                                                    setSupervisorSearch('');
                                                    setService('');
                                                    setServiceSearch('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                        placeholder="Search customer..."
                                        style={{ ...inputStyle, borderColor: errors.customer ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.customer && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.customer}</p>}
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
                                                            setProject('');
                                                            setProjectSearch('');
                                                            setSupervisor('');
                                                            setSupervisorSearch('');
                                                            setService('');
                                                            setServiceSearch('');
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

                                {/* Project - Searchable */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('Project')} <span style={{ color: '#EF4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        value={projectSearch}
                                        onChange={(e) => {
                                            setProjectSearch(e.target.value);
                                            setShowProjectDropdown(true);
                                            if (project) {
                                                const selectedProj = projects.find(p => p.id === project);
                                                if (selectedProj && !selectedProj.name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setProject('');
                                                    setSupervisor('');
                                                    setSupervisorSearch('');
                                                    setService('');
                                                    setServiceSearch('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowProjectDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                                        placeholder={!customer ? 'Select customer first...' : 'Search project...'}
                                        style={{ ...inputStyle, borderColor: errors.project ? '#EF4444' : '#E5E7EB' }}
                                        disabled={!customer}
                                    />
                                    {errors.project && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.project}</p>}
                                    {showProjectDropdown && customer && (
                                        <div style={dropdownStyle}>
                                            {projects
                                                .filter(p => String(p.customer || p.customer_id) === customer)
                                                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        onMouseDown={() => {
                                                            setProject(p.id);
                                                            setProjectSearch(p.name);
                                                            setShowProjectDropdown(false);
                                                            setSupervisor('');
                                                            setSupervisorSearch('');
                                                            setService('');
                                                            setServiceSearch('');
                                                            // Auto-fill location
                                                            const addressParts = [
                                                                p.location_address,
                                                                p.location_postcode,
                                                                p.location_city
                                                            ].filter(Boolean);
                                                            const projectLocation = addressParts.length > 0
                                                                ? addressParts.join(', ')
                                                                : (p.location || '');
                                                            setLocation(projectLocation);
                                                            loadProjectDetails(p.id, customer);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {p.name}
                                                    </div>
                                                ))}
                                            {projects.filter(p => String(p.customer || p.customer_id) === customer).filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No projects found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Employee - Searchable with chip display */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{t('Employee')} <span style={{ color: '#EF4444' }}>*</span></label>

                                    {/* Selected employee chip */}
                                    {employee && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '6px 12px', background: '#10B981', color: 'white',
                                                borderRadius: '20px', fontSize: '13px', fontWeight: 500
                                            }}>
                                                {employees.find(e => e.id === employee)?.full_name || 'Employee'}
                                                <button
                                                    type="button"
                                                    onClick={() => { setEmployee(''); setEmployeeSearch(''); }}
                                                    style={{ background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '50%', fontSize: '12px' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => {
                                            setEmployeeSearch(e.target.value);
                                            setShowEmployeeDropdown(true);
                                            if (employee) {
                                                const selectedEmp = employees.find(emp => emp.id === employee);
                                                if (selectedEmp && !selectedEmp.full_name.toLowerCase().includes(e.target.value.toLowerCase())) {
                                                    setEmployee('');
                                                }
                                            }
                                        }}
                                        onFocus={() => setShowEmployeeDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                                        placeholder={employee ? 'Change employee...' : t('Search employee...')}
                                        style={{ ...inputStyle, borderColor: errors.employee ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.employee && <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>{errors.employee}</p>}
                                    {showEmployeeDropdown && (
                                        <div style={dropdownStyle}>
                                            {employees
                                                .filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onMouseDown={() => {
                                                            setEmployee(emp.id);
                                                            setEmployeeSearch(emp.full_name);
                                                            setShowEmployeeDropdown(false);
                                                        }}
                                                        style={dropdownItemStyle}
                                                    >
                                                        {emp.full_name}
                                                    </div>
                                                ))}
                                            {employees.filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '12px 16px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    {t('No employees found')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Supervisor - Searchable */}
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
                                        disabled={!project || loadingSupervisors}
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

                                {/* Service - Searchable */}
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
                                        disabled={!project || loadingServices}
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
                                        placeholder={t('Work location')}
                                        style={inputStyle}
                                    />
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
                                    Work hours and break times
                                </p>
                            </div>
                            <div style={{ marginLeft: 'auto', padding: '10px 16px', backgroundColor: '#F0FDF4', borderRadius: '10px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#16A34A' }}>
                                    {Number(worklog.calculated_hours || 0).toFixed(2)}h worked
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>{t('Start Date/Time')}</label>
                                    <input
                                        type="datetime-local"
                                        value={startDatetime}
                                        onChange={(e) => setStartDatetime(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>{t('End Date/Time')}</label>
                                    <input
                                        type="datetime-local"
                                        value={endDatetime}
                                        onChange={(e) => setEndDatetime(e.target.value)}
                                        style={inputStyle}
                                    />
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
                                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#92400E' }}>{t('Breaks')}</span>
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
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Notes')}</h2>
                            </div>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes..."
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
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    Allowances (Toeslag)
                                </h2>
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
                                    No allowances added.
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
                                                        placeholder="Enter custom allowance name..."
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

                    {/* Photos Section */}
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
                                    backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Camera size={20} style={{ color: '#D97706' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                        Photos
                                    </h2>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                        Attach photos as evidence
                                    </p>
                                </div>
                            </div>
                            {(status === 'draft' || status === 'pending') && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '10px 18px', backgroundColor: '#D97706', color: 'white',
                                        border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                        cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                                        opacity: uploadingPhoto ? 0.7 : 1
                                    }}
                                >
                                    {uploadingPhoto ? (
                                        <>Uploading...</>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Add Photo
                                        </>
                                    )}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div style={{ padding: '24px' }}>
                            {photos.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '48px 24px',
                                    backgroundColor: '#F9FAFB', borderRadius: '12px',
                                    border: '2px dashed #E5E7EB'
                                }}>
                                    <Image size={48} style={{ color: '#D1D5DB', marginBottom: '12px' }} />
                                    <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
                                        No photos attached yet.
                                    </p>
                                    {(status === 'draft' || status === 'pending') && (
                                        <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '8px' }}>
                                            Click &quot;Add Photo&quot; to upload evidence photos
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '16px'
                                }}>
                                    {photos.map((photo) => (
                                        <div key={photo.id} style={{
                                            position: 'relative',
                                            aspectRatio: '1',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            backgroundColor: '#F3F4F6',
                                            border: '1px solid #E5E7EB'
                                        }}>
                                            <img
                                                src={photo.photo_url || photo.photo}
                                                alt={photo.caption || 'Work log photo'}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            {(status === 'draft' || status === 'pending') && (
                                                <button
                                                    onClick={() => handlePhotoDelete(photo.id)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                            {photo.caption && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    padding: '8px',
                                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    textAlign: 'center'
                                                }}>
                                                    {photo.caption}
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
                        display: 'flex', gap: '16px', justifyContent: 'space-between',
                        padding: '24px', backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        {/* Empty div for spacing */}
                        <div></div>

                        {/* Right side: Cancel/Save buttons */}
                        <div style={{ display: 'flex', gap: '16px' }}>
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
                                onClick={handleSave}
                                disabled={saving || !hasChanges || Object.keys(errors).some(k => k.startsWith('break_'))}
                                style={{
                                    padding: '14px 36px',
                                    backgroundColor: (hasChanges && !Object.keys(errors).some(k => k.startsWith('break_'))) ? '#1E3A5F' : '#9CA3AF',
                                    color: 'white',
                                    border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                                    cursor: (saving || !hasChanges || Object.keys(errors).some(k => k.startsWith('break_'))) ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout >
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

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: '240px',
    overflowY: 'auto',
    marginTop: '4px'
};

const dropdownItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background-color 0.15s'
};
