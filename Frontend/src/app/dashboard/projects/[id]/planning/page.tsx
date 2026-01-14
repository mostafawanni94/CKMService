'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { ArrowLeft, Plus, X, Clock, Trash2, Calendar, Users, Check, Search, ChevronLeft, ChevronRight, Edit2, Save } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PlannedDay {
    id: string;
    date: string;
    shift_template: string;
    shift_name?: string;
    shift_color: string;
    shift_start_time?: string;
    shift_end_time?: string;
    required_workers: number;
    project_id?: string;  // From backend ProjectPlannedDaySerializer
    project_name?: string;
    // From list serializer (lightweight)
    assigned_count?: number;
    is_fully_staffed?: boolean;
    // From detail serializer (full data, loaded on demand)
    work_entries?: Array<{
        id: string;
        employee_id: string;
        employee_name: string;
        status: string;
        calculated_hours: string;
    }>;
}

interface Employee {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    full_name?: string;
}

function getEmployeeName(emp: Employee): string {
    if (emp.full_name) return emp.full_name;
    if (emp.first_name || emp.last_name) return `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return emp.email || 'Unknown';
}

interface Project {
    id: string;
    name: string;
    customer_name: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function PlanningPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Calendar state
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    // Date selection mode: 'calendar' (click days) or 'pattern' (enter day numbers)
    const [selectionMode, setSelectionMode] = useState<'calendar' | 'pattern'>('calendar');
    const [dayPattern, setDayPattern] = useState(''); // e.g. "1,5,10,15,20"
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // 0=Jan, 1=Feb, etc.
    const [patternYear, setPatternYear] = useState(new Date().getFullYear());

    // Shift form state
    const [shiftName, setShiftName] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    // Additional shift form fields
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [shiftLocation, setShiftLocation] = useState('');
    const [supervisors, setSupervisors] = useState<Array<{ id: string; full_name: string }>>([]);
    const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);

    // Table pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [filterMonth, setFilterMonth] = useState<number | null>(null);
    const itemsPerPage = 15;

    // Edit modal
    const [editingShift, setEditingShift] = useState<PlannedDay | null>(null);
    const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);
    const [editShiftName, setEditShiftName] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [showEditEmployeeDropdown, setShowEditEmployeeDropdown] = useState(false);
    const [editEmployeeSearch, setEditEmployeeSearch] = useState('');
    // View day modal - for viewing/editing shifts on a specific date
    const [viewingDate, setViewingDate] = useState<string | null>(null);
    // Quick-add shift form in View Day modal
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddStart, setQuickAddStart] = useState('09:00');
    const [quickAddEnd, setQuickAddEnd] = useState('17:00');
    const [quickAddEmployees, setQuickAddEmployees] = useState<string[]>([]);
    const [quickAddSearch, setQuickAddSearch] = useState('');
    // Calendar interaction mode: 'select' to select dates, 'view' to view existing shifts
    const [calendarMode, setCalendarMode] = useState<'select' | 'view'>('select');
    // Bulk selection for shifts table
    const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);


    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Build calendar for year
    const getYearCalendar = () => {
        const months: Date[][] = [];
        for (let m = 0; m < 12; m++) {
            const days: Date[] = [];
            const lastDay = new Date(currentYear, m + 1, 0);
            for (let d = 1; d <= lastDay.getDate(); d++) {
                days.push(new Date(currentYear, m, d));
            }
            months.push(days);
        }
        return months;
    };

    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Get shift info for a date
    const getDayShifts = (dateStr: string): PlannedDay[] => {
        return plannedDays.filter(d => d.date === dateStr);
    };

    // Load data
    useEffect(() => {
        loadData();
    }, [projectId, currentYear]);

    async function loadData() {
        try {
            const [projRes, daysRes, empRes] = await Promise.all([
                fetch(`${API_URL}/projects/projects/${projectId}/`, { headers }),
                fetch(`${API_URL}/projects/planned-days/?project=${projectId}&year=${currentYear}`, { headers }),
                fetch(`${API_URL}/employees/profiles/`, { headers }),
            ]);

            if (projRes.ok) {
                const projData = await projRes.json();
                setProject(projData);

                // Extract supervisors from project
                const sups = (projData.supervisors_list || []).map((s: any) => ({
                    id: s.id,
                    full_name: s.company_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
                }));
                setSupervisors(sups);

                // Set default location from project
                const locationParts = [
                    projData.location_address,
                    projData.location_postcode,
                    projData.location_city
                ].filter(Boolean);
                if (locationParts.length > 0) {
                    setShiftLocation(locationParts.join(', '));
                } else if (projData.location) {
                    setShiftLocation(projData.location);
                }

                // Load services from customer
                if (projData.customer) {
                    const custRes = await fetch(`${API_URL}/customers/customers/${projData.customer}/`, { headers });
                    if (custRes.ok) {
                        const customerData = await custRes.json();
                        if (customerData.service_rates && customerData.service_rates.length > 0) {
                            setServices(customerData.service_rates.map((sr: any) => ({
                                id: sr.service,
                                name: sr.service_name,
                            })));
                        }
                    }
                }
            }
            if (daysRes.ok) {
                const data = await daysRes.json();
                setPlannedDays(Array.isArray(data) ? data : data.results || []);
            }
            if (empRes.ok) {
                const data = await empRes.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Search employees
    async function searchEmployees(query: string) {
        if (query.length < 2) return;
        try {
            const res = await fetch(`${API_URL}/employees/profiles/?search=${encodeURIComponent(query)}&limit=20`, { headers });
            if (res.ok) {
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) {
            console.error('Search error:', err);
        }
    }

    // Handle day click based on current calendar mode
    function handleDayClick(dateStr: string) {
        if (calendarMode === 'select') {
            // Select mode - always toggle selection
            toggleDate(dateStr);
        } else {
            // View mode - open view modal if day has shifts
            const dayShifts = getDayShifts(dateStr);
            if (dayShifts.length > 0) {
                setViewingDate(dateStr);
            }
        }
    }

    // Open view modal for a day with shifts (from badge click)
    function openDayView(dateStr: string, e: React.MouseEvent) {
        e.stopPropagation(); // Prevent triggering the day selection
        setViewingDate(dateStr);
    }

    // Toggle date selection
    function toggleDate(dateStr: string) {
        setSelectedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateStr)) {
                newSet.delete(dateStr);
            } else {
                newSet.add(dateStr);
            }
            return newSet;
        });
    }

    // Toggle employee selection
    function toggleEmployee(empId: string) {
        setSelectedEmployees(prev =>
            prev.includes(empId)
                ? prev.filter(id => id !== empId)
                : [...prev, empId]
        );
    }

    // Generate dates from pattern using selected months and year
    function generateDatesFromPattern() {
        if (!dayPattern.trim() || selectedMonths.length === 0) {
            alert('Please enter day numbers and select at least one month');
            return;
        }

        const dayNumbers = dayPattern
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n >= 1 && n <= 31);

        console.log('📅 [Pattern] Day numbers parsed:', dayNumbers);
        console.log('📅 [Pattern] Selected months:', selectedMonths);
        console.log('📅 [Pattern] Pattern year:', patternYear);

        if (dayNumbers.length === 0) {
            alert('Please enter valid day numbers (1-31) separated by commas');
            return;
        }

        const newDates = new Set<string>();

        // For each selected month
        for (const monthIdx of selectedMonths) {
            const lastDayOfMonth = new Date(patternYear, monthIdx + 1, 0).getDate();

            // Add each day number that exists in this month
            for (const day of dayNumbers) {
                if (day <= lastDayOfMonth) {
                    const date = new Date(patternYear, monthIdx, day);
                    newDates.add(formatDate(date));
                }
            }
        }

        console.log('📅 [Pattern] Generated dates:', Array.from(newDates));
        console.log('📅 [Pattern] Total generated:', newDates.size);

        // Add to selected dates
        setSelectedDates(prev => {
            const combined = new Set(prev);
            newDates.forEach(d => combined.add(d));

            console.log('📅 [Pattern] Combined total:', combined.size);

            // Show success message after state update
            const newCount = newDates.size;
            const totalCount = combined.size;
            const datesList = Array.from(newDates).sort().slice(0, 5).join(', ');
            const more = newCount > 5 ? `... and ${newCount - 5} more` : '';

            setTimeout(() => {
                alert(`✅ Added ${newCount} dates to selection!\n\nDates: ${datesList}${more}\n\nTotal selected: ${totalCount} days\n\nNow fill in the shift details and click "Schedule Shifts".`);
            }, 100);

            return combined;
        });

        // Also update the calendar year if needed
        if (patternYear !== currentYear) {
            setCurrentYear(patternYear);
        }
    }

    // Toggle month selection for pattern
    function togglePatternMonth(monthIdx: number) {
        setSelectedMonths(prev =>
            prev.includes(monthIdx)
                ? prev.filter(m => m !== monthIdx)
                : [...prev, monthIdx].sort((a, b) => a - b)
        );
    }

    // Clear all selections
    function clearSelections() {
        setSelectedDates(new Set());
        setSelectedEmployees([]);
        setShiftName('');
        setStartTime('09:00');
        setEndTime('17:00');
        setDayPattern('');
        setSelectedMonths([]);
    }

    // Schedule shifts
    async function scheduleShifts() {
        if (selectedDates.size === 0 || selectedEmployees.length === 0 || !shiftName.trim()) {
            alert('Please select at least one date, one employee, and enter a shift name.');
            return;
        }

        setSaving(true);
        try {
            // First create a shift template
            const templateRes = await fetch(`${API_URL}/projects/shift-templates/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    project: projectId,
                    name: shiftName,
                    start_time: startTime,
                    end_time: endTime,
                    color: '#3B82F6',
                }),
            });

            if (!templateRes.ok) {
                throw new Error('Failed to create shift template');
            }

            const template = await templateRes.json();
            const dates = Array.from(selectedDates);

            // Debug logging
            console.log('📅 [Planning] Scheduling shifts with the following dates:');
            console.log('📅 [Planning] Total dates selected:', dates.length);
            console.log('📅 [Planning] Dates array:', dates);
            console.log('📅 [Planning] Employees:', selectedEmployees);

            // Bulk create planned days
            const payload: any = {
                shift_template: template.id,
                dates: dates,
                employee_ids: selectedEmployees,
            };
            // Add optional fields if selected
            if (selectedSupervisor) payload.supervisor = selectedSupervisor;
            if (selectedService) payload.service = parseInt(selectedService, 10);
            if (shiftLocation) payload.location_override = shiftLocation;

            const bulkRes = await fetch(`${API_URL}/projects/planned-days/bulk_create/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const result = await bulkRes.json();
            console.log('📅 [Planning] API Response:', result);

            if (bulkRes.ok) {
                // Use actual count from API response
                const createdCount = result.created_count || dates.length;
                const totalAssignments = createdCount * selectedEmployees.length;

                // Clear form and reload
                clearSelections();
                loadData();

                // Show success message with actual counts
                alert(`Successfully scheduled ${createdCount} shifts for ${selectedEmployees.length} employee(s)!\n\nTotal: ${totalAssignments} shift assignments created.${totalAssignments <= 3 ? '\n\nEmployees have been notified.' : ''}`);
            } else {
                console.error('📅 [Planning] API Error:', result);
                throw new Error(result.detail || JSON.stringify(result) || 'Failed to create shifts');
            }
        } catch (err) {
            console.error('Schedule error:', err);
            alert('Failed to schedule shifts. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    // Delete a shift
    async function deleteShift(shiftId: string) {
        if (!confirm('Delete this shift and all its assignments?')) return;

        try {
            await fetch(`${API_URL}/projects/planned-days/${shiftId}/`, { method: 'DELETE', headers });
            loadData();
            // Remove from selection if selected
            setSelectedShiftIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(shiftId);
                return newSet;
            });
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    // Bulk delete selected shifts
    async function bulkDeleteShifts() {
        if (selectedShiftIds.size === 0) return;
        if (!confirm(`Delete ${selectedShiftIds.size} selected shift(s) and all their assignments?`)) return;

        setBulkDeleting(true);
        try {
            const deletePromises = Array.from(selectedShiftIds).map(shiftId =>
                fetch(`${API_URL}/projects/planned-days/${shiftId}/`, { method: 'DELETE', headers })
            );
            await Promise.all(deletePromises);
            setSelectedShiftIds(new Set());
            loadData();
        } catch (err) {
            console.error('Bulk delete error:', err);
            alert('Failed to delete some shifts. Please try again.');
        } finally {
            setBulkDeleting(false);
        }
    }

    // Toggle shift selection
    function toggleShiftSelection(shiftId: string) {
        setSelectedShiftIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(shiftId)) {
                newSet.delete(shiftId);
            } else {
                newSet.add(shiftId);
            }
            return newSet;
        });
    }

    // Toggle select all (visible shifts only)
    function toggleSelectAllShifts() {
        const allVisibleIds = paginatedShifts.map(s => s.id);
        const allSelected = allVisibleIds.every(id => selectedShiftIds.has(id));
        if (allSelected) {
            // Deselect all visible
            setSelectedShiftIds(prev => {
                const newSet = new Set(prev);
                allVisibleIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            // Select all visible
            setSelectedShiftIds(prev => {
                const newSet = new Set(prev);
                allVisibleIds.forEach(id => newSet.add(id));
                return newSet;
            });
        }
    }

    // Open edit modal with current values - fetches full details from API
    async function openEditModal(shift: PlannedDay) {
        // Set initial data from list view (counts only)
        setEditingShift(shift);
        setEditShiftName(shift.shift_name || '');
        setEditStartTime(shift.shift_start_time?.slice(0, 5) || '09:00');
        setEditEndTime(shift.shift_end_time?.slice(0, 5) || '17:00');

        // Fetch full details (with work_entries) from API
        setLoadingShiftDetails(true);
        try {
            const res = await fetch(`${API_URL}/projects/planned-days/${shift.id}/`, { headers });
            if (res.ok) {
                const fullData = await res.json();
                setEditingShift(fullData);
            }
        } catch (err) {
            console.error('Error fetching shift details:', err);
        } finally {
            setLoadingShiftDetails(false);
        }
    }

    // Save edited shift (update template times)
    async function saveEditedShift() {
        if (!editingShift) return;

        try {
            setSaving(true);

            console.log('Saving shift template:', editingShift.shift_template);
            console.log('Payload:', { name: editShiftName, start_time: editStartTime + ':00', end_time: editEndTime + ':00' });

            // Update the shift template
            const response = await fetch(`${API_URL}/projects/shift-templates/${editingShift.shift_template}/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    name: editShiftName,
                    start_time: editStartTime + ':00',
                    end_time: editEndTime + ':00',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`Failed to update shift: ${response.status}`);
            }

            // Refresh data
            await loadData();
            setEditingShift(null);
            setShowEditEmployeeDropdown(false);
            setEditEmployeeSearch('');
        } catch (err) {
            console.error('Failed to save shift:', err);
            alert('Failed to save changes. Check console for details.');
        } finally {
            setSaving(false);
        }
    }

    // Quick add shift from View Day modal
    async function quickAddShift() {
        if (!viewingDate || !quickAddName.trim()) {
            alert('Please enter a shift name');
            return;
        }

        setSaving(true);
        try {
            // First create a shift template
            const templateRes = await fetch(`${API_URL}/projects/shift-templates/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    project: projectId,
                    name: quickAddName,
                    start_time: quickAddStart,
                    end_time: quickAddEnd,
                    color: '#3B82F6'
                })
            });

            if (!templateRes.ok) throw new Error('Failed to create template');
            const template = await templateRes.json();

            // Create the planned day with employee assignments
            const employeeIds = quickAddEmployees.map(id => parseInt(id));
            console.log('Quick Add Shift - employee_ids being sent:', employeeIds, 'quickAddEmployees:', quickAddEmployees);

            const bulkRes = await fetch(`${API_URL}/projects/planned-days/bulk_create/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    shift_template: template.id,
                    dates: [viewingDate],
                    employee_ids: employeeIds,
                    required_workers: Math.max(1, quickAddEmployees.length)
                })
            });

            if (!bulkRes.ok) {
                const errorText = await bulkRes.text();
                console.error('Bulk create error response:', errorText);
                throw new Error('Failed to create shift');
            }

            // Reset form and reload
            setQuickAddName('');
            setQuickAddStart('09:00');
            setQuickAddEnd('17:00');
            setQuickAddEmployees([]);
            setShowQuickAdd(false);
            loadData();
            alert('Shift added successfully!');
        } catch (err) {
            console.error('Quick add error:', err);
            alert('Failed to add shift');
        } finally {
            setSaving(false);
        }
    }

    // Toggle quick-add employee
    function toggleQuickAddEmployee(empId: string) {
        setQuickAddEmployees(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    }

    // Add employee to existing shift
    async function addEmployeeToShift(empId: string) {
        if (!editingShift) return;

        try {
            // Create a WorkEntry instead of ShiftAssignment (ShiftAssignment was removed)
            // Use projectId from URL params if project_id is not available from shift
            const payload = {
                employee: empId,  // EmployeeProfile UUID from /employees/profiles/
                project: editingShift.project_id || projectId,  // Fallback to URL param
                shift_template: editingShift.shift_template,
                work_date: editingShift.date,
                status: 'planned'
            };
            console.log('Adding employee with payload:', payload);

            const res = await fetch(`${API_URL}/worklogs/entries/`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            console.log('Response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                let errorMsg = `Status ${res.status}`;
                try {
                    const error = JSON.parse(errorText);
                    console.error('Add employee error response:', error);
                    errorMsg = JSON.stringify(error);
                } catch {
                    errorMsg = errorText || `HTTP ${res.status}`;
                }
                alert('Failed to add employee: ' + errorMsg);
                return;
            }

            setShowEditEmployeeDropdown(false);
            await refreshEditingShift();
        } catch (err) {
            console.error('Add employee error:', err);
            alert('Failed to add employee: Network error');
        }
    }

    // Remove employee from shift and refresh (now uses WorkEntry)
    async function removeEmployeeFromShift(workEntryId: string, employeeName: string) {
        if (!confirm(`Remove ${employeeName} from this shift?`)) return;

        try {
            await fetch(`${API_URL}/worklogs/entries/${workEntryId}/`, { method: 'DELETE', headers });
            await refreshEditingShift();
        } catch (err) {
            console.error('Remove employee error:', err);
        }
    }

    // Refresh the editing shift data without closing modal
    async function refreshEditingShift() {
        if (!editingShift) return;

        try {
            const res = await fetch(`${API_URL}/projects/planned-days/${editingShift.id}/`, { headers });
            if (res.ok) {
                const updated = await res.json();
                setEditingShift(updated);
            }
            // Also refresh the main data
            loadData();
        } catch (err) {
            console.error('Refresh error:', err);
        }
    }

    // Get employees not yet assigned to the current shift
    function getAvailableEmployeesForEdit() {
        if (!editingShift) return employees;
        const assignedIds = new Set((editingShift.work_entries || []).map(e => e.employee_id));
        return employees.filter(emp => !assignedIds.has(emp.id));
    }

    // Filtered and paginated shifts for table
    const filteredShifts = useMemo(() => {
        let filtered = [...plannedDays];

        if (filterMonth !== null) {
            filtered = filtered.filter(s => {
                const month = new Date(s.date).getMonth();
                return month === filterMonth;
            });
        }

        // Sort by date
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return filtered;
    }, [plannedDays, filterMonth]);

    const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
    const paginatedShifts = filteredShifts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Stats
    const stats = useMemo(() => {
        const today = new Date();
        const thisWeekEnd = new Date(today);
        thisWeekEnd.setDate(today.getDate() + 7);

        const thisWeek = plannedDays.filter(s => {
            const date = new Date(s.date);
            return date >= today && date <= thisWeekEnd;
        }).length;

        // Total assigned employees count (sum of all assigned_count since we can't dedupe without employee IDs)
        const totalAssignments = plannedDays.reduce((sum, s) => sum + (s.assigned_count || 0), 0);

        const unfilled = plannedDays.filter(s =>
            (s.assigned_count || 0) < s.required_workers
        ).length;

        return { thisWeek, totalEmployees: totalAssignments, unfilled, total: plannedDays.length };
    }, [plannedDays]);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                        Loading planning data...
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button onClick={() => router.back()} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
                            {project?.name} - Planning {currentYear}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>{project?.customer_name}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setCurrentYear(y => y - 1)}
                            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                        >
                            <ChevronLeft size={18} /> {currentYear - 1}
                        </button>
                        <button
                            onClick={() => setCurrentYear(y => y + 1)}
                            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                        >
                            {currentYear + 1} <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Stats Cards - Clickable */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div
                        onClick={() => document.getElementById('shifts-table')?.scrollIntoView({ behavior: 'smooth' })}
                        style={{
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)'; }}
                    >
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>📅 This Week</div>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.thisWeek}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>shifts scheduled →</div>
                    </div>
                    <div
                        onClick={() => window.location.href = '/dashboard/employees'}
                        style={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)'; }}
                    >
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>👥 Employees</div>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.totalEmployees}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>assigned →</div>
                    </div>
                    <div
                        onClick={() => { setFilterMonth(null); document.getElementById('shifts-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                        style={{
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.4)'; }}
                    >
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>⚠️ Unfilled</div>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.unfilled}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>need workers →</div>
                    </div>
                    <div
                        onClick={() => document.getElementById('year-calendar')?.scrollIntoView({ behavior: 'smooth' })}
                        style={{
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 92, 246, 0.4)'; }}
                    >
                        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>📊 Total {currentYear}</div>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.total}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>shifts planned →</div>
                    </div>
                </div>

                {/* Main Grid */}
                <div id="year-calendar" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                    {/* Left: Calendar */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={20} /> Select Days
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {selectedDates.size > 0 && (
                                    <>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#3B82F6' }}>
                                            {selectedDates.size} days selected
                                        </span>
                                        <button
                                            onClick={() => setSelectedDates(new Set())}
                                            style={{ padding: '6px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                                        >
                                            Clear All
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Calendar Interaction Mode Toggle */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button
                                onClick={() => setCalendarMode('select')}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '12px',
                                    background: calendarMode === 'select' ? '#10B981' : '#F3F4F6',
                                    color: calendarMode === 'select' ? 'white' : '#374151',
                                }}
                            >
                                ✏️ Select Mode
                            </button>
                            <button
                                onClick={() => setCalendarMode('view')}
                                style={{
                                    flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '12px',
                                    background: calendarMode === 'view' ? '#6366F1' : '#F3F4F6',
                                    color: calendarMode === 'view' ? 'white' : '#374151',
                                }}
                            >
                                👁️ View Mode
                            </button>
                        </div>

                        {/* Mode hint */}
                        <div style={{ padding: '8px 12px', background: calendarMode === 'select' ? '#D1FAE5' : '#E0E7FF', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: calendarMode === 'select' ? '#065F46' : '#3730A3' }}>
                            {calendarMode === 'select'
                                ? '📌 Click days to add them to your selection. You can add multiple shifts per day.'
                                : '🔍 Click days with shifts (blue) to view their details.'}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#3B82F6' }} />
                                <span>Has shifts</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '2px solid #3B82F6', background: '#DBEAFE' }} />
                                <span>Selected</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '2px solid #111' }} />
                                <span>Today</span>
                            </div>
                        </div>

                        {/* Selection Mode Toggle */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button
                                onClick={() => setSelectionMode('calendar')}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    fontWeight: 500, fontSize: '13px',
                                    background: selectionMode === 'calendar' ? '#3B82F6' : '#F3F4F6',
                                    color: selectionMode === 'calendar' ? 'white' : '#374151',
                                }}
                            >
                                📅 Click Calendar Days
                            </button>
                            <button
                                onClick={() => setSelectionMode('pattern')}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    fontWeight: 500, fontSize: '13px',
                                    background: selectionMode === 'pattern' ? '#3B82F6' : '#F3F4F6',
                                    color: selectionMode === 'pattern' ? 'white' : '#374151',
                                }}
                            >
                                🔢 Enter Day Numbers
                            </button>
                        </div>

                        {/* Pattern Input Mode */}
                        {selectionMode === 'pattern' && (
                            <div style={{ padding: '16px', background: '#F3F4F6', borderRadius: '12px', marginBottom: '16px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
                                    Quick Date Selection
                                </h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6B7280' }}>
                                    Enter day numbers (e.g., 1,5,10,15,20) to select those days of every month within a date range.
                                </p>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                                        Day Numbers (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 1, 5, 10, 15, 20, 25"
                                        value={dayPattern}
                                        onChange={e => setDayPattern(e.target.value)}
                                        style={{
                                            width: '100%', padding: '10px', border: '1px solid #D1D5DB',
                                            borderRadius: '6px', fontSize: '14px'
                                        }}
                                    />
                                </div>

                                {/* Year Selector */}
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                                        Year
                                    </label>
                                    <select
                                        value={patternYear}
                                        onChange={e => setPatternYear(parseInt(e.target.value))}
                                        style={{
                                            width: '100%', padding: '10px', border: '1px solid #D1D5DB',
                                            borderRadius: '6px', fontSize: '14px', background: 'white'
                                        }}
                                    >
                                        {[...Array(3)].map((_, i) => {
                                            const year = new Date().getFullYear() + i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>

                                {/* Month Checkboxes */}
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                        Select Months ({selectedMonths.length} selected)
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                        {MONTHS.map((month, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => togglePatternMonth(idx)}
                                                style={{
                                                    padding: '8px 4px', border: 'none', borderRadius: '6px',
                                                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                                    background: selectedMonths.includes(idx) ? '#3B82F6' : '#F3F4F6',
                                                    color: selectedMonths.includes(idx) ? 'white' : '#374151',
                                                }}
                                            >
                                                {month.slice(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                            onClick={() => setSelectedMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])}
                                            style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setSelectedMonths([])}
                                            style={{ flex: 1, padding: '6px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={generateDatesFromPattern}
                                    disabled={!dayPattern.trim() || selectedMonths.length === 0}
                                    style={{
                                        width: '100%', padding: '10px', border: 'none', borderRadius: '8px',
                                        background: dayPattern.trim() && selectedMonths.length > 0 ? '#10B981' : '#D1D5DB',
                                        color: 'white', fontWeight: 600, cursor: dayPattern.trim() && selectedMonths.length > 0 ? 'pointer' : 'not-allowed',
                                        fontSize: '14px'
                                    }}
                                >
                                    ➕ Generate & Add Dates
                                </button>
                            </div>
                        )}

                        {/* Year Calendar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {getYearCalendar().map((days, monthIdx) => (
                                <div key={monthIdx}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                                        {MONTHS[monthIdx]}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                                        {DAYS.map((d, i) => (
                                            <div key={i} style={{ fontSize: '8px', color: '#9CA3AF', textAlign: 'center', padding: '2px' }}>
                                                {d}
                                            </div>
                                        ))}
                                        {/* Empty cells for first week offset */}
                                        {Array.from({ length: (new Date(currentYear, monthIdx, 1).getDay() + 6) % 7 }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}
                                        {days.map((date, i) => {
                                            const dateStr = formatDate(date);
                                            const shifts = getDayShifts(dateStr);
                                            const isToday = formatDate(new Date()) === dateStr;
                                            const isSelected = selectedDates.has(dateStr);
                                            const hasShifts = shifts.length > 0;

                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => handleDayClick(dateStr)}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        background: isSelected ? '#DBEAFE' : hasShifts ? '#3B82F6' : '#F3F4F6',
                                                        cursor: 'pointer',
                                                        border: isToday ? '2px solid #111' : isSelected ? '2px solid #3B82F6' : 'none',
                                                        fontSize: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: hasShifts && !isSelected ? 'white' : '#374151',
                                                        fontWeight: 500,
                                                        transition: 'all 0.1s',
                                                        position: 'relative',
                                                    }}
                                                    title={`${date.toDateString()}${hasShifts ? ` - ${shifts.length} shift(s) (click ℹ️ to view)` : ''}${isSelected ? ' (selected)' : ''}`}
                                                >
                                                    {date.getDate()}
                                                    {hasShifts && (
                                                        <div
                                                            onClick={(e) => openDayView(dateStr, e)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '-5px',
                                                                right: '-5px',
                                                                width: '12px',
                                                                height: '12px',
                                                                borderRadius: '50%',
                                                                background: shifts.length > 1 ? '#EF4444' : '#10B981',
                                                                color: 'white',
                                                                fontSize: '7px',
                                                                fontWeight: 700,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                border: '1px solid white',
                                                            }}
                                                            title="Click to view shifts"
                                                        >
                                                            {shifts.length}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Shift Form */}
                    <div>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={20} /> Schedule Shifts
                            </h2>

                            {/* Step indicator */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, padding: '8px 12px', background: selectedDates.size > 0 ? '#DCFCE7' : '#F3F4F6', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: selectedDates.size > 0 ? '#166534' : '#6B7280' }}>
                                    ✓ {selectedDates.size} days
                                </div>
                                <div style={{ flex: 1, padding: '8px 12px', background: shiftName ? '#DCFCE7' : '#F3F4F6', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: shiftName ? '#166534' : '#6B7280' }}>
                                    ✓ Shift info
                                </div>
                                <div style={{ flex: 1, padding: '8px 12px', background: selectedEmployees.length > 0 ? '#DCFCE7' : '#F3F4F6', borderRadius: '8px', fontSize: '12px', fontWeight: 500, textAlign: 'center', color: selectedEmployees.length > 0 ? '#166534' : '#6B7280' }}>
                                    ✓ {selectedEmployees.length} staff
                                </div>
                            </div>

                            {/* Shift Name */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Shift Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Morning Shift, Night Shift"
                                    value={shiftName}
                                    onChange={e => setShiftName(e.target.value)}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            {/* Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            {/* Supervisor & Service */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Supervisor</label>
                                    <select
                                        value={selectedSupervisor}
                                        onChange={e => setSelectedSupervisor(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                                    >
                                        <option value="">Select supervisor...</option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Service</label>
                                    <select
                                        value={selectedService}
                                        onChange={e => setSelectedService(e.target.value)}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                                    >
                                        <option value="">Select service...</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Location */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Location</label>
                                <input
                                    type="text"
                                    value={shiftLocation}
                                    onChange={e => setShiftLocation(e.target.value)}
                                    placeholder="Work location"
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>

                            {/* Employee Selection */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                                    Assign Employees
                                </label>

                                {/* Selected employees */}
                                {selectedEmployees.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                        {selectedEmployees.map(empId => {
                                            const emp = employees.find(e => e.id === empId);
                                            return (
                                                <div key={empId} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px', background: '#10B981', color: 'white',
                                                    borderRadius: '20px', fontSize: '13px', fontWeight: 500
                                                }}>
                                                    {emp ? getEmployeeName(emp) : 'Employee'}
                                                    <button
                                                        onClick={() => toggleEmployee(empId)}
                                                        style={{ background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '50%', fontSize: '12px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Search input */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search employees..."
                                        value={employeeSearch}
                                        onChange={e => {
                                            setEmployeeSearch(e.target.value);
                                            if (e.target.value.length >= 2) {
                                                searchEmployees(e.target.value);
                                            }
                                        }}
                                        onFocus={() => setShowEmployeeDropdown(true)}
                                        style={{ width: '100%', padding: '12px', paddingLeft: '40px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                                    />
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                </div>

                                {/* Dropdown */}
                                {showEmployeeDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        zIndex: 50,
                                        width: 'calc(100% - 48px)',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        background: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        marginTop: '4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}>
                                        {employees
                                            .filter(emp => !selectedEmployees.includes(emp.id))
                                            .filter(emp => {
                                                if (!employeeSearch.trim()) return true;
                                                const name = getEmployeeName(emp).toLowerCase();
                                                return name.includes(employeeSearch.toLowerCase());
                                            })
                                            .slice(0, 10)
                                            .map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => {
                                                        toggleEmployee(emp.id);
                                                        setEmployeeSearch('');
                                                    }}
                                                    style={{
                                                        padding: '10px 14px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        borderBottom: '1px solid #F3F4F6',
                                                    }}
                                                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#F3F4F6'}
                                                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'white'}
                                                >
                                                    {getEmployeeName(emp)}
                                                </div>
                                            ))}
                                        {employees
                                            .filter(emp => !selectedEmployees.includes(emp.id))
                                            .filter(emp => {
                                                if (!employeeSearch.trim()) return true;
                                                const name = getEmployeeName(emp).toLowerCase();
                                                return name.includes(employeeSearch.toLowerCase());
                                            }).length === 0 && (
                                                <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                                                    {employeeSearch.trim() ? `No employees matching "${employeeSearch}"` : 'No employees found'}
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            {selectedDates.size > 0 && selectedEmployees.length > 0 && (
                                <div style={{ padding: '12px', background: '#EFF6FF', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#1E40AF' }}>
                                    📊 <strong>{selectedDates.size * selectedEmployees.length}</strong> shift assignments will be created
                                    ({selectedDates.size} days × {selectedEmployees.length} employees)
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={scheduleShifts}
                                disabled={saving || selectedDates.size === 0 || selectedEmployees.length === 0 || !shiftName.trim()}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: (selectedDates.size > 0 && selectedEmployees.length > 0 && shiftName.trim()) ? '#3B82F6' : '#D1D5DB',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    cursor: (selectedDates.size > 0 && selectedEmployees.length > 0 && shiftName.trim()) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                {saving ? (
                                    <>Scheduling...</>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Schedule Shifts
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scheduled Shifts Table */}
                <div id="shifts-table" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                Scheduled Shifts ({filteredShifts.length})
                            </h2>
                            {selectedShiftIds.size > 0 && (
                                <button
                                    onClick={bulkDeleteShifts}
                                    disabled={bulkDeleting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', backgroundColor: '#DC2626', color: 'white',
                                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                        cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                                        opacity: bulkDeleting ? 0.7 : 1,
                                    }}
                                >
                                    <Trash2 size={14} />
                                    {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedShiftIds.size})`}
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select
                                value={filterMonth ?? ''}
                                onChange={e => {
                                    setFilterMonth(e.target.value === '' ? null : parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                                style={{ padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }}
                            >
                                <option value="">All Months</option>
                                {MONTHS.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {paginatedShifts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px', margin: 0 }}>No shifts scheduled yet</p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>Select days from the calendar above and schedule shifts</p>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={paginatedShifts.length > 0 && paginatedShifts.every(s => selectedShiftIds.has(s.id))}
                                                onChange={toggleSelectAllShifts}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B82F6' }}
                                                title="Select all visible shifts"
                                            />
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Date</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Shift</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Time</th>
                                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Employees</th>
                                        <th style={{ textAlign: 'right', padding: '12px', fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedShifts.map(shift => (
                                        <tr key={shift.id} style={{
                                            borderBottom: '1px solid #F3F4F6',
                                            backgroundColor: selectedShiftIds.has(shift.id) ? '#EFF6FF' : 'transparent',
                                        }}>
                                            <td style={{ padding: '14px 12px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedShiftIds.has(shift.id)}
                                                    onChange={() => toggleShiftSelection(shift.id)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B82F6' }}
                                                />
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>
                                                <div style={{ fontWeight: 500 }}>
                                                    {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: shift.shift_color }} />
                                                    {shift.shift_name || 'Shift'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', color: '#6B7280' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={14} />
                                                    {shift.shift_start_time?.slice(0, 5) || '00:00'} - {shift.shift_end_time?.slice(0, 5) || '00:00'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px' }}>
                                                {(shift.assigned_count || 0) > 0 ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Users size={14} style={{ color: '#10B981' }} />
                                                        <span style={{ color: '#10B981', fontWeight: 500 }}>
                                                            {shift.assigned_count} assigned
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#F59E0B' }}>No assignments</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setEditingShift(shift)}
                                                        style={{ padding: '8px', background: '#EFF6FF', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3B82F6' }}
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteShift(shift.id)}
                                                        style={{ padding: '8px', background: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#DC2626' }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                                    <div style={{ fontSize: '14px', color: '#6B7280' }}>
                                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredShifts.length)} of {filteredShifts.length}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            style={{
                                                padding: '8px 12px',
                                                border: '1px solid #E5E7EB',
                                                background: currentPage === 1 ? '#F9FAFB' : 'white',
                                                borderRadius: '6px',
                                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                color: currentPage === 1 ? '#9CA3AF' : '#374151'
                                            }}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const page = i + 1;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    style={{
                                                        padding: '8px 14px',
                                                        border: currentPage === page ? 'none' : '1px solid #E5E7EB',
                                                        background: currentPage === page ? '#3B82F6' : 'white',
                                                        color: currentPage === page ? 'white' : '#374151',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: currentPage === page ? 600 : 400
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                        {totalPages > 5 && <span style={{ padding: '8px' }}>...</span>}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            style={{
                                                padding: '8px 12px',
                                                border: '1px solid #E5E7EB',
                                                background: currentPage === totalPages ? '#F9FAFB' : 'white',
                                                borderRadius: '6px',
                                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                color: currentPage === totalPages ? '#9CA3AF' : '#374151'
                                            }}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Click outside to close dropdown */}
            {showEmployeeDropdown && (
                <div
                    onClick={() => setShowEmployeeDropdown(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
            )}

            {/* Edit Shift Modal */}
            {editingShift && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '450px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                ✏️ Edit Shift - {new Date(editingShift.date).toLocaleDateString()}
                            </h3>
                            <button onClick={() => setEditingShift(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Editable Shift Name */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Shift Name</label>
                            <input
                                type="text"
                                value={editShiftName}
                                onChange={e => setEditShiftName(e.target.value)}
                                style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>

                        {/* Editable Start/End Time */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Start Time</label>
                                <input
                                    type="time"
                                    value={editStartTime}
                                    onChange={e => setEditStartTime(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>End Time</label>
                                <input
                                    type="time"
                                    value={editEndTime}
                                    onChange={e => setEditEndTime(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        {/* Assigned Employees with remove button */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                                Assigned Employees ({loadingShiftDetails ? '...' : (editingShift.work_entries?.length || editingShift.assigned_count || 0)})
                            </label>
                            {loadingShiftDetails ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                                    <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    <span style={{ marginLeft: '8px' }}>Loading employees...</span>
                                </div>
                            ) : (editingShift.work_entries || []).length > 0 ? (
                                (editingShift.work_entries || []).map(entry => {
                                    const statusColor = entry.status === 'approved' ? '#10B981'
                                        : entry.status === 'pending' || entry.status === 'submitted' ? '#F59E0B'
                                            : entry.status === 'rejected' ? '#EF4444'
                                                : '#9CA3AF';
                                    const statusLabel = entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : 'Planned';

                                    return (
                                        <div key={entry.id} style={{ padding: '10px', background: '#F3F4F6', borderRadius: '8px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} title={statusLabel} />
                                                {entry.employee_name}
                                                {entry.calculated_hours && parseFloat(entry.calculated_hours) > 0 && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '2px 6px',
                                                        backgroundColor: statusColor,
                                                        color: 'white',
                                                        borderRadius: '4px',
                                                    }}>
                                                        {entry.calculated_hours}h
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeEmployeeFromShift(entry.id, entry.employee_name)}
                                                style={{ padding: '4px 8px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E' }}>
                                    No employees assigned to this shift
                                </div>
                            )}

                            {/* Add Employee Button/Dropdown */}
                            <div style={{ marginTop: '12px', position: 'relative' }}>
                                <button
                                    onClick={() => setShowEditEmployeeDropdown(!showEditEmployeeDropdown)}
                                    style={{ width: '100%', padding: '10px', background: '#EFF6FF', color: '#3B82F6', border: '1px dashed #3B82F6', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                >
                                    ➕ Add Employee
                                </button>

                                {showEditEmployeeDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        zIndex: 100,
                                        marginTop: '4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}>
                                        {/* Search input */}
                                        <input
                                            type="text"
                                            placeholder="🔍 Search employees..."
                                            value={editEmployeeSearch}
                                            onChange={e => setEditEmployeeSearch(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                width: '100%', padding: '10px 12px', border: 'none',
                                                borderBottom: '1px solid #E5E7EB', fontSize: '13px', outline: 'none'
                                            }}
                                        />
                                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {getAvailableEmployeesForEdit()
                                                .filter(emp => {
                                                    if (!editEmployeeSearch.trim()) return true;
                                                    return getEmployeeName(emp).toLowerCase().includes(editEmployeeSearch.toLowerCase());
                                                })
                                                .slice(0, 15)
                                                .map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => { addEmployeeToShift(emp.id); setEditEmployeeSearch(''); }}
                                                        style={{
                                                            padding: '10px 14px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            borderBottom: '1px solid #F3F4F6',
                                                        }}
                                                        onMouseEnter={e => (e.target as HTMLElement).style.background = '#F3F4F6'}
                                                        onMouseLeave={e => (e.target as HTMLElement).style.background = 'white'}
                                                    >
                                                        {getEmployeeName(emp)}
                                                    </div>
                                                ))}
                                            {getAvailableEmployeesForEdit().filter(emp => {
                                                if (!editEmployeeSearch.trim()) return true;
                                                return getEmployeeName(emp).toLowerCase().includes(editEmployeeSearch.toLowerCase());
                                            }).length === 0 && (
                                                    <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                                                        {editEmployeeSearch.trim()
                                                            ? `No employees matching "${editEmployeeSearch}"`
                                                            : 'All employees are already assigned'}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={saveEditedShift}
                                disabled={saving}
                                style={{ flex: 1, padding: '12px', background: saving ? '#9CA3AF' : '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                            >
                                {saving ? 'Saving...' : 'Save & Done'}
                            </button>
                            <button
                                onClick={() => { setEditingShift(null); setShowEditEmployeeDropdown(false); setEditEmployeeSearch(''); }}
                                style={{ padding: '12px 20px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Day Modal - Shows all shifts for a specific date */}
            {viewingDate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                📅 {new Date(viewingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            <button onClick={() => setViewingDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {getDayShifts(viewingDate).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                                <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>No shifts scheduled for this date</p>
                            </div>
                        ) : (
                            <div>
                                {getDayShifts(viewingDate).map(shift => (
                                    <div key={shift.id} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: shift.shift_color }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{shift.shift_name || 'Shift'}</div>
                                                    <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} />
                                                        {shift.shift_start_time?.slice(0, 5)} - {shift.shift_end_time?.slice(0, 5)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => { openEditModal(shift); setViewingDate(null); }}
                                                    style={{ padding: '6px 10px', background: '#EFF6FF', color: '#3B82F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => { deleteShift(shift.id); setViewingDate(null); }}
                                                    style={{ padding: '6px 10px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        {/* Assigned Employees Count */}
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                                                Assigned Employees ({shift.assigned_count || 0})
                                            </div>
                                            {(shift.assigned_count || 0) > 0 ? (
                                                <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 500 }}>
                                                    ✓ {shift.assigned_count} employee{(shift.assigned_count || 0) > 1 ? 's' : ''} assigned
                                                    <span style={{ marginLeft: '8px', color: '#6B7280', fontWeight: 400 }}>(click Edit to manage)</span>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '13px', color: '#F59E0B', fontStyle: 'italic' }}>
                                                    No employees assigned yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Quick Add Shift Section */}
                        {!showQuickAdd ? (
                            <button
                                onClick={() => setShowQuickAdd(true)}
                                style={{ width: '100%', padding: '12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
                            >
                                ➕ Add New Shift
                            </button>
                        ) : (
                            <div style={{ marginTop: '16px', padding: '16px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#166534' }}>
                                    ➕ Quick Add Shift
                                </h4>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Shift Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Morning Shift"
                                        value={quickAddName}
                                        onChange={e => setQuickAddName(e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Start</label>
                                        <input
                                            type="time"
                                            value={quickAddStart}
                                            onChange={e => setQuickAddStart(e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>End</label>
                                        <input
                                            type="time"
                                            value={quickAddEnd}
                                            onChange={e => setQuickAddEnd(e.target.value)}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                                        Assign Employees ({quickAddEmployees.length} selected)
                                    </label>
                                    {/* Search input */}
                                    <input
                                        type="text"
                                        placeholder="🔍 Search employees..."
                                        value={quickAddSearch}
                                        onChange={e => setQuickAddSearch(e.target.value)}
                                        style={{
                                            width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
                                            borderRadius: '6px 6px 0 0', fontSize: '13px', borderBottom: 'none'
                                        }}
                                    />
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #D1D5DB', borderRadius: '0 0 6px 6px', background: 'white' }}>
                                        {employees
                                            .filter(emp => {
                                                if (!quickAddSearch.trim()) return true;
                                                return getEmployeeName(emp).toLowerCase().includes(quickAddSearch.toLowerCase());
                                            })
                                            .slice(0, 20)
                                            .map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => toggleQuickAddEmployee(emp.id)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        borderBottom: '1px solid #F3F4F6',
                                                        background: quickAddEmployees.includes(emp.id) ? '#DCFCE7' : 'white'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '16px', height: '16px', borderRadius: '4px',
                                                        border: quickAddEmployees.includes(emp.id) ? 'none' : '2px solid #D1D5DB',
                                                        background: quickAddEmployees.includes(emp.id) ? '#10B981' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: '10px'
                                                    }}>
                                                        {quickAddEmployees.includes(emp.id) && '✓'}
                                                    </div>
                                                    {getEmployeeName(emp)}
                                                </div>
                                            ))}
                                        {employees.filter(emp => {
                                            if (!quickAddSearch.trim()) return true;
                                            return getEmployeeName(emp).toLowerCase().includes(quickAddSearch.toLowerCase());
                                        }).length === 0 && (
                                                <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                                                    No employees matching "{quickAddSearch}"
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={quickAddShift}
                                        disabled={saving || !quickAddName.trim()}
                                        style={{
                                            flex: 1, padding: '10px', background: quickAddName.trim() ? '#10B981' : '#D1D5DB',
                                            color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600,
                                            cursor: quickAddName.trim() ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        {saving ? 'Adding...' : 'Add Shift'}
                                    </button>
                                    <button
                                        onClick={() => { setShowQuickAdd(false); setQuickAddName(''); setQuickAddEmployees([]); setQuickAddSearch(''); }}
                                        style={{ padding: '10px 16px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setViewingDate(null)}
                            style={{ width: '100%', padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
