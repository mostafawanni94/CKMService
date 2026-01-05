'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';
import { Calendar, Clock, MapPin, User, Building2, Phone, Mail, Plus, Check, X, AlertCircle, Search, Filter } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Shift {
    id: string;
    employee: string;
    employee_name: string;
    project: string;
    project_name: string;
    customer_name: string;
    supervisor_name: string;
    service_name: string;
    scheduled_date: string;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    location_notes: string;
    supervisor_phone: string;
    supervisor_email: string;
    special_instructions: string;
    status: string;
    status_display: string;
    actual_start_time: string | null;
    actual_end_time: string | null;
    break_start_time: string | null;
    break_end_time: string | null;
    employee_notes: string;
    rejection_reason: string;
    is_today: boolean;
    can_fill_data: boolean;
}

interface Employee {
    id: string;
    full_name: string;
}

interface Project {
    id: string;
    name: string;
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

export default function ShiftsPage() {
    const router = useRouter();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [pendingShifts, setPendingShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

    // Create modal
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [customers, setCustomers] = useState<{ id: string, company_name: string }[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    // Night shift support with datetime fields
    const [formData, setFormData] = useState({
        customer: '',
        project: '',
        supervisor: '',
        service: '',
        employees: [] as string[],  // Changed to array for multi-select
        scheduled_start_datetime: new Date().toISOString().slice(0, 16),
        scheduled_end_datetime: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
        location_notes: '',
        supervisor_phone: '',
        supervisor_email: '',
        special_instructions: '',
    });

    // Search
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadShifts();
        loadPendingShifts();
        loadEmployees();
        loadProjects();
        loadCustomers();
    }, []);

    async function loadShifts() {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/worklogs/shifts/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setShifts(data.results || data);
            }
        } catch (error) {
            console.error('Failed to load shifts:', error);
        }
        setLoading(false);
    }

    async function loadPendingShifts() {
        try {
            const response = await fetch(`${API_URL}/worklogs/shifts/pending/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setPendingShifts(data);
            }
        } catch (error) {
            console.error('Failed to load pending shifts:', error);
        }
    }

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
                // Map supervisors_list to match expected format
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

    async function handleCreateShift() {
        if (formData.employees.length === 0 || !formData.project || !formData.scheduled_start_datetime) {
            alert('Please fill in Customer, Project, at least one Employee, and Start Date/Time');
            return;
        }

        setSaving(true);
        try {
            // Convert datetime to date + time for backend
            const startDate = formData.scheduled_start_datetime.split('T')[0];
            const startTime = formData.scheduled_start_datetime.split('T')[1];
            const endTime = formData.scheduled_end_datetime.split('T')[1];

            // Create a shift for each selected employee
            const results = await Promise.all(
                formData.employees.map(async (employeeId) => {
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

                    const response = await fetch(`${API_URL}/worklogs/shifts/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                        },
                        body: JSON.stringify(payload),
                    });
                    return response;
                })
            );

            const allOk = results.every(r => r.ok);
            if (allOk) {
                setShowModal(false);
                loadShifts();
                resetForm();
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

    async function handleApprove(shiftId: string) {
        try {
            const response = await fetch(`${API_URL}/worklogs/shifts/${shiftId}/approve/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                loadShifts();
                loadPendingShifts();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to approve');
            }
        } catch (error) {
            console.error('Failed to approve:', error);
        }
    }

    async function handleReject(shiftId: string) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            const response = await fetch(`${API_URL}/worklogs/shifts/${shiftId}/reject/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({ reason }),
            });
            if (response.ok) {
                loadShifts();
                loadPendingShifts();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to reject');
            }
        } catch (error) {
            console.error('Failed to reject:', error);
        }
    }

    function resetForm() {
        setFormData({
            customer: '',
            project: '',
            supervisor: '',
            service: '',
            employees: [],
            scheduled_start_datetime: new Date().toISOString().slice(0, 16),
            scheduled_end_datetime: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
            location_notes: '',
            supervisor_phone: '',
            supervisor_email: '',
            special_instructions: '',
        });
        setEmployeeSearch('');
        setSupervisors([]);
        setServices([]);
    }

    function openModal() {
        resetForm();
        setShowModal(true);
    }

    const displayShifts = activeTab === 'pending' ? pendingShifts : shifts;
    const filteredShifts = displayShifts.filter(s =>
        s.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusColors: Record<string, { bg: string, text: string }> = {
        scheduled: { bg: '#DBEAFE', text: '#1E40AF' },
        acknowledged: { bg: '#E0E7FF', text: '#3730A3' },
        in_progress: { bg: '#FEF3C7', text: '#92400E' },
        submitted: { bg: '#FED7AA', text: '#C2410C' },
        approved: { bg: '#D1FAE5', text: '#065F46' },
        rejected: { bg: '#FEE2E2', text: '#991B1B' },
        missed: { bg: '#F3F4F6', text: '#6B7280' },
        cancelled: { bg: '#F3F4F6', text: '#6B7280' },
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        fontSize: '14px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        outline: 'none',
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: 600 as const,
        color: '#374151',
        marginBottom: '6px',
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '32px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>Shift Scheduling</h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Schedule and manage employee shifts</p>
                    </div>
                    <Button onClick={() => router.push('/dashboard/shifts/new')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Schedule Shift
                    </Button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <button
                        onClick={() => setActiveTab('all')}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'all' ? '#1E3A5F' : '#F3F4F6',
                            color: activeTab === 'all' ? 'white' : '#374151',
                        }}
                    >
                        All Shifts ({shifts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'pending' ? '#F59E0B' : '#F3F4F6',
                            color: activeTab === 'pending' ? 'white' : '#374151',
                        }}
                    >
                        Pending Approval ({pendingShifts.length})
                    </button>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ position: 'relative', maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            placeholder="Search by employee, project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                {/* Shifts Table */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB' }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Employee</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Project</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Time</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Actual Time</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading...</td></tr>
                            ) : filteredShifts.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>No shifts found</td></tr>
                            ) : (
                                filteredShifts.map(shift => (
                                    <tr key={shift.id} style={{ borderTop: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontWeight: 600, color: '#111827' }}>{shift.scheduled_date}</div>
                                            {shift.is_today && <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>TODAY</span>}
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#374151' }}>{shift.employee_name}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ color: '#374151' }}>{shift.project_name}</div>
                                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{shift.customer_name}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '13px' }}>
                                            {shift.scheduled_start_time && shift.scheduled_end_time
                                                ? `${shift.scheduled_start_time.slice(0, 5)} - ${shift.scheduled_end_time.slice(0, 5)}`
                                                : '-'
                                            }
                                        </td>
                                        <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                                            {shift.actual_start_time && shift.actual_end_time
                                                ? `${shift.actual_start_time.slice(0, 5)} - ${shift.actual_end_time.slice(0, 5)}`
                                                : <span style={{ color: '#9CA3AF' }}>Not filled</span>
                                            }
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                backgroundColor: statusColors[shift.status]?.bg || '#F3F4F6',
                                                color: statusColors[shift.status]?.text || '#6B7280',
                                            }}>
                                                {shift.status_display}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            {shift.status === 'submitted' && (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleApprove(shift.id)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <Check size={14} /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(shift.id)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        <X size={14} /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Create Shift Modal */}
                {showModal && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: 50,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onClick={() => setShowModal(false)}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                width: '100%',
                                maxWidth: '600px',
                                maxHeight: '90vh',
                                overflow: 'auto',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
                                <Calendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Schedule New Shift
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* 1. Customer (select first) */}
                                <div>
                                    <label style={labelStyle}>
                                        <Building2 size={14} style={{ marginRight: '4px' }} />
                                        Customer *
                                    </label>
                                    <select
                                        value={formData.customer}
                                        onChange={(e) => {
                                            setFormData({ ...formData, customer: e.target.value, project: '', supervisor: '', service: '', employees: [] });
                                            setEmployeeSearch('');
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

                                {/* Project (filtered by customer) */}
                                {formData.customer && (
                                    <div>
                                        <label style={labelStyle}>Project *</label>
                                        <select
                                            value={formData.project}
                                            onChange={(e) => {
                                                setFormData({ ...formData, project: e.target.value, supervisor: '', service: '' });
                                                loadProjectData(e.target.value, formData.customer);
                                            }}
                                            style={inputStyle}
                                        >
                                            <option value="">Select project...</option>
                                            {(projects as any[])
                                                .filter((p: any) => String(p.customer) === String(formData.customer))
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                )}

                                {/* Supervisor (when project selected) */}
                                {formData.project && (
                                    <div>
                                        <label style={labelStyle}>Supervisor (Rayon)</label>
                                        <select
                                            value={formData.supervisor}
                                            onChange={(e) => {
                                                const sup = supervisors.find(s => s.id === e.target.value);
                                                const phone = sup?.contacts?.find(c => c.contact_type === 'phone')?.value || '';
                                                const email = sup?.contacts?.find(c => c.contact_type === 'email')?.value || '';
                                                setFormData({
                                                    ...formData,
                                                    supervisor: e.target.value,
                                                    supervisor_phone: phone,
                                                    supervisor_email: email
                                                });
                                            }}
                                            style={inputStyle}
                                        >
                                            <option value="">Select supervisor...</option>
                                            {supervisors.map(s => (
                                                <option key={s.id} value={s.id}>{s.company_name || s.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Employee Multi-Select */}
                                <div>
                                    <label style={labelStyle}>
                                        <User size={14} style={{ marginRight: '4px' }} />
                                        Employees * ({formData.employees.length} selected)
                                    </label>
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        placeholder="Search employees..."
                                        style={{ ...inputStyle, marginBottom: '8px' }}
                                    />
                                    <div style={{
                                        maxHeight: '200px', overflowY: 'auto',
                                        border: '1px solid #E5E7EB', borderRadius: '8px',
                                        backgroundColor: '#F9FAFB',
                                    }}>
                                        {employees
                                            .filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()))
                                            .map(emp => {
                                                const isSelected = formData.employees.includes(emp.id);
                                                return (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setFormData({
                                                                    ...formData,
                                                                    employees: formData.employees.filter(id => id !== emp.id)
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    employees: [...formData.employees, emp.id]
                                                                });
                                                            }
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            padding: '10px 14px', cursor: 'pointer',
                                                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                                                            borderBottom: '1px solid #E5E7EB',
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '20px', height: '20px',
                                                            borderRadius: '4px',
                                                            border: isSelected ? 'none' : '2px solid #D1D5DB',
                                                            backgroundColor: isSelected ? '#1E3A5F' : 'white',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            {isSelected && <Check size={14} color="white" />}
                                                        </div>
                                                        <span style={{ fontSize: '14px', color: '#374151' }}>{emp.full_name}</span>
                                                    </div>
                                                );
                                            })}
                                        {employees.filter(emp => emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                            <div style={{ padding: '14px', color: '#9CA3AF', textAlign: 'center' }}>
                                                No employees found
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Service Type (when project selected) */}
                                {formData.project && (
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
                                )}

                                {/* Start & End DateTime (for night shifts) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}><Clock size={14} style={{ marginRight: '4px' }} />Start Date/Time *</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.scheduled_start_datetime}
                                            onChange={(e) => setFormData({ ...formData, scheduled_start_datetime: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}><Clock size={14} style={{ marginRight: '4px' }} />End Date/Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.scheduled_end_datetime}
                                            onChange={(e) => setFormData({ ...formData, scheduled_end_datetime: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Supervisor Contact Info - only show when supervisor selected */}
                                {formData.supervisor && (() => {
                                    const selectedSupervisor = supervisors.find(s => s.id === formData.supervisor);
                                    const phoneContacts = selectedSupervisor?.contacts?.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile') || [];
                                    const emailContacts = selectedSupervisor?.contacts?.filter(c => c.contact_type === 'email') || [];

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={labelStyle}><Phone size={14} style={{ marginRight: '4px' }} />Supervisor Phone</label>
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
                                                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, padding: '10px 0' }}>No phone numbers available</p>
                                                )}
                                            </div>
                                            <div>
                                                <label style={labelStyle}><Mail size={14} style={{ marginRight: '4px' }} />Supervisor Email</label>
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
                                                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0, padding: '10px 0' }}>No email addresses available</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Location Notes */}
                                <div>
                                    <label style={labelStyle}><MapPin size={14} style={{ marginRight: '4px' }} />Location / Address Notes</label>
                                    <textarea
                                        value={formData.location_notes}
                                        onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                                        placeholder="Enter address, building, floor, etc..."
                                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>

                                {/* Special Instructions */}
                                <div>
                                    <label style={labelStyle}><AlertCircle size={14} style={{ marginRight: '4px' }} />Special Instructions</label>
                                    <textarea
                                        value={formData.special_instructions}
                                        onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                                        placeholder="Any special instructions for the employee..."
                                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '12px 24px', backgroundColor: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateShift}
                                    disabled={saving}
                                    style={{ padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                                >
                                    {saving ? 'Creating...' : 'Create Shift'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
