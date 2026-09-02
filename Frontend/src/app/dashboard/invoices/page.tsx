'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button, Input } from '@/components/ui';
import { api, Invoice } from '@/lib/api';
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, DollarSign, X, Gift, Coins, Users, User, Briefcase } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useRouter } from 'next/navigation';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceFilters } from '@/components/features/invoices/InvoiceFilters';
import { ExportInvoiceModal } from '@/components/features/invoices/ExportInvoiceModal';
import { apiDownload, apiFetch, apiGetAll } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';






export default function InvoicesPage() {
    const { t } = useLanguage();
    const vm = useInvoices();
    const {
        statusColors, customerSearch, customerSurcharges, customers, employeeSearch, employees, error, exportExcelForCustomer, exportExcelForEmployee, exportPDF, filter, filteredInvoices, generateInvoice, getFilteredHours, invoiceMessage, invoices, loadInvoiceDetail, loadInvoices, loadSupervisors, loading, loadingWorklogs, router, search, selectedCustomer, selectedEmployees, selectedInvoice, selectedSupervisor, setCustomerSearch, setEmployeeSearch, setFilter, setInvoiceMessage, setSearch, setSelectedCustomer, setSelectedEmployees, setSelectedInvoice, setSelectedSupervisor, setShowCustomerDropdown, setShowEmployeeDropdown, setShowExportModal, setShowFilters, setShowSupervisorDropdown, setSupervisorSearch, setSupervisors, setWeekEnd, setWeekStart, setWorklogStatusFilter, setWorklogs, showCustomerDropdown, showEmployeeDropdown, showExportModal, showFilters, showSupervisorDropdown, supervisorSearch, supervisors, weekEnd, weekStart, worklogStatusFilter, worklogs,
    } = vm;

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1E3A5F',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <FileText style={{ width: '28px', height: '28px' }} />
                            {t('Outgoing Invoices')}
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            margin: '4px 0 0 0'
                        }}>
                            Manage customer invoices and payments
                        </p>
                    </div>
                    <button
                        onClick={() => setShowExportModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#1E3A5F',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(30, 58, 95, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Download size={18} />
                        {t('Generate Invoice')}
                    </button>
                </div>

                {/* Filters Bar */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    {/* Status Tabs */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'pending', 'paid', 'overdue'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: filter === status ? '#1E3A5F' : '#F3F4F6',
                                    color: filter === status ? 'white' : '#6B7280'
                                }}
                            >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Search and Filters */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                placeholder="Search invoices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    padding: '10px 16px',
                                    paddingLeft: '40px',
                                    borderRadius: '10px',
                                    border: '1px solid #E5E7EB',
                                    fontSize: '14px',
                                    width: '240px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                            <svg
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9CA3AF',
                                    width: '18px',
                                    height: '18px'
                                }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                border: '1px solid #E5E7EB',
                                backgroundColor: showFilters ? '#EFF6FF' : 'white',
                                color: showFilters ? '#1E3A5F' : '#6B7280',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Briefcase size={16} />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && <InvoiceFilters vm={vm} />}

                {/* Invoice Table */}
                {error ? (
                    <Card className="p-8 text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={loadInvoices}>{t('Retry')}</Button>
                    </Card>
                ) : (
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Invoice')}</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Customer')}</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Period')}</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Amount')}</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Status')}</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredInvoices.length === 0 ? (
                                        worklogs.length > 0 ? (
                                            // Show work logs preview when filters return work logs but no invoices
                                            <>
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 bg-blue-50 border-b">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <FileText className="w-4 h-4 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-800">
                                                                    {worklogs.length} Work Log{worklogs.length !== 1 ? 's' : ''} Found
                                                                </p>
                                                                <p className="text-xs text-blue-600">
                                                                    No invoices generated yet. Click "Generate Invoice" to create one from these work logs.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {worklogs.slice(0, 10).map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">Work Log</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium">{log.project_name || '-'}</td>
                                                        <td className="px-6 py-4 text-gray-500">{log.work_date}</td>
                                                        <td className="px-6 py-4 font-semibold">{log.calculated_hours || 0}h</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${log.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                log.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {log.status || 'draft'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                                            {log.employee_name || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {worklogs.length > 10 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-3 text-center text-sm text-gray-500">
                                                            ...and {worklogs.length - 10} more work logs
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    No invoices yet. Generate one by selecting a customer and week.
                                                </td>
                                            </tr>
                                        )
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
                                                            title={t('View')}
                                                            onClick={() => loadInvoiceDetail(invoice.id)}
                                                        >
                                                            <Eye className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button className="p-2 hover:bg-gray-100 rounded-lg" title={t('Download PDF')}>
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
            {
                selectedInvoice && (
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
                                        onClick={() => router.push(`/dashboard/invoices/${selectedInvoice.id}`)}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium"
                                    >
                                        {t('Open volledige factuur')}
                                    </button>
                                    <button
                                        onClick={exportPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        {t('Download PDF')}
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
                                    <p className="text-sm text-gray-500">{t('Period')}</p>
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
                                        <h3 className="font-semibold text-lg">{t('Labor Hours')}</h3>
                                    </div>
                                    <div className="bg-white border rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Employee')}</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Project')}</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Hours')}</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Rate')}</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Total')}</th>
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
                                            <h3 className="font-semibold text-lg">{t('Allowances (Toeslag)')}</h3>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-100 rounded-xl overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-purple-100/50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">{t('Employee')}</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase">{t('Allowance Type')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">{t('Hours')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">{t('Rate')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-purple-700 uppercase">{t('Total')}</th>
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
                                            <h3 className="font-semibold text-lg">{t('Gratuities (Fooi)')}</h3>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-amber-100/50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">{t('Employee')}</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">{t('Description')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-amber-700 uppercase">{t('Amount')}</th>
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
                                            <h3 className="font-semibold text-lg">{t('Additional Costs')}</h3>
                                        </div>
                                        <div className="bg-white border rounded-xl overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Type')}</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Description')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Price')}</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Total')}</th>
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
                                                <span className="text-purple-300">{t('Allowances')}</span>
                                                <span>€{selectedInvoice.total_allowances.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-amber-300">{t('Gratuities')}</span>
                                                <span>€{selectedInvoice.total_gratuities.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 border-l border-blue-400/30 pl-6">
                                            <div className="flex justify-between">
                                                <span className="text-blue-200">VAT ({selectedInvoice.vat_rate}%)</span>
                                                <span>€{selectedInvoice.vat_amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-2xl font-bold pt-2 border-t border-blue-400/30 mt-2">
                                                <span>{t('TOTAL')}</span>
                                                <span>€{selectedInvoice.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Export Modal */}
            {showExportModal && <ExportInvoiceModal vm={vm} />}
        </DashboardLayout >
    );
}

