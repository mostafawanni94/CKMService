/**
 * useInvoices — ViewModel for the page of the same name.
 *
 * Extracted from the page, which held its state, its fetching and its handlers
 * inline alongside the markup. The page composes; this decides.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { apiDownload, apiFetch, apiGetAll } from '@/hooks/useApi';
import ExcelJS from 'exceljs';
import type { Invoice } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface InvoiceDetail {
    id: string;
    invoice_number: string;
    customer: string;
    customer_name: string;
    week_year: number;
    week_number: number;
    week_start_date: string;
    week_end_date: string;
    subtotal: number;
    total_costs: number;
    total_allowances: number;
    total_gratuities: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    status: string;
    lines: InvoiceLine[];
    costs: InvoiceCost[];
    allowance_lines: InvoiceAllowance[];
    gratuity_lines: InvoiceGratuity[];
}

export interface InvoiceLine {
    id: string;
    project_name: string;
    employee_name: string;
    description: string;
    quantity_hours: number;
    hourly_rate: number;
    total: number;
}

export interface InvoiceCost {
    id: string;
    cost_type_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export interface InvoiceAllowance {
    id: string;
    employee_name: string;
    allowance_name: string;
    allowance_type_name?: string;
    custom_name?: string;
    quantity_hours: number;
    hourly_rate: number;
    total: number;
}

export interface InvoiceGratuity {
    id: string;
    employee_name: string;
    description: string;
    amount: number;
}


export function useInvoices() {
    // Server-side paging; the count comes from the API.
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Detail modal
    const router = useRouter();
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Advanced filters
    const [customers, setCustomers] = useState<{ id: string, company_name: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: string, full_name: string }[]>([]);
    const [supervisors, setSupervisors] = useState<{ id: string, full_name: string }[]>([]);

    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [weekStart, setWeekStart] = useState('');
    const [weekEnd, setWeekEnd] = useState('');
    const [worklogStatusFilter, setWorklogStatusFilter] = useState('approved'); // 'all', 'approved', 'pending', 'rejected'
    const [showFilters, setShowFilters] = useState(false);

    // Search states for dropdowns
    const [customerSearch, setCustomerSearch] = useState('');
    const [supervisorSearch, setSupervisorSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    // Worklogs for export
    const [worklogs, setWorklogs] = useState<any[]>([]);
    const [loadingWorklogs, setLoadingWorklogs] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Toast message for invoice actions
    const [invoiceMessage, setInvoiceMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Customer surcharge types
    const [customerSurcharges, setCustomerSurcharges] = useState<{ name: string; percentage: number }[]>([]);

    useEffect(() => {
        loadFilterData();
    }, []);

    useEffect(() => {
        loadInvoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize]);

    // Load worklogs when filters change
    useEffect(() => {
        if (selectedCustomer || weekStart || weekEnd || selectedEmployees.length > 0 || worklogStatusFilter) {
            loadFilteredWorklogs();
        }
    }, [selectedCustomer, selectedSupervisor, weekStart, weekEnd, selectedEmployees, worklogStatusFilter]);

    // Load customer surcharge types when customer is selected
    useEffect(() => {
        if (selectedCustomer) {
            loadCustomerSurcharges(selectedCustomer);
        } else {
            setCustomerSurcharges([]);
        }
    }, [selectedCustomer]);

    async function loadCustomerSurcharges(customerId: string) {
        try {
            const response = await apiFetch(`/customers/${customerId}/`);
            if (response.ok) {
                const customerData = await response.json();
                console.log('Customer data for surcharges:', customerData);
                // Get enabled service surcharges with name and percentage
                const surcharges = (customerData.service_surcharges || [])
                    .filter((s: any) => s.is_enabled)
                    .map((s: any) => ({
                        name: s.surcharge_type_name || s.name || 'Unknown',
                        percentage: s.percentage || 0
                    }));
                console.log('Loaded surcharges:', surcharges);
                setCustomerSurcharges(surcharges);
            }
        } catch (e) {
            console.error('Failed to load customer surcharges:', e);
        }
    }

    // Helper function to calculate hours for a worklog within the filtered week range
    // This handles cross-week shifts by only counting hours that fall within the selected weeks
    function getFilteredHours(worklog: any): number {
        // If no week filter or no breakdown available, use total calculated hours
        if (!weekStart && !weekEnd) {
            return parseFloat(worklog.calculated_hours) || 0;
        }

        // Parse filter week range
        const [startYear, startWeek] = weekStart ? weekStart.split('-W').map(Number) : [0, 0];
        const [endYear, endWeek] = weekEnd ? weekEnd.split('-W').map(Number) : [startYear, 52];

        // Use weekly_hours_breakdown if available (for cross-week support)
        if (worklog.weekly_hours_breakdown && Array.isArray(worklog.weekly_hours_breakdown)) {
            let filteredHours = 0;
            for (const entry of worklog.weekly_hours_breakdown) {
                const { year, week, hours } = entry;
                // Check if this week falls within our filter range
                if (year === startYear && week >= startWeek && week <= endWeek) {
                    filteredHours += hours;
                }
            }
            return filteredHours;
        }

        // Fallback: use total hours if breakdown not available
        return parseFloat(worklog.calculated_hours) || 0;
    }

    async function loadFilteredWorklogs() {
        setLoadingWorklogs(true);
        try {
            let url = `${API_URL}/worklogs/?`;
            const params = new URLSearchParams();

            // Always include past entries for invoice generation
            params.append('include_past', 'true');

            if (selectedCustomer) params.append('customer', selectedCustomer);
            if (selectedSupervisor) params.append('supervisor', selectedSupervisor);

            // Week range filter - send both start and end year/week for cross-year support
            if (weekStart) {
                const [year, week] = weekStart.split('-W');
                params.append('week_start_year', year);
                params.append('week_start_number', week);
            }
            if (weekEnd) {
                const [year, week] = weekEnd.split('-W');
                params.append('week_end_year', year);
                params.append('week_end_number', week);
            }

            if (selectedEmployees.length > 0) {
                selectedEmployees.forEach(empId => params.append('employee', empId));
            }

            // Worklog status filter
            if (worklogStatusFilter && worklogStatusFilter !== 'all') {
                params.append('status', worklogStatusFilter);
            }

            const response = await apiFetch(url + params.toString(), {
            });

            if (response.ok) {
                const data = await response.json();
                const results = Array.isArray(data) ? data : data.results || [];
                setWorklogs(results);
            }
        } catch (e) {
            console.error('Failed to load worklogs:', e);
        } finally {
            setLoadingWorklogs(false);
        }
    }

    // Excel Export - Full Version (for Customer)
    // Uses backend endpoint that loads Master.xlsx template for exact design match
    async function exportExcelForCustomer(exportType: 'hr' | 'finance' = 'hr') {
        if (!selectedCustomer) {
            alert('Please select a customer first.');
            return;
        }
        if (worklogs.length === 0) {
            alert('No worklogs to export. Please adjust your filters.');
            return;
        }

        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('customer_id', selectedCustomer);
            params.append('export_type', exportType);

            if (weekStart) params.append('week_start', weekStart);
            if (weekEnd) params.append('week_end', weekEnd);
            if (selectedSupervisor) params.append('supervisor_id', selectedSupervisor);
            if (selectedEmployees.length > 0) {
                params.append('employee_ids', selectedEmployees.join(','));
            }


            // Call the backend export endpoint
            const response = await apiFetch(`/worklogs/export/customer/?${params.toString()}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Extract filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Inleenovereenkomst_${new Date().toISOString().split('T')[0]}.xlsx`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowExportModal(false);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export Excel file. Please try again.');
        }
    }


    // Excel Export - Simple Version (for Employee)
    async function exportExcelForEmployee() {
        if (worklogs.length === 0) {
            alert('No worklogs to export. Please select filters first.');
            return;
        }

        // Prepare simple data
        const excelData = worklogs.map(log => ({
            'Naam': log.employee_name || '',
            'Datum': log.work_date,
            'Project': log.project_name || '',
            'Start': log.start_time || '',
            'Einde': log.end_time || '',
            'Pauze': log.break_duration || '0:00',
            'Totaal Uren': log.calculated_hours || 0,
            'Notities': log.description || ''
        }));

        // Built with exceljs. The `xlsx` package used to do this, but the
        // npm-published SheetJS carries unpatched prototype-pollution and ReDoS
        // advisories (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) with no fix on
        // the registry, and exceljs was already a dependency.
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Uren Overzicht');

        sheet.columns = [
            { header: 'Naam', key: 'Naam', width: 25 },
            { header: 'Datum', key: 'Datum', width: 12 },
            { header: 'Project', key: 'Project', width: 20 },
            { header: 'Start', key: 'Start', width: 8 },
            { header: 'Einde', key: 'Einde', width: 8 },
            { header: 'Pauze', key: 'Pauze', width: 8 },
            { header: 'Totaal Uren', key: 'Totaal Uren', width: 12 },
            { header: 'Notities', key: 'Notities', width: 30 },
        ];
        sheet.getRow(1).font = { bold: true };
        sheet.addRows(excelData);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Employee_Hours_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        setShowExportModal(false);
    }

    // Generate Invoice from worklogs
    async function generateInvoice() {
        if (!selectedCustomer || !weekStart) {
            alert('Please select a customer and week range first.');
            return;
        }

        // Parse week from weekStart (format: "2026-W03")
        const [year, week] = weekStart.split('-W').map(Number);

        try {
            const response = await apiFetch(`/invoices/invoices/generate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: selectedCustomer,
                    week_year: year,
                    week_number: week
                })
            });

            const data = await response.json();

            if (response.ok) {
                setInvoiceMessage({ type: 'success', text: `Invoice created! Number: ${data.invoice?.invoice_number}` });
                setTimeout(() => {
                    setShowExportModal(false);
                    setInvoiceMessage(null);
                }, 2000);
                loadInvoices(); // Refresh invoices list
            } else {
                // Show error message prominently
                const errorMsg = data.error || data.detail || JSON.stringify(data);
                setInvoiceMessage({ type: 'error', text: errorMsg });
                console.error('Invoice generation error:', data);
            }
        } catch (error) {
            console.error('Generate invoice error:', error);
            setInvoiceMessage({ type: 'error', text: error instanceof Error ? error.message : 'Network error' });
        }
    }

    async function loadFilterData() {
        try {
            // Load all customers - using same endpoint as Work Logs page
            const customersRes = await apiFetch(`/customers/customers/`);

            if (customersRes.ok) {
                const data = await customersRes.json();
                const customerList = Array.isArray(data) ? data : data.results || [];
                setCustomers(customerList.map((c: any) => ({ id: c.id, company_name: c.company_name })));
            }

            // Load employees - using users endpoint for better data
            const employeesRes = await apiFetch(`/employees/users/`);
            if (employeesRes.ok) {
                const data = await employeesRes.json();
                const empList = Array.isArray(data) ? data : data.results || [];
                setEmployees(empList.map((e: any) => ({
                    id: e.id,
                    full_name: e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Unknown'
                })));
            }
        } catch (e) {
            console.error('Failed to load filter data:', e);
        }
    }

    async function loadSupervisors(customerId: string) {
        if (!customerId) {
            setSupervisors([]);
            setSelectedSupervisor('');
            return;
        }
        try {
            // Outfolders are supervisors - same pattern as Work Logs page
            const res = await apiFetch(`/customers/outfolders/?customer=${customerId}`);
            if (res.ok) {
                const data = await res.json();
                const allOutfolders = data.results || data;
                // Filter by customer on frontend and use company_name for display
                const filtered = allOutfolders.filter((o: any) => o.customer === customerId);
                setSupervisors(filtered.map((o: any) => ({
                    id: o.id,
                    full_name: o.company_name || 'Unknown Rayon'
                })));
            }
        } catch (e) {
            console.error('Failed to load supervisors:', e);
        }
    }


    async function loadInvoices() {
        setLoading(true);
        setError(null);
        try {
            // One page, counted by the server. Fetching every invoice so the
            // browser could hold them all does not scale past a year or two.
            const query = new URLSearchParams();
            query.set('page', String(page));
            query.set('page_size', String(pageSize));
            const listRes = await apiFetch(`/invoices/invoices/?${query}`)
                .then(r => (r.ok ? r.json() : { results: [], count: 0 }));
            setInvoices(listRes.results ?? []);
            setTotalCount(listRes.count ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }

    async function loadInvoiceDetail(invoiceId: string) {
        setLoadingDetail(true);
        try {
            const response = await apiFetch(`/invoices/invoices/${invoiceId}/`);
            if (response.ok) {
                const data = await response.json();
                setSelectedInvoice(data);
            }
        } catch (err) {
            console.error('Failed to load invoice detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    }

    /**
     * Download the invoice as the customer receives it.
     *
     * This used to build a second invoice in HTML and hand it to the browser's
     * print dialog. That document had its own layout, its own totals and no
     * legally required details, so what the customer received and what the
     * dashboard showed could differ. The PDF now comes from the server, which
     * renders it once when the invoice is issued.
     */
    async function exportPDF() {
        if (!selectedInvoice) return;
        try {
            await apiDownload(
                `/invoices/invoices/${selectedInvoice.id}/pdf/?download=1`,
                `${selectedInvoice.invoice_number}.pdf`,
            );
        } catch (err) {
            console.error('Failed to download the invoice PDF:', err);
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        // Status filter
        if (filter !== 'all' && inv.status !== filter) return false;

        // Customer filter
        if (selectedCustomer && inv.customer !== selectedCustomer) return false;

        // Week range filter
        if (weekStart && inv.week_number && inv.week_year) {
            const [startYear, startWeek] = weekStart.split('-W').map(Number);
            if (inv.week_year < startYear || (inv.week_year === startYear && inv.week_number < startWeek)) {
                return false;
            }
        }
        if (weekEnd && inv.week_number && inv.week_year) {
            const [endYear, endWeek] = weekEnd.split('-W').map(Number);
            if (inv.week_year > endYear || (inv.week_year === endYear && inv.week_number > endWeek)) {
                return false;
            }
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            return inv.invoice_number?.toLowerCase().includes(searchLower) ||
                inv.customer_name?.toLowerCase().includes(searchLower);
        }
        return true;
    });

    const statusColors: Record<string, string> = {
        paid: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        overdue: 'bg-red-100 text-red-700',
        draft: 'bg-gray-100 text-gray-700'
    };

    const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);


    return {
        page, setPage, pageSize, setPageSize, totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        statusColors, customerSearch, customerSurcharges, customers, employeeSearch, employees, error, exportExcelForCustomer, exportExcelForEmployee, exportPDF, filter, filteredInvoices, generateInvoice, getFilteredHours, invoiceMessage, invoices, loadInvoiceDetail, loadInvoices, loadSupervisors, loading, loadingWorklogs, router, search, selectedCustomer, selectedEmployees, selectedInvoice, selectedSupervisor, setCustomerSearch, setEmployeeSearch, setFilter, setInvoiceMessage, setSearch, setSelectedCustomer, setSelectedEmployees, setSelectedInvoice, setSelectedSupervisor, setShowCustomerDropdown, setShowEmployeeDropdown, setShowExportModal, setShowFilters, setShowSupervisorDropdown, setSupervisorSearch, setSupervisors, setWeekEnd, setWeekStart, setWorklogStatusFilter, setWorklogs, showCustomerDropdown, showEmployeeDropdown, showExportModal, showFilters, showSupervisorDropdown, supervisorSearch, supervisors, weekEnd, weekStart, worklogStatusFilter, worklogs,
    };
}

export type InvoicesViewModel = ReturnType<typeof useInvoices>;
