/**
 * HR view models — leave requests, attendance, and payroll.
 *
 * Backed by /api/hr/. These pages previously rendered `setState([])` and had
 * no backend at all.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiGet, apiMutate } from '@/hooks/useApi';
import { extractResults } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  is_paid: boolean;
  requires_approval: boolean;
  max_days_per_year: number | null;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  employee_name: string;
  leave_type: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by_email?: string;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
}

export interface AttendanceRecord {
  employee: string;
  employee_name: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  planned_start: string | null;
  actual_start: string | null;
  minutes_late: number;
  hours: string;
  work_entry: string | null;
  leave_type: string | null;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string;
  total_gross: string;
  employee_count: number;
}

export interface Payslip {
  id: string;
  period: string;
  period_name: string;
  employee: string;
  employee_name: string;
  total_hours: string;
  gross_pay: string;
  deductions: string;
  net_pay: string;
  status: 'draft' | 'pending' | 'paid';
}

// ─── Leave requests ──────────────────────────────────────────

export function useLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const [list, types] = await Promise.all([
        apiGet<unknown>(`/hr/leave-requests/${query}`),
        apiGet<unknown>('/hr/leave-types/?is_active=true'),
      ]);
      setRequests(extractResults<LeaveRequest>(list));
      setLeaveTypes(extractResults<LeaveType>(types));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const review = useCallback(async (id: string, action: 'approve' | 'reject', notes = '') => {
    setBusyId(id);
    try {
      await apiMutate(`/hr/leave-requests/${id}/${action}/`, 'POST', { notes });
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter(r =>
      r.employee_name?.toLowerCase().includes(term) ||
      r.leave_type_name?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term));
  }, [requests, searchQuery]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  return {
    requests: filtered, leaveTypes, loading, error, counts,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    busyId, approve: (id: string, notes?: string) => review(id, 'approve', notes),
    reject: (id: string, notes?: string) => review(id, 'reject', notes),
    reload: load,
  };
}

// ─── Attendance ──────────────────────────────────────────────

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(30));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await apiGet<unknown>(`/hr/attendance/?${params}`);
      setRecords(extractResults<AttendanceRecord>(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return records;
    return records.filter(r => r.employee_name?.toLowerCase().includes(term));
  }, [records, searchQuery]);

  const counts = useMemo(() => ({
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    leave: records.filter(r => r.status === 'leave').length,
  }), [records]);

  return {
    records: filtered, loading, error, counts,
    dateFrom, setDateFrom, dateTo, setDateTo,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery, reload: load,
  };
}

// ─── Payroll ─────────────────────────────────────────────────

export function usePayroll() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const data = await apiGet<unknown>(`/hr/payroll-periods/${query}`);
      setPeriods(extractResults<PayrollPeriod>(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll periods');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  const loadPayslips = useCallback(async (periodId: string) => {
    setSelectedPeriod(periodId);
    try {
      const data = await apiGet<unknown>(`/hr/payslips/?period=${periodId}`);
      setPayslips(extractResults<Payslip>(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payslips');
    }
  }, []);

  const createPeriod = useCallback(async (body: {
    name: string; start_date: string; end_date: string; notes?: string;
  }) => {
    setBusy(true);
    try {
      await apiMutate('/hr/payroll-periods/', 'POST', body);
      await loadPeriods();
    } finally {
      setBusy(false);
    }
  }, [loadPeriods]);

  const generate = useCallback(async (periodId: string) => {
    setBusy(true);
    try {
      await apiMutate(`/hr/payroll-periods/${periodId}/generate/`, 'POST');
      await loadPeriods();
      await loadPayslips(periodId);
    } finally {
      setBusy(false);
    }
  }, [loadPeriods, loadPayslips]);

  const markPaid = useCallback(async (periodId: string) => {
    setBusy(true);
    try {
      await apiMutate(`/hr/payroll-periods/${periodId}/mark_paid/`, 'POST');
      await loadPeriods();
      if (selectedPeriod === periodId) await loadPayslips(periodId);
    } finally {
      setBusy(false);
    }
  }, [loadPeriods, loadPayslips, selectedPeriod]);

  const totals = useMemo(() => ({
    periods: periods.length,
    pending: periods.filter(p => p.status === 'pending').length,
    paid: periods.filter(p => p.status === 'paid').length,
    grossTotal: periods.reduce((sum, p) => sum + Number(p.total_gross || 0), 0),
  }), [periods]);

  return {
    periods, payslips, selectedPeriod, loading, error, busy, totals,
    statusFilter, setStatusFilter,
    loadPayslips, createPeriod, generate, markPaid, reload: loadPeriods,
  };
}

// ─── Contracts ───────────────────────────────────────────────

export interface ContractRow {
  id: number;
  employee: string;
  employee_name: string;
  hourly_rate: string;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'expiring' | 'expired';
  days_remaining: number | null;
  notes: string;
  contract_document: string | null;
}

export function useContracts() {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const data = await apiGet<unknown>(`/employees/profiles/contracts/${query}`);
      setContracts(extractResults<ContractRow>(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return contracts;
    return contracts.filter(c => c.employee_name?.toLowerCase().includes(term));
  }, [contracts, searchQuery]);

  const counts = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiring: contracts.filter(c => c.status === 'expiring').length,
    expired: contracts.filter(c => c.status === 'expired').length,
  }), [contracts]);

  return {
    contracts: filtered, loading, error, counts,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery, reload: load,
  };
}
