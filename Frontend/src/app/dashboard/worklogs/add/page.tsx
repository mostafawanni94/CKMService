'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { ArrowLeft, Plus, Gift, Trash2, Coffee, User, Building2, Briefcase, MapPin, Clock, FileText, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface AllowanceType {
    id: number;
    name: string;
    code: string;
    base_price: string;
}

interface WorkLogAllowance {
    allowance_type: number | null;
    custom_allowance_name: string;
    hours: string;
    notes: string;
    start_time?: string;
    end_time?: string;
}

interface Employee {
    id: string;
    full_name: string;
}

interface Customer {
    id: string;
    company_name: string;
}

interface Project {
    id: string;
    name: string;
    customer: string;
    location?: string;
    address?: string;
}

interface Supervisor {
    id: string;
    full_name: string;
    company_name?: string;
}

interface Service {
    id: string;
    name: string;
}

export default function AddWorkLogPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [employee, setEmployee] = useState('');
    const [customer, setCustomer] = useState('');
    const [project, setProject] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [service, setService] = useState('');
    const [location, setLocation] = useState('');
    const [startDatetime, setStartDatetime] = useState(new Date().toISOString().slice(0, 16));
    const [endDatetime, setEndDatetime] = useState(new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([{ start: '12:00', end: '12:30' }]);
    const [allowances, setAllowances] = useState<WorkLogAllowance[]>([]);

    // Loading states
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingSupervisors, setLoadingSupervisors] = useState(false);
    const [loadingServices, setLoadingServices] = useState(false);

    // Dropdown options
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);

    // Filtered options
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

    // Search states
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = { 'Authorization': `Bearer ${token}` };

    useEffect(() => {
        loadInitialData();
    }, []);

    // When customer changes, filter projects
    useEffect(() => {
        if (customer) {
            const filtered = projects.filter(p => String(p.customer) === String(customer));
            setFilteredProjects(filtered);
        } else {
            setFilteredProjects([]);
        }
        // Reset dependent fields
        setProject('');
        setSupervisor('');
        setService('');
        setLocation('');
        setSupervisors([]);
        setServices([]);
    }, [customer, projects]);

    // When project changes, load supervisors & services and auto-fill location
    useEffect(() => {
        if (project) {
            const selectedProject = projects.find(p => String(p.id) === String(project));
            if (selectedProject) {
                // Auto-fill location from project
                setLocation(selectedProject.location || selectedProject.address || '');

                // Load supervisors from project and services from customer
                loadProjectDetails(String(selectedProject.id), String(selectedProject.customer));
            }
        } else {
            setSupervisors([]);
            setServices([]);
            setLocation('');
        }
        setSupervisor('');
        setService('');
    }, [project]);

    async function loadInitialData() {
        setLoadingEmployees(true);
        setLoadingCustomers(true);

        try {
            const [empRes, custRes, projRes, allowRes] = await Promise.all([
                fetch(`${API_URL}/employees/profiles/`, { headers }),
                fetch(`${API_URL}/customers/customers/`, { headers }),
                fetch(`${API_URL}/projects/projects/`, { headers }),
                fetch(`${API_URL}/employees/allowance-types/`, { headers }),
            ]);

            if (empRes.ok) {
                const data = await empRes.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setEmployees(list.map((e: any) => ({
                    id: e.id,
                    full_name: e.full_name || `${e.first_name} ${e.last_name}`,
                })));
            }

            if (custRes.ok) {
                const data = await custRes.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setCustomers(list.map((c: any) => ({
                    id: c.id,
                    company_name: c.company_name || c.name,
                })));
            }

            if (projRes.ok) {
                const data = await projRes.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setProjects(list);
            }

            if (allowRes.ok) {
                const data = await allowRes.json();
                setAllowanceTypes(Array.isArray(data) ? data : (data.results || []));
            }
        } catch (e) {
            console.error('Failed to load initial data:', e);
            setErrors({ general: 'Failed to load data. Please refresh the page.' });
        } finally {
            setLoadingEmployees(false);
            setLoadingCustomers(false);
        }
    }

    async function loadProjectDetails(projectId: string, customerId: string) {
        if (!projectId) return;

        setLoadingSupervisors(true);
        setLoadingServices(true);

        try {
            // Load supervisors from project detail API
            const projRes = await fetch(`${API_URL}/projects/projects/${projectId}/`, { headers });
            if (projRes.ok) {
                const projData = await projRes.json();
                const sups = (projData.supervisors_list || []).map((s: any) => ({
                    id: s.id,
                    full_name: s.company_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
                }));
                setSupervisors(sups);
            }

            // Load services from customer (from service_rates)
            if (customerId) {
                const custRes = await fetch(`${API_URL}/customers/customers/${customerId}/`, { headers });
                if (custRes.ok) {
                    const customerData = await custRes.json();
                    // Customer API returns service_rates with service info
                    if (customerData.service_rates && customerData.service_rates.length > 0) {
                        setServices(customerData.service_rates.map((sr: any) => ({
                            id: sr.service,
                            name: sr.service_name,
                        })));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load project details:', e);
        } finally {
            setLoadingSupervisors(false);
            setLoadingServices(false);
        }
    }

    // Break functions
    function addBreak() {
        setBreaks([...breaks, { start: '', end: '' }]);
    }

    function removeBreak(index: number) {
        setBreaks(breaks.filter((_, i) => i !== index));
    }

    function updateBreak(index: number, field: 'start' | 'end', value: string) {
        const updated = [...breaks];
        updated[index][field] = value;
        setBreaks(updated);
    }

    // Allowance functions
    function addAllowance() {
        setAllowances([...allowances, {
            allowance_type: null,
            custom_allowance_name: '',
            hours: '',
            notes: '',
            start_time: '',
            end_time: '',
        }]);
    }

    function updateAllowance(index: number, field: keyof WorkLogAllowance, value: string | number | null) {
        const updated = [...allowances];
        (updated[index] as any)[field] = value;
        if (field === 'allowance_type' && value !== null) {
            updated[index].custom_allowance_name = '';
        }
        setAllowances(updated);
    }

    function removeAllowance(index: number) {
        setAllowances(allowances.filter((_, i) => i !== index));
    }

    function validateForm(): boolean {
        const newErrors: Record<string, string> = {};

        if (!employee) newErrors.employee = 'Employee is required';
        if (!customer) newErrors.customer = 'Customer is required';
        if (!project) newErrors.project = 'Project is required';
        if (!startDatetime) newErrors.startDatetime = 'Start date/time is required';
        if (!endDatetime) newErrors.endDatetime = 'End date/time is required';

        if (startDatetime && endDatetime && new Date(startDatetime) >= new Date(endDatetime)) {
            newErrors.endDatetime = 'End time must be after start time';
        }

        const validBreaks = breaks.filter(b => b.start && b.end);
        if (validBreaks.length === 0) {
            newErrors.breaks = 'At least one break is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit() {
        if (!validateForm()) return;

        setSaving(true);
        setErrors({});

        try {
            const payload: any = {
                project: project,
                employee: employee,
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                breaks: breaks.filter(b => b.start && b.end).map(b => ({
                    start: b.start + ':00',
                    end: b.end + ':00',
                })),
                location_override: location,
                notes: notes,
            };

            if (supervisor) payload.supervisor = supervisor;
            if (service) payload.service = service;

            if (allowances.length > 0) {
                payload.allowances = allowances.filter(a => a.allowance_type || a.custom_allowance_name).map(a => ({
                    allowance_type: a.allowance_type || null,  // Send null instead of empty string for custom
                    custom_allowance_name: a.custom_allowance_name || '',
                    hours: parseFloat(a.hours) || 0,
                    notes: a.notes || '',
                    start_time: a.start_time ? a.start_time + ':00' : null,  // Convert HH:MM to HH:MM:SS
                    end_time: a.end_time ? a.end_time + ':00' : null,
                }));
            }

            const response = await fetch(`${API_URL}/worklogs/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                if (typeof data === 'object') {
                    const fieldErrors: Record<string, string> = {};
                    Object.entries(data).forEach(([key, value]) => {
                        fieldErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
                    });
                    setErrors(fieldErrors);
                } else {
                    setErrors({ general: data.detail || 'Failed to create work log' });
                }
                return;
            }

            router.push('/dashboard/worklogs');
        } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'An error occurred' });
        } finally {
            setSaving(false);
        }
    }

    const selectedEmployee = employees.find(e => e.id === employee);

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
                            onClick={() => router.push('/dashboard/worklogs')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: '14px', marginBottom: '16px'
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Work Logs
                        </button>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0 }}>
                            Add Work Log
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
                                    Assignment Details
                                </h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0' }}>
                                    Select employee, customer, project and supervisor
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {/* Employee */}
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>
                                        Employee <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
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
                                        placeholder={loadingEmployees ? 'Loading...' : 'Search employee...'}
                                        style={{ ...inputStyle, borderColor: errors.employee ? '#EF4444' : '#E5E7EB' }}
                                    />
                                    {errors.employee && <span style={errorStyle}>{errors.employee}</span>}
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
                                                    No employees found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Customer */}
                                <div>
                                    <label style={labelStyle}>
                                        Customer <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <select
                                        value={customer}
                                        onChange={(e) => setCustomer(e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.customer ? '#EF4444' : '#E5E7EB' }}
                                        disabled={loadingCustomers}
                                    >
                                        <option value="">{loadingCustomers ? 'Loading...' : 'Select customer...'}</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.company_name}</option>
                                        ))}
                                    </select>
                                    {errors.customer && <span style={errorStyle}>{errors.customer}</span>}
                                </div>

                                {/* Project */}
                                <div>
                                    <label style={labelStyle}>
                                        Project <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <select
                                        value={project}
                                        onChange={(e) => setProject(e.target.value)}
                                        style={{ ...inputStyle, borderColor: errors.project ? '#EF4444' : '#E5E7EB' }}
                                        disabled={!customer || loadingProjects}
                                    >
                                        <option value="">
                                            {!customer ? 'Select customer first...' : loadingProjects ? 'Loading...' : 'Select project...'}
                                        </option>
                                        {filteredProjects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {errors.project && <span style={errorStyle}>{errors.project}</span>}
                                </div>

                                {/* Supervisor */}
                                <div>
                                    <label style={labelStyle}>Supervisor</label>
                                    <select
                                        value={supervisor}
                                        onChange={(e) => setSupervisor(e.target.value)}
                                        style={inputStyle}
                                        disabled={!project || loadingSupervisors}
                                    >
                                        <option value="">
                                            {!project ? 'Select project first...' : loadingSupervisors ? 'Loading...' : 'Select supervisor...'}
                                        </option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Service */}
                                <div>
                                    <label style={labelStyle}>Service Type</label>
                                    <select
                                        value={service}
                                        onChange={(e) => setService(e.target.value)}
                                        style={inputStyle}
                                        disabled={!project || loadingServices}
                                    >
                                        <option value="">
                                            {!project ? 'Select project first...' : loadingServices ? 'Loading...' : 'Select service...'}
                                        </option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Location */}
                                <div>
                                    <label style={labelStyle}>
                                        <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder={!project ? 'Select project to auto-fill...' : 'Work location'}
                                        style={inputStyle}
                                        disabled={!project}
                                    />
                                    {project && !location && (
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
                                    Date & Time
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
                                        Start Date/Time <span style={{ color: '#EF4444' }}>*</span>
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
                                        End Date/Time <span style={{ color: '#EF4444' }}>*</span>
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
                                            Breaks <span style={{ color: '#EF4444' }}>*</span>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addBreak}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 14px', backgroundColor: '#D97706', color: 'white',
                                            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                                        }}
                                    >
                                        <Plus size={14} />
                                        Add Break
                                    </button>
                                </div>

                                {errors.breaks && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={errorStyle}>{errors.breaks}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {breaks.map((brk, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ ...labelStyle, fontSize: '12px', color: '#92400E' }}>Start</label>
                                                <input
                                                    type="time"
                                                    value={brk.start}
                                                    onChange={(e) => updateBreak(index, 'start', e.target.value)}
                                                    style={{ ...inputStyle, padding: '10px 12px', backgroundColor: 'white' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ ...labelStyle, fontSize: '12px', color: '#92400E' }}>End</label>
                                                <input
                                                    type="time"
                                                    value={brk.end}
                                                    onChange={(e) => updateBreak(index, 'end', e.target.value)}
                                                    style={{ ...inputStyle, padding: '10px 12px', backgroundColor: 'white' }}
                                                />
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
                                    ))}
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
                                    Notes
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
                                        Allowances (Toeslag)
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
                                    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Plus size={16} />
                                Add Allowance
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
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>Allowance Type</label>
                                                    <select
                                                        value={allowance.allowance_type || ''}
                                                        onChange={(e) => updateAllowance(index, 'allowance_type', e.target.value ? parseInt(e.target.value) : null)}
                                                        style={inputStyle}
                                                    >
                                                        <option value="">Custom / Other</option>
                                                        {allowanceTypes.map(at => (
                                                            <option key={at.id} value={at.id}>
                                                                {at.name} (€{at.base_price}/hr)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>Hours</label>
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
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>From Time</label>
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
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>To Time</label>
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
                                                    <label style={{ ...labelStyle, fontSize: '12px' }}>Custom Allowance Name</label>
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
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                padding: '14px 36px', backgroundColor: '#059669', color: 'white',
                                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1,
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
    color: '#374151',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
};

const errorStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: '#EF4444',
    marginTop: '4px',
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
    marginTop: '4px',
};

const dropdownItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    borderBottom: '1px solid #F3F4F6',
};
