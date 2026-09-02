/**
 * useWorklogDetail — ViewModel for the page of the same name.
 *
 * Extracted from the page, which held its state, its fetching and its handlers
 * inline alongside the markup. The page composes; this decides.
 */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { apiDownload, apiFetch, apiGet, apiGetAll, apiMutate } from '@/hooks/useApi';

export interface WorkLog {
    id: number;
    employee: number;
    employee_name: string;
    project: number;
    project_name: string;
    customer_name: string;
    supervisor: number | null;
    supervisor_name: string | null;
    service: number | null;
    service_name: string | null;
    work_date: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    breaks: Array<{ start: string; end: string }>;
    calculated_hours: number;
    location_override: string;
    notes: string;
    status: string;
    rejection_reason: string | null;
    created_at: string;
    allowances?: any[];
    photos?: Array<{ id: string; photo: string; photo_url: string; caption: string; photo_type: string; photo_type_display: string; taken_at: string }>;
}

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


export function useWorklogDetail() {
    const params = useParams();
    const router = useRouter();
    const [worklog, setWorklog] = useState<WorkLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [customer, setCustomer] = useState('');
    const [project, setProject] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [service, setService] = useState('');
    const [location, setLocation] = useState('');
    const [startDatetime, setStartDatetime] = useState('');
    const [endDatetime, setEndDatetime] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('pending');
    const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
    const [allowances, setAllowances] = useState<WorkLogAllowance[]>([]);

    // Original values for tracking changes
    const [originalData, setOriginalData] = useState<any>(null);

    // Dropdown options
    const [customers, setCustomers] = useState<{ id: string, company_name: string }[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<{ id: string, full_name: string }[]>([]);
    const [services, setServices] = useState<{ id: string, name: string }[]>([]);
    const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);

    // Loading states
    const [loadingSupervisors, setLoadingSupervisors] = useState(false);
    const [loadingServices, setLoadingServices] = useState(false);

    // Search states for searchable dropdowns
    const [customerSearch, setCustomerSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    // Dropdown visibility states
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    // Employee state
    const [employee, setEmployee] = useState('');
    const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

    // Photos
    const [photos, setPhotos] = useState<Array<{ id: string; photo: string; photo_url: string; caption: string; photo_type: string; photo_type_display: string; taken_at: string }>>([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Check if form has changes
    const hasChanges = useMemo(() => {
        if (!originalData) return false;

        const currentData = {
            project, supervisor, service, location,
            startDatetime, endDatetime, notes, status,
            breaks: JSON.stringify(breaks),
            allowances: JSON.stringify(allowances)
        };

        return (
            currentData.project !== originalData.project ||
            currentData.supervisor !== originalData.supervisor ||
            currentData.service !== originalData.service ||
            currentData.location !== originalData.location ||
            currentData.startDatetime !== originalData.startDatetime ||
            currentData.endDatetime !== originalData.endDatetime ||
            currentData.notes !== originalData.notes ||
            currentData.status !== originalData.status ||
            currentData.breaks !== originalData.breaks ||
            currentData.allowances !== originalData.allowances
        );
    }, [project, supervisor, service, location, startDatetime, endDatetime, notes, status, breaks, allowances, originalData]);

    useEffect(() => {
        loadAllData();
    }, [params.id]);

    async function loadAllData() {
        setLoading(true);
        try {
            // First load projects, customers, employees, and allowance types
            const [projRes, custRes, allowRes, empRes] = await Promise.all([
                apiFetch(`/projects/projects/`),
                apiFetch(`/customers/customers/`),
                apiFetch(`/employees/allowance-types/`),
                apiFetch(`/employees/profiles/`),
            ]);

            let projectsList: any[] = [];
            if (projRes.ok) {
                const data = await projRes.json();
                projectsList = Array.isArray(data) ? data : (data.results || []);
                setProjects(projectsList);
            }

            let customersList: { id: string, company_name: string }[] = [];
            if (custRes.ok) {
                const data = await custRes.json();
                customersList = Array.isArray(data) ? data : (data.results || []);
                setCustomers(customersList);
            }

            if (allowRes.ok) {
                const data = await allowRes.json();
                setAllowanceTypes(Array.isArray(data) ? data : (data.results || []));
            }

            let employeesList: { id: string; full_name: string }[] = [];
            if (empRes.ok) {
                const data = await empRes.json();
                employeesList = (Array.isArray(data) ? data : (data.results || [])).map((e: any) => ({
                    id: e.id,
                    full_name: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim()
                }));
                setEmployees(employeesList);
            }

            // Now load the worklog
            const response = await apiFetch(`/worklogs/${params.id}/`);
            if (!response.ok) throw new Error('Failed to load work log');
            const data = await response.json();
            setWorklog(data);

            // Parse datetime fields - use actual_start_datetime and actual_end_datetime from API
            let startDt = '';
            let endDt = '';

            // Use actual datetime fields from API
            if (data.actual_start_datetime) {
                startDt = data.actual_start_datetime.substring(0, 16);  // YYYY-MM-DDTHH:mm
            } else if (data.work_date && data.start_time) {
                startDt = `${data.work_date}T${data.start_time.substring(0, 5)}`;
            }

            if (data.actual_end_datetime) {
                endDt = data.actual_end_datetime.substring(0, 16);
            } else if (data.work_date && data.end_time) {
                endDt = `${data.work_date}T${data.end_time.substring(0, 5)}`;
            }

            // API returns project_id, service (as FK id), planned_supervisor
            const projectVal = data.project_id?.toString() || data.project?.toString() || '';
            const supervisorVal = data.planned_supervisor?.toString() || data.supervisor?.toString() || '';
            const serviceVal = data.service?.toString() || '';
            const locationVal = data.location_override || data.location || '';
            const notesVal = data.notes || '';
            const statusVal = data.status || 'pending';

            // Get customer from the selected project
            let customerVal = '';
            if (projectVal) {
                const selectedProj = projectsList.find((p: any) => String(p.id) === projectVal);
                if (selectedProj) {
                    customerVal = String(selectedProj.customer || selectedProj.customer_id || '');
                }
            }

            // Load breaks
            let breaksVal: { start: string; end: string }[] = [];
            if (data.breaks && data.breaks.length > 0) {
                breaksVal = data.breaks.map((b: any) => ({
                    start: b.start?.substring(0, 5) || '',
                    end: b.end?.substring(0, 5) || ''
                }));
            } else {
                breaksVal = [{ start: '12:00', end: '12:30' }];
            }

            // Load allowances
            let allowancesVal: WorkLogAllowance[] = [];
            if (data.allowances && data.allowances.length > 0) {
                allowancesVal = data.allowances.map((a: any) => ({
                    allowance_type: a.allowance_type ? String(a.allowance_type) : '',
                    custom_allowance_name: a.custom_allowance_name || '',
                    hours: a.hours?.toString() || '',
                    notes: a.notes || '',
                    start_time: a.start_time?.substring(0, 5) || '',
                    end_time: a.end_time?.substring(0, 5) || ''
                }));
            }

            // Set form state
            setCustomer(customerVal);
            setProject(projectVal);
            setSupervisor(supervisorVal);
            setService(serviceVal);
            setLocation(locationVal);
            setStartDatetime(startDt);
            setEndDatetime(endDt);
            setNotes(notesVal);
            setStatus(statusVal);
            setBreaks(breaksVal);
            setAllowances(allowancesVal);

            // Set employee from worklog
            const employeeVal = data.employee?.toString() || data.employee_id?.toString() || '';
            setEmployee(employeeVal);

            // Set search text for searchable dropdowns
            const selectedCustomer = customersList.find(c => String(c.id) === customerVal);
            if (selectedCustomer) setCustomerSearch(selectedCustomer.company_name);

            const selectedProj = projectsList.find((p: any) => String(p.id) === projectVal);
            if (selectedProj) setProjectSearch(selectedProj.name);

            // Set employee search text
            const selectedEmp = employeesList.find(e => String(e.id) === employeeVal);
            if (selectedEmp) setEmployeeSearch(selectedEmp.full_name);

            // Supervisor and service search will be set after loadProjectDetails

            // Load photos
            if (data.photos && Array.isArray(data.photos)) {
                setPhotos(data.photos);
            }

            // Store original data for change tracking
            setOriginalData({
                project: projectVal,
                supervisor: supervisorVal,
                service: serviceVal,
                location: locationVal,
                startDatetime: startDt,
                endDatetime: endDt,
                notes: notesVal,
                status: statusVal,
                breaks: JSON.stringify(breaksVal),
                allowances: JSON.stringify(allowancesVal)
            });

            // Load supervisors/services using project and customer
            if (projectVal) {
                const selectedProject = projectsList.find((p: any) => String(p.id) === String(projectVal));
                if (selectedProject) {
                    const customerId = selectedProject.customer || selectedProject.customer_id;
                    await loadProjectDetails(projectVal, customerId ? customerId.toString() : '', supervisorVal, serviceVal);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    async function loadProjectDetails(projectId: string, customerId: string, supervisorId?: string, serviceId?: string) {
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

                // Set supervisor search text if already selected
                const supToCheck = supervisorId || supervisor;
                if (supToCheck) {
                    const selectedSup = sups.find((s: any) => String(s.id) === String(supToCheck));
                    if (selectedSup) setSupervisorSearch(selectedSup.full_name);
                }
            }

            // Load services from customer (from service_rates)
            if (customerId) {
                const custRes = await apiFetch(`/customers/customers/${customerId}/`);
                if (custRes.ok) {
                    const customerData = await custRes.json();
                    // Customer API returns service_rates with service info
                    if (customerData.service_rates && customerData.service_rates.length > 0) {
                        const servicesList = customerData.service_rates.map((sr: any) => ({
                            id: sr.service,
                            name: sr.service_name
                        }));
                        setServices(servicesList);

                        // Set service search text if already selected
                        const servToCheck = serviceId || service;
                        if (servToCheck) {
                            const selectedServ = servicesList.find((s: any) => String(s.id) === String(servToCheck));
                            if (selectedServ) setServiceSearch(selectedServ.name);
                        }
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

    // Helper function to validate break times are within work hours
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

    async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file || !params.id) return;

        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('photo', file);

            const response = await apiFetch(`/worklogs/${params.id}/add_photo/`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const newPhoto = await response.json();
                setPhotos(prev => [...prev, newPhoto]);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to upload photo');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    async function handlePhotoDelete(photoId: string) {
        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            // Photos are nested under their entry; /worklogs/photos/<id>/ has
            // never been routed, so every delete silently 404'd.
            const response = await apiFetch(
                `/worklogs/entries/${params.id}/photos/${photoId}/`,
                { method: 'DELETE' },
            );
            if (response.ok || response.status === 204) {
                setPhotos(prev => prev.filter(p => p.id !== photoId));
            } else {
                alert('Kon de foto niet verwijderen.');
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    async function handleSave() {
        console.log('handleSave called');
        setSaving(true);

        // Check for existing break validation errors first
        const existingBreakErrors = Object.keys(errors).filter(k => k.startsWith('break_'));
        if (existingBreakErrors.length > 0) {
            console.log('Break validation errors exist:', existingBreakErrors);
            setSaving(false);
            return;
        }

        setErrors({});

        // Frontend validation
        const validationErrors: Record<string, string> = {};
        if (!project) {
            validationErrors.project = 'Project is required';
        }
        if (!employee) {
            validationErrors.employee = 'Employee is required';
        }
        if (!startDatetime) {
            validationErrors.start_datetime = 'Start time is required';
        }
        if (!endDatetime) {
            validationErrors.end_datetime = 'End time is required';
        }

        // Validate breaks are within work hours
        if (startDatetime && endDatetime) {
            breaks.forEach((brk, index) => {
                if (brk.start && brk.end) {
                    const workStart = new Date(startDatetime);
                    const workEnd = new Date(endDatetime);
                    const isOvernight = workEnd.getDate() > workStart.getDate() || workEnd < workStart;

                    const [breakStartH, breakStartM] = brk.start.split(':').map(Number);
                    const [breakEndH, breakEndM] = brk.end.split(':').map(Number);
                    const workStartH = workStart.getHours();
                    const workStartM = workStart.getMinutes();
                    const workEndH = workEnd.getHours();
                    const workEndM = workEnd.getMinutes();

                    const breakStartMins = breakStartH * 60 + breakStartM;
                    const breakEndMins = breakEndH * 60 + breakEndM;
                    const workStartMins = workStartH * 60 + workStartM;
                    const workEndMins = workEndH * 60 + workEndM;

                    let isValid = false;
                    if (isOvernight) {
                        const breakInEvening = breakStartMins >= workStartMins && breakEndMins >= workStartMins;
                        const breakInMorning = breakStartMins <= workEndMins && breakEndMins <= workEndMins;
                        isValid = breakInEvening || breakInMorning;
                    } else {
                        isValid = breakStartMins >= workStartMins && breakEndMins <= workEndMins;
                    }

                    if (!isValid) {
                        const workStartStr = `${String(workStartH).padStart(2, '0')}:${String(workStartM).padStart(2, '0')}`;
                        const workEndStr = `${String(workEndH).padStart(2, '0')}:${String(workEndM).padStart(2, '0')}`;
                        validationErrors[`break_${index}`] = `Break must be within work hours (${workStartStr}-${workEndStr})`;
                    }
                }
            });
        }

        if (Object.keys(validationErrors).length > 0) {
            console.log('Validation errors:', validationErrors);
            setErrors(validationErrors);
            setSaving(false);
            return;
        }

        try {
            // Extract work_date from start datetime
            const workDate = startDatetime.split('T')[0];

            const payload: any = {
                project: project,  // UUID - don't parseInt
                employee: employee,  // EmployeeProfile UUID
                work_date: workDate,
                start_datetime: startDatetime,
                end_datetime: endDatetime,
                breaks: breaks.filter(b => b.start && b.end).map(b => ({
                    start: b.start + ':00',
                    end: b.end + ':00'
                })),
                location_override: location || '',
                notes: notes || '',
                status: status
            };

            // Only include supervisor if selected (not empty)
            if (supervisor && supervisor !== '0') {
                payload.supervisor = supervisor;  // UUID - don't parseInt
            }

            // Only include service if selected
            if (service && service !== '0') {
                payload.service = parseInt(service);
            }

            if (allowances.length > 0) {
                payload.allowances = allowances.filter(a => a.allowance_type || a.custom_allowance_name).map(a => ({
                    allowance_type: a.allowance_type || null,  // Send null instead of empty string for custom
                    custom_allowance_name: a.custom_allowance_name || '',
                    hours: parseFloat(a.hours) || 0,
                    notes: a.notes || '',
                    start_time: a.start_time ? a.start_time + ':00' : null,  // Convert HH:MM to HH:MM:SS
                    end_time: a.end_time ? a.end_time + ':00' : null
                }));
            }

            console.log('Sending payload:', payload);

            const response = await apiFetch(`/worklogs/${params.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                console.log('Error response:', data);
                if (typeof data === 'object') {
                    const fieldErrors: Record<string, string> = {};
                    Object.entries(data).forEach(([key, value]) => {
                        fieldErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
                    });
                    setErrors(fieldErrors);
                }
                return;
            }

            console.log('Save successful, redirecting...');
            router.push('/dashboard/worklogs');
        } catch (err) {
            console.error('Save error:', err);
            setErrors({ general: err instanceof Error ? err.message : 'Failed to save' });
        } finally {
            setSaving(false);
        }
    }

    async function handleApprove() {
        setSaving(true);
        setErrors({});
        try {
            const response = await apiFetch(`/worklogs/${params.id}/approve/`, {
                method: 'POST',
            });
            if (!response.ok) {
                const data = await response.json();
                // Reload data to refresh the status in case it changed
                await loadAllData();
                throw new Error(data.error || data.detail || 'Failed to approve');
            }
            // Reload data to show updated status
            await loadAllData();
        } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'Failed to approve' });
        } finally {
            setSaving(false);
        }
    }

    async function handleReject() {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        setSaving(true);
        setErrors({});
        try {
            const response = await apiFetch(`/worklogs/${params.id}/reject/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            if (!response.ok) {
                const data = await response.json();
                // Reload data to refresh the status in case it changed
                await loadAllData();
                throw new Error(data.error || data.detail || 'Failed to reject');
            }
            // Reload data to show updated status
            await loadAllData();
        } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'Failed to reject' });
        } finally {
            setSaving(false);
        }
    }

    const statusStyles: Record<string, { bg: string; border: string; text: string }> = {
        draft: { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
        pending: { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706' },
        approved: { bg: '#D1FAE5', border: '#10B981', text: '#059669' },
        rejected: { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626' }
    };


    return {
        statusStyles, addAllowance, addBreak, allowanceTypes, allowances, breaks, customer, customerSearch, customers, employee, employeeSearch, employees, endDatetime, error, errors, fileInputRef, handleApprove, handlePhotoDelete, handlePhotoUpload, handleReject, handleSave, hasChanges, loadProjectDetails, loading, loadingServices, loadingSupervisors, location, notes, photos, project, projectSearch, projects, removeAllowance, removeBreak, router, saving, service, serviceSearch, services, setCustomer, setCustomerSearch, setEmployee, setEmployeeSearch, setEndDatetime, setLocation, setNotes, setProject, setProjectSearch, setService, setServiceSearch, setShowCustomerDropdown, setShowEmployeeDropdown, setShowProjectDropdown, setShowServiceDropdown, setShowSupervisorDropdown, setStartDatetime, setStatus, setSupervisor, setSupervisorSearch, showCustomerDropdown, showEmployeeDropdown, showProjectDropdown, showServiceDropdown, showSupervisorDropdown, startDatetime, status, supervisor, supervisorSearch, supervisors, updateAllowance, updateBreak, uploadingPhoto, worklog,
    };
}

export type WorklogDetailViewModel = ReturnType<typeof useWorklogDetail>;
