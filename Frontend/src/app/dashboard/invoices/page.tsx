'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button, Input } from '@/components/ui';
import { api, Invoice } from '@/lib/api';
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, DollarSign, X, Gift, Coins, Users, Briefcase } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface InvoiceDetail {
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

interface InvoiceLine {
    id: string;
    project_name: string;
    employee_name: string;
    description: string;
    quantity_hours: number;
    hourly_rate: number;
    total: number;
}

interface InvoiceCost {
    id: string;
    cost_type_name: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface InvoiceAllowance {
    id: string;
    employee_name: string;
    allowance_name: string;
    allowance_type_name?: string;
    custom_name?: string;
    quantity_hours: number;
    hourly_rate: number;
    total: number;
}

interface InvoiceGratuity {
    id: string;
    employee_name: string;
    description: string;
    amount: number;
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Detail modal
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
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadInvoices();
        loadFilterData();
    }, []);

    async function loadFilterData() {
        try {
            const [customersRes, employeesRes] = await Promise.all([
                fetch(`${API_URL}/customers/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                }),
                fetch(`${API_URL}/employees/profiles/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                })
            ]);

            if (customersRes.ok) {
                const data = await customersRes.json();
                setCustomers(Array.isArray(data) ? data : data.results || []);
            }
            if (employeesRes.ok) {
                const data = await employeesRes.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) {
            console.error('Failed to load filter data:', e);
        }
    }

    async function loadSupervisors(customerId: string) {
        if (!customerId) {
            setSupervisors([]);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/customers/${customerId}/outfolders/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSupervisors(Array.isArray(data) ? data : data.results || []);
            }
        } catch (e) {
            console.error('Failed to load supervisors:', e);
        }
    }


    async function loadInvoices() {
        setLoading(true);
        setError(null);
        try {
            const response = await api.getInvoices();
            setInvoices(response.results || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }

    async function loadInvoiceDetail(invoiceId: string) {
        setLoadingDetail(true);
        try {
            const response = await fetch(`${API_URL}/invoices/invoices/${invoiceId}/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
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

    function exportPDF() {
        if (!selectedInvoice) return;

        // Create a printable version
        const printContent = `
            <html>
            <head>
                <title>Invoice ${selectedInvoice.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #1E3A5F; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #f5f5f5; }
                    .total { font-weight: bold; font-size: 18px; }
                    .section { margin-top: 30px; }
                </style>
            </head>
            <body>
                <h1>INVOICE ${selectedInvoice.invoice_number}</h1>
                <p><strong>Customer:</strong> ${selectedInvoice.customer_name}</p>
                <p><strong>Period:</strong> Week ${selectedInvoice.week_number}, ${selectedInvoice.week_year}</p>
                <p><strong>Date:</strong> ${selectedInvoice.week_start_date} - ${selectedInvoice.week_end_date}</p>
                
                <div class="section">
                    <h2>Labor Hours</h2>
                    <table>
                        <tr><th>Employee</th><th>Project</th><th>Hours</th><th>Rate</th><th>Total</th></tr>
                        ${selectedInvoice.lines.map(l => `
                            <tr><td>${l.employee_name}</td><td>${l.project_name}</td><td>${l.quantity_hours}h</td><td>€${l.hourly_rate}</td><td>€${l.total}</td></tr>
                        `).join('')}
                    </table>
                </div>
                
                ${selectedInvoice.allowance_lines.length > 0 ? `
                <div class="section">
                    <h2>Allowances (Toeslag)</h2>
                    <table>
                        <tr><th>Employee</th><th>Type</th><th>Hours</th><th>Rate</th><th>Total</th></tr>
                        ${selectedInvoice.allowance_lines.map(a => `
                            <tr><td>${a.employee_name}</td><td>${a.allowance_name || a.allowance_type_name}</td><td>${a.quantity_hours}h</td><td>€${a.hourly_rate}</td><td>€${a.total}</td></tr>
                        `).join('')}
                    </table>
                </div>
                ` : ''}
                
                ${selectedInvoice.gratuity_lines.length > 0 ? `
                <div class="section">
                    <h2>Gratuities (Fooi)</h2>
                    <table>
                        <tr><th>Employee</th><th>Description</th><th>Amount</th></tr>
                        ${selectedInvoice.gratuity_lines.map(g => `
                            <tr><td>${g.employee_name}</td><td>${g.description || '-'}</td><td>€${g.amount}</td></tr>
                        `).join('')}
                    </table>
                </div>
                ` : ''}
                
                <div class="section" style="text-align: right; border-top: 2px solid #1E3A5F; padding-top: 20px;">
                    <p>Subtotal: €${selectedInvoice.subtotal.toLocaleString()}</p>
                    <p>Costs: €${selectedInvoice.total_costs.toLocaleString()}</p>
                    <p>Allowances: €${selectedInvoice.total_allowances.toLocaleString()}</p>
                    <p>Gratuities: €${selectedInvoice.total_gratuities.toLocaleString()}</p>
                    <p>VAT (${selectedInvoice.vat_rate}%): €${selectedInvoice.vat_amount.toLocaleString()}</p>
                    <p class="total">TOTAL: €${selectedInvoice.total.toLocaleString()}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
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
        draft: 'bg-gray-100 text-gray-700',
    };

    const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                        <p className="text-gray-500">Manage customer invoices and payments</p>
                    </div>
                    <Button>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Invoice
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Invoices</p>
                                <p className="text-xl font-bold">{invoices.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending</p>
                                <p className="text-xl font-bold">€{totalPending.toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Paid</p>
                                <p className="text-xl font-bold">€{totalPaid.toLocaleString()}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Overdue</p>
                                <p className="text-xl font-bold">
                                    {invoices.filter(i => i.status === 'overdue').length}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2">
                            {['all', 'pending', 'paid', 'overdue'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                        ? 'bg-[#1E3A5F] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder="Search invoices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64"
                            />
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
                            >
                                <Briefcase className="w-4 h-4 mr-2" />
                                Filters
                            </Button>
                        </div>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Customer Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => {
                                        setSelectedCustomer(e.target.value);
                                        loadSupervisors(e.target.value);
                                        setSelectedSupervisor('');
                                    }}
                                    className="w-full p-2 border rounded-lg text-sm"
                                >
                                    <option value="">All Customers</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Supervisor Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                                <select
                                    value={selectedSupervisor}
                                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    disabled={!selectedCustomer || supervisors.length === 0}
                                >
                                    <option value="">All Supervisors</option>
                                    {supervisors.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Week Start */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Week</label>
                                <input
                                    type="week"
                                    value={weekStart}
                                    onChange={(e) => setWeekStart(e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>

                            {/* Week End */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Week</label>
                                <input
                                    type="week"
                                    value={weekEnd}
                                    onChange={(e) => setWeekEnd(e.target.value)}
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>

                            {/* Clear Filters */}
                            <div className="md:col-span-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedCustomer('');
                                        setSelectedSupervisor('');
                                        setWeekStart('');
                                        setWeekEnd('');
                                        setSupervisors([]);
                                    }}
                                    className="text-sm"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Invoice Table */}
                {error ? (
                    <Card className="p-8 text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={loadInvoices}>Retry</Button>
                    </Card>
                ) : (
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Invoice</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Customer</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Period</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Amount</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                No invoices yet. Generate one by selecting a customer and week.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-[#1E3A5F]">{invoice.invoice_number}</span>
                                                </td>
                                                <td className="px-6 py-4 font-medium">{invoice.customer_name}</td>
                                                <td className="px-6 py-4 text-gray-500">Week {invoice.week_number}, {invoice.week_year}</td>
                                                <td className="px-6 py-4 font-semibold">€{(invoice.total || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status] || 'bg-gray-100'}`}>
                                                        {invoice.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="p-2 hover:bg-gray-100 rounded-lg"
                                                            title="View"
                                                            onClick={() => loadInvoiceDetail(invoice.id)}
                                                        >
                                                            <Eye className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Download PDF">
                                                            <Download className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedInvoice(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Invoice {selectedInvoice.invoice_number}
                                </h2>
                                <p className="text-gray-500">{selectedInvoice.customer_name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={exportPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Export PDF
                                </button>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Period Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm text-gray-500">Period</p>
                                <p className="font-semibold">
                                    Week {selectedInvoice.week_number}, {selectedInvoice.week_year}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {selectedInvoice.week_start_date} - {selectedInvoice.week_end_date}
                                </p>
                            </div>

                            {/* Labor Hours */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-lg">Labor Hours</h3>
                                </div>
                                <div className="bg-white border rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedInvoice.lines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No labor hours</td>
                                                </tr>
                                            ) : (
                                                selectedInvoice.lines.map((line) => (
                                                    <tr key={line.id}>
                                                        <td className="px-4 py-3 font-medium">{line.employee_name}</td>
                                                        <td className="px-4 py-3 text-gray-600">{line.project_name}</td>
                                                        <td className="px-4 py-3 text-right">{line.quantity_hours}h</td>
                                                        <td className="px-4 py-3 text-right">€{line.hourly_rate}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">€{line.total}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Allowances */}
                            {selectedInvoice.allowance_lines.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Gift className="w-5 h-5 text-purple-600" />
                                        <h3 className="font-semibold text-lg">Allowances (Toeslag)</h3>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-purple-100/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Employee</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">Allowance Type</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">Hours</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">Rate</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-purple-100">
                                                {selectedInvoice.allowance_lines.map((allowance) => (
                                                    <tr key={allowance.id}>
                                                        <td className="px-4 py-3 font-medium">{allowance.employee_name}</td>
                                                        <td className="px-4 py-3 text-purple-700">
                                                            {allowance.allowance_name || allowance.allowance_type_name || allowance.custom_name}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{allowance.quantity_hours}h</td>
                                                        <td className="px-4 py-3 text-right">€{allowance.hourly_rate}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">€{allowance.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Gratuities */}
                            {selectedInvoice.gratuity_lines.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Coins className="w-5 h-5 text-amber-600" />
                                        <h3 className="font-semibold text-lg">Gratuities (Fooi)</h3>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-amber-100/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Employee</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-amber-100">
                                                {selectedInvoice.gratuity_lines.map((gratuity) => (
                                                    <tr key={gratuity.id}>
                                                        <td className="px-4 py-3 font-medium">{gratuity.employee_name}</td>
                                                        <td className="px-4 py-3 text-amber-700">{gratuity.description || '-'}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">€{gratuity.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Costs */}
                            {selectedInvoice.costs.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Briefcase className="w-5 h-5 text-gray-600" />
                                        <h3 className="font-semibold text-lg">Additional Costs</h3>
                                    </div>
                                    <div className="bg-white border rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {selectedInvoice.costs.map((cost) => (
                                                    <tr key={cost.id}>
                                                        <td className="px-4 py-3 font-medium">{cost.cost_type_name}</td>
                                                        <td className="px-4 py-3 text-gray-600">{cost.description || '-'}</td>
                                                        <td className="px-4 py-3 text-right">{cost.quantity}</td>
                                                        <td className="px-4 py-3 text-right">€{cost.unit_price}</td>
                                                        <td className="px-4 py-3 text-right font-semibold">€{cost.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Totals */}
                            <div className="bg-[#1E3A5F] text-white rounded-xl p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-blue-200">Subtotal (Labor)</span>
                                            <span>€{selectedInvoice.subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-200">Costs</span>
                                            <span>€{selectedInvoice.total_costs.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-300">Allowances</span>
                                            <span>€{selectedInvoice.total_allowances.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-amber-300">Gratuities</span>
                                            <span>€{selectedInvoice.total_gratuities.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-l border-blue-400/30 pl-6">
                                        <div className="flex justify-between">
                                            <span className="text-blue-200">VAT ({selectedInvoice.vat_rate}%)</span>
                                            <span>€{selectedInvoice.vat_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-2xl font-bold pt-2 border-t border-blue-400/30 mt-2">
                                            <span>TOTAL</span>
                                            <span>€{selectedInvoice.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

