/**
 * useWorklogCreate — ViewModel for the page of the same name.
 *
 * Extracted from the page, which held its state, its fetching and its handlers
 * inline alongside the markup. The page composes; this decides.
 */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { apiDownload, apiFetch, apiGet, apiGetAll, apiMutate } from '@/hooks/useApi';

export interface AllowanceType {
    id: number;
    name: string;
    code: string;
    base_price: string;
}

export interface WorkLogAllowance {
    allowance_type: number | null;
    custom_allowance_name: string;
    hours: string;
    notes: string;
    start_time?: string;
    end_time?: string;
}

export interface Employee {
    id: string;
    full_name: string;
}

export interface Customer {
    id: string;
    company_name: string;
}

export interface Project {
    id: string;
    name: string;
    customer: string;
    location?: string;
    location_address?: string;
    location_postcode?: string;
    location_city?: string;
}

export interface Supervisor {
    id: string;
    full_name: string;
    company_name?: string;
}

export interface Service {
    id: string;
    name: string;
}


export function useWorklogCreate() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/dashboard/worklogs';
    const dateParam = searchParams.get('date');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state - Multi-employee selection
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [customer, setCustomer] = useState('');
    const [project, setProject] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [service, setService] = useState('');
    const [location, setLocation] = useState('');
    const [originalLocation, setOriginalLocation] = useState('');
    const [startDatetime, setStartDatetime] = useState(() => {
        if (dateParam) return `${dateParam}T08:00`;
        return new Date().toISOString().slice(0, 16);
    });
    const [endDatetime, setEndDatetime] = useState(() => {
        if (dateParam) return `${dateParam}T17:00`;
        return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16);
    });
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

    // Search states for all dropdowns
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');

    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);


    // Toggle employee selection (add/remove from array)
    const toggleEmployee = (empId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(empId)
                ? prev.filter(id => id !== empId)
                : [...prev, empId]
        );
    };

    // Get employee name by ID helper
    const getEmployeeName = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        return emp?.full_name || 'Employee';
    };

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
        // Reset dependent fields and their search values
        setProject('');
        setProjectSearch('');
        setSupervisor('');
        setSupervisorSearch('');
        setService('');
        setServiceSearch('');
        setLocation('');
        setSupervisors([]);
        setServices([]);
    }, [customer, projects]);

    // When project changes, load supervisors & services and auto-fill location
    useEffect(() => {
        if (project) {
            const selectedProject = projects.find(p => String(p.id) === String(project));
            if (selectedProject) {
                // Auto-fill location from project - build full address
                const addressParts = [
                    selectedProject.location_address,
                    selectedProject.location_postcode,
                    selectedProject.location_city
                ].filter(Boolean);

                // Use full address or fallback to location field
                const projectLocation = addressParts.length > 0
                    ? addressParts.join(', ')
                    : (selectedProject.location || '');
                setLocation(projectLocation);
                setOriginalLocation(projectLocation);

                // Load supervisors from project and services from customer
                loadProjectDetails(String(selectedProject.id), String(selectedProject.customer));
            }
        } else {
            setSupervisors([]);
            setServices([]);
            setLocation('');
            setOriginalLocation('');
        }
        // Reset dependent fields and their search values
        setSupervisor('');
        setSupervisorSearch('');
        setService('');
        setServiceSearch('');
    }, [project]);

    async function loadInitialData() {
        setLoadingEmployees(true);
        setLoadingCustomers(true);

        try {
            const [empRes, custRes, projRes, allowRes] = await Promise.all([
                apiFetch(`/employees/profiles/`),
                apiFetch(`/customers/customers/`),
                apiFetch(`/projects/projects/`),
                apiFetch(`/employees/allowance-types/`),
            ]);

            if (empRes.ok) {
                const data = await empRes.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setEmployees(list.map((e: any) => ({
                    id: e.id,
                    full_name: e.full_name || `${e.first_name} ${e.last_name}`
                })));
            }

            if (custRes.ok) {
                const data = await custRes.json();
                const list = Array.isArray(data) ? data : (data.results || []);
                setCustomers(list.map((c: any) => ({
                    id: c.id,
                    company_name: c.company_name || c.name
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
            const projRes = await apiFetch(`/projects/projects/${projectId}/`);
            if (projRes.ok) {
                const projData = await projRes.json();
                const sups = (projData.supervisors_list || []).map((s: any) => ({
                    id: s.id,
                    full_name: s.company_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown'
                }));
                setSupervisors(sups);
            }

            // Load services from customer (from service_rates)
            if (customerId) {
                const custRes = await apiFetch(`/customers/customers/${customerId}/`);
                if (custRes.ok) {
                    const customerData = await custRes.json();
                    // Customer API returns service_rates with service info
                    if (customerData.service_rates && customerData.service_rates.length > 0) {
                        setServices(customerData.service_rates.map((sr: any) => ({
                            id: sr.service,
                            name: sr.service_name
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

        // Validate break is within work hours
        validateBreakTime(updated[index], index);
    }

    // Helper function to validate break times are within work hours (real-time feedback)
    function validateBreakTime(brk: { start: string; end: string }, index: number) {
        if (!brk.start || !brk.end || !startDatetime || !endDatetime) {
            // Clear error if incomplete data
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`break_${index}`];
                return newErrors;
            });
            return;
        }

        // Parse work start/end times
        const workStart = new Date(startDatetime);
        const workEnd = new Date(endDatetime);
        const isOvernight = workEnd.getDate() > workStart.getDate() || workEnd < workStart;

        // Parse break times (HH:MM format)
        const [breakStartH, breakStartM] = brk.start.split(':').map(Number);
        const [breakEndH, breakEndM] = brk.end.split(':').map(Number);
        const workStartH = workStart.getHours();
        const workStartM = workStart.getMinutes();
        const workEndH = workEnd.getHours();
        const workEndM = workEnd.getMinutes();

        // Convert to minutes for easier comparison
        const breakStartMins = breakStartH * 60 + breakStartM;
        const breakEndMins = breakEndH * 60 + breakEndM;
        const workStartMins = workStartH * 60 + workStartM;
        const workEndMins = workEndH * 60 + workEndM;

        let isValid = false;

        if (isOvernight) {
            // For overnight shifts (e.g., 21:00-05:00):
            // Valid if break is in evening part [workStart, 23:59] OR morning part [00:00, workEnd]
            const breakInEvening = breakStartMins >= workStartMins && breakEndMins >= workStartMins;
            const breakInMorning = breakStartMins <= workEndMins && breakEndMins <= workEndMins;
            isValid = breakInEvening || breakInMorning;
        } else {
            // Same-day shift: break must be fully within work window
            isValid = breakStartMins >= workStartMins && breakEndMins <= workEndMins;
        }

        if (!isValid) {
            const workStartStr = `${String(workStartH).padStart(2, '0')}:${String(workStartM).padStart(2, '0')}`;
            const workEndStr = `${String(workEndH).padStart(2, '0')}:${String(workEndM).padStart(2, '0')}`;
            setErrors(prev => ({
                ...prev,
                [`break_${index}`]: `Break must be within work hours (${workStartStr}-${workEndStr})`
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`break_${index}`];
                return newErrors;
            });
        }
    }

    // Allowance functions
    function addAllowance() {
        setAllowances([...allowances, {
            allowance_type: null,
            custom_allowance_name: '',
            hours: '',
            notes: '',
            start_time: '',
            end_time: ''
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

        if (selectedEmployees.length === 0) newErrors.employee = 'At least one employee is required';
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

        // Validate breaks are within work hours
        if (startDatetime && endDatetime && validBreaks.length > 0) {
            const workStartTime = startDatetime.split('T')[1]; // HH:MM
            const workEndTime = endDatetime.split('T')[1]; // HH:MM

            // Detect overnight shift (work end time is before work start time)
            const isOvernightShift = workEndTime < workStartTime;

            for (let i = 0; i < validBreaks.length; i++) {
                const b = validBreaks[i];

                let isValid = false;

                if (isOvernightShift) {
                    // For overnight shifts (e.g., 23:51 -> 07:51):
                    // Break is valid if it's AFTER start time (e.g., 23:51-23:59)
                    // OR if it's BEFORE end time (e.g., 00:00-07:51)
                    const afterStart = b.start >= workStartTime && b.end >= workStartTime;
                    const beforeEnd = b.start <= workEndTime && b.end <= workEndTime;
                    isValid = afterStart || beforeEnd;
                } else {
                    // For normal shifts: break must be within work hours
                    isValid = b.start >= workStartTime && b.end <= workEndTime;
                }

                if (!isValid) {
                    newErrors.breaks = `Break ${i + 1} (${b.start}-${b.end}) must be within work hours (${workStartTime}-${workEndTime})`;
                    break;
                }
                if (b.start >= b.end) {
                    newErrors.breaks = `Break ${i + 1} end time must be after start time`;
                    break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit() {
        if (!validateForm()) return;

        setSaving(true);
        setErrors({});

        try {
            // Extract work_date from start datetime (YYYY-MM-DD)
            const workDate = startDatetime.split('T')[0];

            let successCount = 0;
            let failCount = 0;
            const failedEmployees: string[] = [];

            // Create a work log for each selected employee
            for (const empId of selectedEmployees) {
                const payload: any = {
                    project: project,
                    employee: empId,
                    work_date: workDate,  // Required field
                    start_datetime: startDatetime,
                    end_datetime: endDatetime,
                    breaks: breaks.filter(b => b.start && b.end).map(b => ({
                        start: b.start + ':00',
                        end: b.end + ':00'
                    })),
                    location_override: location,
                    notes: notes
                };

                if (supervisor) payload.supervisor = supervisor;
                if (service) payload.service = service;

                if (allowances.length > 0) {
                    payload.allowances = allowances.filter(a => a.allowance_type || a.custom_allowance_name).map(a => ({
                        allowance_type: a.allowance_type || null,
                        custom_allowance_name: a.custom_allowance_name || '',
                        hours: parseFloat(a.hours) || 0,
                        notes: a.notes || '',
                        start_time: a.start_time ? a.start_time + ':00' : null,
                        end_time: a.end_time ? a.end_time + ':00' : null
                    }));
                }

                const response = await apiFetch(`/worklogs/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    const emp = employees.find(e => e.id === empId);
                    failedEmployees.push(emp?.full_name || empId);
                }
            }

            // Show result and navigate
            if (successCount > 0) {
                if (failCount > 0) {
                    alert(`Created ${successCount} work log(s). ${failCount} failed: ${failedEmployees.join(', ')}`);
                }
                router.push(returnUrl);
            } else {
                setErrors({ general: 'Failed to create any work logs. Please try again.' });
            }
        } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'An error occurred' });
        } finally {
            setSaving(false);
        }
    }

    return {
        addAllowance, addBreak, allowanceTypes, allowances, breaks, customer, customerSearch, customers, employeeSearch, employees, endDatetime, errors, filteredProjects, getEmployeeName, handleSubmit, loadingCustomers, loadingEmployees, loadingProjects, loadingServices, loadingSupervisors, location, notes, originalLocation, project, projectSearch, projects, removeAllowance, removeBreak, returnUrl, router, saving, selectedEmployees, service, serviceSearch, services, setCustomer, setCustomerSearch, setEmployeeSearch, setEndDatetime, setLocation, setNotes, setProject, setProjectSearch, setService, setServiceSearch, setShowCustomerDropdown, setShowEmployeeDropdown, setShowProjectDropdown, setShowServiceDropdown, setShowSupervisorDropdown, setStartDatetime, setSupervisor, setSupervisorSearch, showCustomerDropdown, showEmployeeDropdown, showProjectDropdown, showServiceDropdown, showSupervisorDropdown, startDatetime, supervisor, supervisorSearch, supervisors, toggleEmployee, updateAllowance, updateBreak,
    };
}

export type WorklogCreateViewModel = ReturnType<typeof useWorklogCreate>;
