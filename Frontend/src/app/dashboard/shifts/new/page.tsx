'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';
import { Calendar, Clock, MapPin, User, Building2, Phone, Mail, ArrowLeft, Check, AlertCircle, Users } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Employee {
    id: string;
    full_name: string;
}

interface Project {
    id: string;
    name: string;
    customer: string;
    customer_name: string;
}

interface Supervisor {
    id: string;
    full_name: string;
    company_name: string;
    contacts: { contact_type: string; value: string }[];
}

interface Service {
    id: string;
    name: string;
}

export default function NewShiftPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    // Form data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [customers, setCustomers] = useState<{ id: string, company_name: string }[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        customer: '',
        project: '',
        supervisor: '',
        service: '',
        selectedEmployees: [] as string[],
        scheduled_start_datetime: new Date().toISOString().slice(0, 16),
        scheduled_end_datetime: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
        location_notes: '',
        supervisor_phone: '',
        supervisor_email: '',
        special_instructions: '',
    });

    // Employee search
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    useEffect(() => {
        loadEmployees();
        loadProjects();
        loadCustomers();
    }, []);

    async function loadEmployees() {
        try {
            const response = await fetch(`${API_URL}/employees/profiles/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees((data.results || data).map((e: any) => ({ id: e.id, full_name: e.full_name })));
            }
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    }

    async function loadProjects() {
        try {
            const response = await fetch(`${API_URL}/projects/projects/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setProjects((data.results || data).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    customer: p.customer || p.customer_id,
                    customer_name: p.customer_name
                })));
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    async function loadCustomers() {
        try {
            const response = await fetch(`${API_URL}/customers/customers/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers((data.results || data).map((c: any) => ({ id: c.id, company_name: c.company_name })));
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }

    async function loadProjectData(projectId: string, customerId: string) {
        if (!projectId) {
            setSupervisors([]);
            setServices([]);
            return;
        }
        try {
            // Load supervisors from project detail API
            const projRes = await fetch(`${API_URL}/projects/projects/${projectId}/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (projRes.ok) {
                const projData = await projRes.json();
                const sups = (projData.supervisors_list || []).map((s: any) => ({
                    id: s.id,
                    full_name: `${s.first_name} ${s.last_name}`.trim(),
                    company_name: s.company_name || '',
                    contacts: s.contacts || []
                }));
                setSupervisors(sups);
            }

            // Load services from customer
            if (customerId) {
                const svcRes = await fetch(`${API_URL}/customers/worklog-customers/${customerId}/services/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                });
                if (svcRes.ok) {
                    const data = await svcRes.json();
                    setServices(data);
                }
            }
        } catch (error) {
            console.error('Failed to load project data:', error);
        }
    }

    async function handleCreateShifts() {
        if (formData.selectedEmployees.length === 0) {
            alert('Please select at least one employee');
            return;
        }
        if (!formData.project) {
            alert('Please select a project');
            return;
        }
        if (!formData.scheduled_start_datetime) {
            alert('Please set a start date/time');
            return;
        }

        setSaving(true);
        try {
            const startDate = formData.scheduled_start_datetime.split('T')[0];
            const startTime = formData.scheduled_start_datetime.split('T')[1];
            const endTime = formData.scheduled_end_datetime.split('T')[1];

            const results = await Promise.all(
                formData.selectedEmployees.map(async (employeeId) => {
                    const payload = {
                        customer: formData.customer,
                        project: formData.project,
                        supervisor: formData.supervisor,
                        service: formData.service,
                        employee: employeeId,
                        scheduled_date: startDate,
                        scheduled_start_time: startTime,
                        scheduled_end_time: endTime,
                        location_notes: formData.location_notes,
                        supervisor_phone: formData.supervisor_phone,
                        supervisor_email: formData.supervisor_email,
                        special_instructions: formData.special_instructions,
                    };

                    return await fetch(`${API_URL}/worklogs/shifts/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                        },
                        body: JSON.stringify(payload),
                    });
                })
            );

            const allOk = results.every(r => r.ok);
            if (allOk) {
                router.push('/dashboard/shifts');
            } else {
                const errors = await Promise.all(results.filter(r => !r.ok).map(r => r.json()));
                alert(`Some shifts failed: ${JSON.stringify(errors)}`);
            }
        } catch (error) {
            console.error('Failed to create shifts:', error);
            alert('Failed to create shifts');
        }
        setSaving(false);
    }

    // Get supervisor contacts for dropdowns
    const selectedSupervisor = supervisors.find(s => s.id === formData.supervisor);
    const phoneContacts = selectedSupervisor?.contacts?.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile') || [];
    const emailContacts = selectedSupervisor?.contacts?.filter(c => c.contact_type === 'email') || [];

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        fontSize: '14px',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        outline: 'none',
        backgroundColor: '#FAFAFA',
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600 as const,
        color: '#374151',
        marginBottom: '8px',
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <button
                        onClick={() => router.push('/dashboard/shifts')}
                        style={{
                            padding: '10px',
                            backgroundColor: '#F3F4F6',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            <Calendar size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                            Schedule New Shift
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                            Create shifts for one or multiple employees
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Row 1: Customer & Project */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>
                                    <Building2 size={14} style={{ marginRight: '6px' }} />
                                    Customer *
                                </label>
                                <select
                                    value={formData.customer}
                                    onChange={(e) => {
                                        setFormData({ ...formData, customer: e.target.value, project: '', supervisor: '', service: '', supervisor_phone: '', supervisor_email: '' });
                                        setSupervisors([]);
                                        setServices([]);
                                    }}
                                    style={inputStyle}
                                >
                                    <option value="">Select customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Project *</label>
                                <select
                                    value={formData.project}
                                    onChange={(e) => {
                                        setFormData({ ...formData, project: e.target.value, supervisor: '', service: '', supervisor_phone: '', supervisor_email: '' });
                                        loadProjectData(e.target.value, formData.customer);
                                    }}
                                    disabled={!formData.customer}
                                    style={{ ...inputStyle, opacity: formData.customer ? 1 : 0.6, cursor: formData.customer ? 'pointer' : 'not-allowed' }}
                                >
                                    <option value="">Select project...</option>
                                    {projects
                                        .filter(p => String(p.customer) === String(formData.customer))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Supervisor & Service */}
                        {formData.project && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Supervisor (Rayon)</label>
                                    <select
                                        value={formData.supervisor}
                                        onChange={(e) => {
                                            setFormData({ ...formData, supervisor: e.target.value, supervisor_phone: '', supervisor_email: '' });
                                        }}
                                        style={inputStyle}
                                    >
                                        <option value="">Select supervisor...</option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.company_name || s.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>Service Type</label>
                                    <select
                                        value={formData.service}
                                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                        style={inputStyle}
                                    >
                                        <option value="">Select service...</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Supervisor Contact Info - Only when supervisor selected */}
                        {formData.supervisor && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}><Phone size={14} style={{ marginRight: '6px' }} />Supervisor Phone</label>
                                    {phoneContacts.length > 0 ? (
                                        <select
                                            value={formData.supervisor_phone}
                                            onChange={(e) => setFormData({ ...formData, supervisor_phone: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="">Select phone...</option>
                                            {phoneContacts.map((c, idx) => (
                                                <option key={idx} value={c.value}>{c.value}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, padding: '12px 0' }}>No phone numbers available</p>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}><Mail size={14} style={{ marginRight: '6px' }} />Supervisor Email</label>
                                    {emailContacts.length > 0 ? (
                                        <select
                                            value={formData.supervisor_email}
                                            onChange={(e) => setFormData({ ...formData, supervisor_email: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="">Select email...</option>
                                            {emailContacts.map((c, idx) => (
                                                <option key={idx} value={c.value}>{c.value}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, padding: '12px 0' }}>No email addresses available</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Employee Multi-Select Section (Work Logs Style) */}
                        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>
                                    <Users size={14} style={{ marginRight: '6px' }} />
                                    Employees *
                                    {formData.selectedEmployees.length > 0 && (
                                        <span style={{ color: '#3B82F6', fontWeight: 500, marginLeft: '8px' }}>
                                            ({formData.selectedEmployees.length} selected)
                                        </span>
                                    )}
                                </label>
                                {formData.selectedEmployees.length > 0 && (
                                    <button
                                        onClick={() => setFormData({ ...formData, selectedEmployees: [] })}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            color: '#DC2626',
                                            backgroundColor: '#FEE2E2',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {/* Selected Employees as Chips */}
                            {formData.selectedEmployees.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                    {formData.selectedEmployees.map(empId => {
                                        const emp = employees.find(e => e.id === empId);
                                        return emp ? (
                                            <div key={empId} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 14px',
                                                backgroundColor: '#EFF6FF',
                                                border: '1px solid #BFDBFE',
                                                borderRadius: '20px',
                                                fontSize: '13px',
                                                color: '#1D4ED8',
                                                fontWeight: 500,
                                            }}>
                                                {emp.full_name}
                                                <button
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        selectedEmployees: formData.selectedEmployees.filter(id => id !== empId)
                                                    })}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '0',
                                                        display: 'flex',
                                                        color: '#3B82F6',
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

                            {/* Searchable Employee Dropdown */}
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search and select employees..."
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                    onFocus={() => setShowEmployeeDropdown(true)}
                                    style={inputStyle}
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
                                        maxHeight: '250px',
                                        overflowY: 'auto',
                                        zIndex: 100,
                                        marginTop: '4px',
                                    }}>
                                        {employees
                                            .filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                            .map(emp => {
                                                const isSelected = formData.selectedEmployees.includes(emp.id);
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => {
                                                            if (!isSelected) {
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedEmployees: [...formData.selectedEmployees, emp.id]
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    selectedEmployees: formData.selectedEmployees.filter(id => id !== emp.id)
                                                                });
                                                            }
                                                            setEmployeeSearch('');
                                                        }}
                                                        style={{
                                                            padding: '12px 16px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                                            borderBottom: '1px solid #F3F4F6',
                                                        }}
                                                    >
                                                        <span>{emp.full_name}</span>
                                                        {isSelected && (
                                                            <Check size={16} color="#3B82F6" strokeWidth={3} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        {employees.filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                            <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center' }}>
                                                No employees found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Click outside to close dropdown */}
                            {showEmployeeDropdown && (
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                                    onClick={() => setShowEmployeeDropdown(false)}
                                />
                            )}
                        </div>

                        {/* Date/Time Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}><Clock size={14} style={{ marginRight: '6px' }} />Start Date/Time *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_start_datetime}
                                    onChange={(e) => setFormData({ ...formData, scheduled_start_datetime: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}><Clock size={14} style={{ marginRight: '6px' }} />End Date/Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_end_datetime}
                                    onChange={(e) => setFormData({ ...formData, scheduled_end_datetime: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Location Notes */}
                        <div>
                            <label style={labelStyle}><MapPin size={14} style={{ marginRight: '6px' }} />Location / Address Notes</label>
                            <textarea
                                value={formData.location_notes}
                                onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                                placeholder="Enter address, building, floor, etc..."
                                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>

                        {/* Special Instructions */}
                        <div>
                            <label style={labelStyle}><AlertCircle size={14} style={{ marginRight: '6px' }} />Special Instructions</label>
                            <textarea
                                value={formData.special_instructions}
                                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                                placeholder="Any special instructions for the employees..."
                                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                            <button
                                onClick={() => router.push('/dashboard/shifts')}
                                style={{
                                    padding: '14px 28px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateShifts}
                                disabled={saving || formData.selectedEmployees.length === 0}
                                style={{
                                    padding: '14px 28px',
                                    backgroundColor: '#1E3A5F',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving || formData.selectedEmployees.length === 0 ? 0.7 : 1,
                                }}
                            >
                                {saving ? 'Creating...' : `Create ${formData.selectedEmployees.length || ''} Shift${formData.selectedEmployees.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
