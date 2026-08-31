/**
 * useWorklogs — ViewModel for the Work Logs list page.
 * Encapsulates all state, API calls, filtering, and CRUD logic.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, WorkEntry } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { apiFetch } from '@/hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Types ──────────────────────────────────────────────────
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

export interface Project {
  id: string;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────
function getWeekStartDate(weekStr: string): string {
  const match = weekStr.match(/(\d{4})-W(\d{2})/);
  if (!match) return '';
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const firstMonday = new Date(year, 0, 1 + daysToMonday + (week - 1) * 7);
  return firstMonday.toISOString().split('T')[0];
}

function getWeekEndDate(weekStr: string): string {
  const startDate = getWeekStartDate(weekStr);
  if (!startDate) return '';
  const date = new Date(startDate);
  date.setDate(date.getDate() + 6);
  return date.toISOString().split('T')[0];
}

// ─── Default form data ─────────────────────────────────────
function getDefaultFormData() {
  return {
    employee: '',
    customer: '',
    project: '',
    supervisor: '',
    service: '',
    location_override: '',
    start_datetime: new Date().toISOString().slice(0, 16),
    end_datetime: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
    break_start_time: '12:00',
    break_end_time: '12:30',
    notes: '',
    status: 'draft'
  };
}

// ─── Hook ───────────────────────────────────────────────────
export function useWorklogs() {
  const { t } = useLanguage();
  const router = useRouter();

  // Core list state
  const [workLogs, setWorkLogs] = useState<WorkEntry[]>([]);
  const [pendingLogs, setPendingLogs] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterEmployees, setFilterEmployees] = useState<string[]>([]);
  const [filterStartWeek, setFilterStartWeek] = useState('');
  const [filterEndWeek, setFilterEndWeek] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSupervisors, setFilterSupervisors] = useState<{ id: string; full_name: string }[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchFilter, setEmployeeSearchFilter] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [customerSearchFilter, setCustomerSearchFilter] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [supervisorSearchFilter, setSupervisorSearchFilter] = useState('');
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);

  // Modal / form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [allowances, setAllowances] = useState<WorkLogAllowance[]>([]);

  // Relational data
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // Quick status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Loaders ────────────────────────────────────────────
  async function loadWorkLogs() {
    setLoading(true);
    setError(null);
    try {
      const [allResponse, pending, unassignedRes] = await Promise.all([
        api.getWorkEntries({ include_past: true, page_size: 9999 }),
        api.getPendingWorkEntries(),
        apiFetch(`/projects/planned-days/unassigned_shifts/`).then(r =>
          r.ok ? r.json() : { results: [] },
        ),
      ]);
      const workEntries = allResponse.results || [];
      const unassignedShifts = (unassignedRes.results || []).map(
        (shift: any) => ({
          ...shift,
          id: `unassigned-${shift.id}`,
          employee: null,
          actual_start_datetime: shift.start_time ? `${shift.work_date}T${shift.start_time}:00` : null,
          actual_end_datetime: shift.end_time ? `${shift.work_date}T${shift.end_time}:00` : null,
          calculated_hours: '0.00',
          break_duration: '0:00'
        }),
      );
      setWorkLogs([...workEntries, ...unassignedShifts]);
      setPendingLogs(pending || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work logs');
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const response = await apiFetch(`/projects/projects/`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.results || data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  async function loadCustomers() {
    try {
      const response = await apiFetch(`/customers/customers/`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(
          (data.results || data).map((c: any) => ({ id: c.id, company_name: c.company_name })),
        );
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }

  async function loadAllowanceTypes() {
    try {
      const response = await apiFetch(`/employees/allowance-types/`);
      if (response.ok) {
        const data = await response.json();
        setAllowanceTypes(data.results || data);
      }
    } catch (err) {
      console.error('Failed to load allowance types:', err);
    }
  }

  async function loadEmployees() {
    try {
      const response = await apiFetch(`/employees/profiles/`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }

  async function loadFilterSupervisors(customerId: string) {
    if (!customerId) {
      setFilterSupervisors([]);
      setFilterSupervisor('');
      return;
    }
    try {
      const response = await apiFetch(`/customers/outfolders/?customer=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        const allOutfolders = data.results || data;
        const filtered = allOutfolders.filter((o: any) => o.customer === customerId);
        setFilterSupervisors(
          filtered.map((o: any) => ({ id: o.id, full_name: o.company_name || 'Unknown Rayon' })),
        );
      }
    } catch {
      console.error('Failed to load supervisors for filter');
    }
  }

  async function loadCustomerData(projectId: string) {
    if (!projectId) {
      setSupervisors([]);
      setServices([]);
      return;
    }
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      const [supervisorsRes, servicesRes] = await Promise.all([
        apiFetch(`/customers/worklog-customers/${(project as any).customer}/outfolders/`),
        apiFetch(`/customers/worklog-customers/${(project as any).customer}/services/`),
      ]);
      if (supervisorsRes.ok) {
        const data = await supervisorsRes.json();
        setSupervisors(Array.isArray(data) ? data : data.results || []);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error('Failed to load customer data:', e);
    }
  }

  // ─── Initial load ─────────────────────────────────────
  useEffect(() => {
    loadWorkLogs();
    loadProjects();
    loadAllowanceTypes();
    loadEmployees();
    loadCustomers();
  }, []);

  // ─── Actions ──────────────────────────────────────────
  async function handleStatusChange(logId: string, newStatus: string) {
    try {
      const response = await apiFetch(`/worklogs/${logId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        await loadWorkLogs();
      } else {
        const error = await response.json();
        alert(JSON.stringify(error));
      }
    } catch {
      alert('Failed to update status');
    }
    setStatusDropdownOpen(null);
  }

  async function handleApprove(id: string) {
    try {
      await api.approveWorkEntry(id);
      await loadWorkLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.rejectWorkEntry(id, reason);
      await loadWorkLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this work log? This action cannot be undone.'))
      return;
    try {
      await api.deleteWorkEntry(id);
      await loadWorkLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  // ─── Bulk ─────────────────────────────────────────────
  const displayedLogs = filter === 'pending' ? pendingLogs : workLogs;

  function toggleSelectAll() {
    if (selectedIds.size === displayedLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedLogs.map(log => log.id)));
    }
  }

  function toggleSelectOne(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} work log(s)?`)) return;
    try {
      for (const id of selectedIds) await api.deleteWorkEntry(id);
      setSelectedIds(new Set());
      await loadWorkLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete some work logs');
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    const approvableIds = Array.from(selectedIds).filter(id => {
      const log = workLogs.find((w: WorkEntry) => w.id === id);
      return log && log.status !== 'approved' && log.status !== 'cancelled';
    });
    if (approvableIds.length === 0) {
      alert('No work logs can be approved.');
      return;
    }
    const nonPendingCount = approvableIds.filter(id => {
      const log = workLogs.find((w: WorkEntry) => w.id === id);
      return log && !['pending', 'submitted'].includes(log.status);
    }).length;
    let confirmMsg = `Are you sure you want to approve ${approvableIds.length} work log(s)?`;
    if (nonPendingCount > 0) {
      confirmMsg = `⚠️ WARNING: ${nonPendingCount} work log(s) are not in pending status.\n\nApprove ${approvableIds.length} work log(s)?`;
    }
    if (!confirm(confirmMsg)) return;
    try {
      let approvedCount = 0;
      const errors: string[] = [];
      for (const id of approvableIds) {
        try {
          await api.approveWorkEntry(id);
          approvedCount++;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : 'Unknown error');
        }
      }
      setSelectedIds(new Set());
      await loadWorkLogs();
      if (errors.length > 0) alert(`Approved ${approvedCount}. ${errors.length} failed.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve some work logs');
    }
  }

  // ─── Modal helpers ────────────────────────────────────
  function openModal() {
    setFormData(getDefaultFormData());
    setAllowances([]);
    setSupervisors([]);
    setServices([]);
    setEmployeeSearch('');
    setShowEmployeeDropdown(false);
    setEditingId(null);
    setShowModal(true);
  }

  async function openEditModal(log: WorkEntry) {
    let freshLog = log;
    try {
      const response = await apiFetch(`/worklogs/${log.id}/`);
      if (response.ok) freshLog = await response.json();
    } catch {
      // Fall back to cached
    }
    const employeeObj = employees.find(e => e.id === (freshLog as any).employee);
    const projectId = (freshLog as any).project || '';
    const projectObj = projects.find(p => p.id === projectId);
    const customerId = (projectObj as any)?.customer || '';

    const toLocalDatetimeString = (isoString: string | null | undefined): string => {
      if (!isoString) return new Date().toISOString().slice(0, 16);
      return isoString.slice(0, 16);
    };

    setFormData({
      employee: (freshLog as any).employee || '',
      customer: customerId,
      project: projectId,
      supervisor: (freshLog as any).supervisor || '',
      service: (freshLog as any).service || '',
      location_override: freshLog.location || '',
      start_datetime: freshLog.actual_start_datetime
        ? toLocalDatetimeString(freshLog.actual_start_datetime)
        : freshLog.work_date && freshLog.planned_start_time
          ? `${freshLog.work_date}T${freshLog.planned_start_time.substring(0, 5)}`
          : new Date().toISOString().slice(0, 16),
      end_datetime: freshLog.actual_end_datetime
        ? toLocalDatetimeString(freshLog.actual_end_datetime)
        : freshLog.work_date && freshLog.planned_end_time
          ? `${freshLog.work_date}T${freshLog.planned_end_time.substring(0, 5)}`
          : new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
      break_start_time: (freshLog as any).break_start_time?.substring(0, 5) || '12:00',
      break_end_time: (freshLog as any).break_end_time?.substring(0, 5) || '12:30',
      notes: (freshLog as any).notes || '',
      status: freshLog.status || 'draft'
    });

    if ((freshLog as any).allowances?.length > 0) {
      setAllowances(
        (freshLog as any).allowances.map((a: any) => ({
          allowance_type: a.allowance_type,
          custom_allowance_name: a.custom_allowance_name || '',
          hours: String(a.hours || ''),
          notes: a.notes || '',
          start_time: a.start_time || '',
          end_time: a.end_time || ''
        })),
      );
    } else {
      setAllowances([]);
    }

    if (projectId) await loadCustomerData(projectId);
    setEmployeeSearch(employeeObj?.full_name || freshLog.employee_name || '');
    setShowEmployeeDropdown(false);
    setEditingId(freshLog.id);
    setShowModal(true);
  }

  function addAllowance() {
    setAllowances([
      ...allowances,
      { allowance_type: null, custom_allowance_name: '', hours: '', notes: '' },
    ]);
  }

  function updateAllowance(index: number, field: keyof WorkLogAllowance, value: string | number | null) {
    const updated = [...allowances];
    (updated[index] as any)[field] = value;
    if (field === 'allowance_type' && value !== null) updated[index].custom_allowance_name = '';
    setAllowances(updated);
  }

  function removeAllowance(index: number) {
    setAllowances(allowances.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!formData.employee) { alert('Please select an employee'); return; }
    if (!formData.customer) { alert('Please select a customer'); return; }
    if (!formData.project) { alert('Please select a project'); return; }
    if (!formData.break_start_time || !formData.break_end_time) { alert('Please enter break times'); return; }

    setSaving(true);
    try {
      const workDate = formData.start_datetime?.split('T')[0] || '';
      const payload: any = {
        project: formData.project,
        employee: formData.employee,
        work_date: workDate,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        break_start_time: formData.break_start_time,
        break_end_time: formData.break_end_time,
        notes: formData.notes,
        location_override: formData.location_override,
        status: formData.status,
        allowances: allowances
          .filter(a => a.hours && (a.allowance_type || a.custom_allowance_name))
          .map(a => ({
            allowance_type: a.allowance_type,
            custom_allowance_name: a.custom_allowance_name,
            hours: parseFloat(a.hours),
            notes: a.notes,
            start_time: a.start_time || null,
            end_time: a.end_time || null
          }))
      };
      if (formData.supervisor) payload.supervisor = formData.supervisor;
      if (formData.service) payload.service = formData.service;

      const url = editingId ? `${API_URL}/worklogs/${editingId}/` : `${API_URL}/worklogs/`;
      const method = editingId ? 'PATCH' : 'POST';
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        setEditingId(null);
        await loadWorkLogs();
      } else {
        const error = await response.json();
        alert(JSON.stringify(error));
      }
    } catch {
      alert(editingId ? 'Failed to update work log' : 'Failed to create work log');
    } finally {
      setSaving(false);
    }
  }

  // ─── Filtered / computed ──────────────────────────────
  const displayLogs = filter === 'pending' ? pendingLogs : workLogs;
  const filteredLogs = displayLogs.filter(log => {
    if (
      search &&
      !log.employee_name?.toLowerCase().includes(search.toLowerCase()) &&
      !log.project_name?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (filterCustomer) {
      const project = projects.find(p => p.id === (log as any).project);
      if ((project as any)?.customer !== filterCustomer) return false;
    }
    if (filterSupervisor && (log as any).supervisor !== filterSupervisor) return false;
    if (filterEmployees.length > 0 && !filterEmployees.includes((log as any).employee)) return false;
    if (filterStartWeek || filterEndWeek) {
      const logDate = log.work_date;
      if (filterStartWeek && logDate < getWeekStartDate(filterStartWeek)) return false;
      if (filterEndWeek && logDate > getWeekEndDate(filterEndWeek)) return false;
    }
    if (filterStartDate && log.work_date < filterStartDate) return false;
    if (filterEndDate && log.work_date > filterEndDate) return false;
    if (filterStatuses.length > 0 && !filterStatuses.includes(log.status)) return false;
    return true;
  });

  const stats = {
    total: workLogs.length,
    pending: workLogs.filter(w => ['pending', 'submitted', 'draft'].includes(w.status)).length,
    approved: workLogs.filter(w => w.status === 'approved').length,
    rejected: workLogs.filter(w => w.status === 'rejected').length
  };

  // ─── Return ───────────────────────────────────────────
  return {
    t, router,

    // List
    workLogs, pendingLogs, displayedLogs, loading, error,
    filter, setFilter, search, setSearch,
    filteredLogs, stats,

    // Advanced filters
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

    // Modal / form
    showModal, setShowModal,
    editingId, setEditingId,
    saving,
    projects, allowanceTypes,
    formData, setFormData,
    allowances, setAllowances,
    employees, employeeSearch, setEmployeeSearch,
    customers, supervisors, setSupervisors, services, setServices,
    selectedCustomer, setSelectedCustomer,
    loadCustomerData,

    // Quick status
    statusDropdownOpen, setStatusDropdownOpen,

    // Bulk
    selectedIds, setSelectedIds,
    toggleSelectAll, toggleSelectOne,
    handleBulkDelete, handleBulkApprove,

    // Actions
    handleStatusChange, handleApprove, handleReject, handleDelete,
    openModal, openEditModal,
    addAllowance, updateAllowance, removeAllowance,
    handleSubmit,
    loadWorkLogs
  };
}
