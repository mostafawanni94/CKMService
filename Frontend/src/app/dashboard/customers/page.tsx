'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button, Input } from '@/components/ui';
import { api, Customer } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Building2, Plus, X, Search, MapPin, Phone, Mail, FileText, Users, Globe, Eye, Trash2, Edit, Save, Upload, ImageIcon, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';



export default function CustomersPage() {
    const { t } = useLanguage();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [prevPage, setPrevPage] = useState<string | null>(null);
    const pageSize = 10;
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editForm, setEditForm] = useState({
        company_name: '',
        city: '',
        postcode: '',
        address: '',
        iban: '',
        btw_number: '',
        kvk_number: '',
        g_rekening: '',
        is_active: true,
    });
    const [editLogo, setEditLogo] = useState<File | null>(null);
    const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers(page: number = 1) {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/customers/customers/?page=${page}&page_size=${pageSize}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
            if (!response.ok) throw new Error('Failed to load customers');
            const data = await response.json();
            setCustomers(data.results || []);
            setTotalCount(data.count || 0);
            setNextPage(data.next);
            setPrevPage(data.previous);
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    }



    function openViewModal(customer: Customer) {
        setSelectedCustomer(customer);
        setEditForm({
            company_name: customer.company_name || '',
            city: customer.city || '',
            postcode: (customer as any).postcode || '',
            address: (customer as any).address || '',
            iban: (customer as any).iban || '',
            btw_number: (customer as any).btw_number || '',
            kvk_number: (customer as any).kvk_number || '',
            g_rekening: (customer as any).g_rekening || '',
            is_active: customer.is_active ?? true,
        });
        setEditing(false);
        setShowViewModal(true);
    }

    async function handleSaveCustomer() {
        if (!selectedCustomer) return;
        setEditing(true);
        try {
            const formData = new FormData();
            formData.append('company_name', editForm.company_name);
            formData.append('city', editForm.city);
            formData.append('postcode', editForm.postcode);
            formData.append('address', editForm.address);
            formData.append('is_active', String(editForm.is_active));
            if (editForm.iban) formData.append('iban', editForm.iban);
            if (editForm.btw_number) formData.append('btw_number', editForm.btw_number);
            if (editForm.kvk_number) formData.append('kvk_number', editForm.kvk_number);
            if (editForm.g_rekening) formData.append('g_rekening', editForm.g_rekening);
            if (editLogo) formData.append('logo', editLogo);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/customers/customers/${selectedCustomer.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to update customer');
            }

            setShowViewModal(false);
            setEditLogo(null);
            setEditLogoPreview(null);
            await loadCustomers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update customer');
        } finally {
            setEditing(false);
        }
    }

    async function handleDeleteCustomer() {
        if (!selectedCustomer) return;
        setDeleting(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/customers/customers/${selectedCustomer.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete customer');
            }

            setShowDeleteModal(false);
            setShowViewModal(false);
            await loadCustomers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete customer');
        } finally {
            setDeleting(false);
        }
    }

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = !search ||
            c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
            c.city?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' ||
            (filter === 'active' && c.is_active) ||
            (filter === 'inactive' && !c.is_active);
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: customers.length,
        active: customers.filter(c => c.is_active).length,
        inactive: customers.filter(c => !c.is_active).length,
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage your customer accounts and contracts</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => loadCustomers()} className="text-sm">
                            Refresh
                        </Button>
                        <Button onClick={() => window.location.href = '/dashboard/customers/new'} className="bg-[#1E3A5F] text-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Customer
                        </Button>
                    </div>
                </div>

                {/* Stats - EXACT match to Employees page */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid #dbeafe'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '12px' }}>
                                <Building2 style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Total Customers</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(to bottom right, #f0fdf4, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid #bbf7d0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                                <Building2 style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Active</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.active}</p>
                            </div>
                        </div>
                    </div>
                    <div style={{
                        padding: '20px',
                        background: 'linear-gradient(to bottom right, #f9fafb, #ffffff)',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                                <Building2 style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Inactive</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#4b5563', margin: 0 }}>{stats.inactive}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters + Table Container - matching Employees page layout (no border) */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                }}>
                    {/* Filters and Search */}
                    <div style={{
                        padding: '16px 24px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['all', 'active', 'inactive'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        backgroundColor: filter === status ? '#1E3A5F' : '#F3F4F6',
                                        color: filter === status ? '#FFFFFF' : '#4B5563',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: filter === status ? '0 4px 12px rgba(30, 58, 95, 0.25)' : 'none',
                                    }}
                                >
                                    {status === 'all' ? 'All' :
                                        status === 'active' ? 'Active' : 'Inactive'}
                                </button>
                            ))}
                        </div>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            <Search style={{
                                position: 'absolute',
                                left: '14px',
                                width: '18px',
                                height: '18px',
                                color: '#9CA3AF',
                                pointerEvents: 'none',
                            }} />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '280px',
                                    height: '44px',
                                    paddingLeft: '46px',
                                    paddingRight: '16px',
                                    fontSize: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#F9FAFB',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#1E3A5F';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 95, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#E5E7EB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Customer Table */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={() => loadCustomers()}>Retry</Button>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-900 font-semibold text-lg mb-2">
                                {filter === 'inactive' ? 'No inactive customers' :
                                    filter === 'active' ? 'No active customers' :
                                        'No customers found'}
                            </p>
                            <p className="text-gray-500 mb-6">
                                {filter === 'inactive' ? 'All your customers are currently active' :
                                    filter === 'active' ? 'Add your first customer to get started' :
                                        'Add your first customer to get started'}
                            </p>
                            {filter !== 'inactive' && (
                                <Button onClick={() => window.location.href = '/dashboard/customers/new'} className="bg-[#1E3A5F]">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Customer
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                <thead style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                                    <tr>
                                        <th style={{ width: '30%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                                        <th style={{ width: '25%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                        <th style={{ width: '15%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th style={{ width: '30%' }} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {customer.logo ? (
                                                        <img
                                                            src={customer.logo}
                                                            alt={`${customer.company_name} logo`}
                                                            className="w-10 h-10 rounded-lg object-contain bg-gray-100"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#3E5A8F] flex items-center justify-center">
                                                            <Building2 className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{customer.company_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span>{customer.city}, {customer.country}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${customer.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                    {customer.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => window.location.href = `/dashboard/customers/${customer.id}`}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '8px 14px',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: '#4B5563',
                                                            backgroundColor: '#FFFFFF',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <Eye style={{ width: '14px', height: '14px' }} />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCustomer(customer);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '8px 14px',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: '#DC2626',
                                                            backgroundColor: '#FFFFFF',
                                                            border: '1px solid #FECACA',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <Trash2 style={{ width: '14px', height: '14px' }} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalCount > pageSize && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 24px',
                                    borderTop: '1px solid #E5E7EB',
                                    backgroundColor: '#F9FAFB'
                                }}>
                                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} customers
                                    </p>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => loadCustomers(currentPage - 1)}
                                            disabled={!prevPage}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                backgroundColor: prevPage ? '#FFFFFF' : '#F3F4F6',
                                                color: prevPage ? '#374151' : '#9CA3AF',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: prevPage ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            <ChevronLeft style={{ width: '16px', height: '16px' }} />
                                            Previous
                                        </button>

                                        {/* Page Numbers */}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                                                .filter(page => {
                                                    // Show first, last, current, and adjacent pages
                                                    const totalPages = Math.ceil(totalCount / pageSize);
                                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                                })
                                                .map((page, idx, arr) => (
                                                    <span key={page} style={{ display: 'flex', alignItems: 'center' }}>
                                                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                            <span style={{ padding: '0 8px', color: '#9CA3AF' }}>...</span>
                                                        )}
                                                        <button
                                                            onClick={() => loadCustomers(page)}
                                                            style={{
                                                                minWidth: '36px',
                                                                padding: '8px 12px',
                                                                backgroundColor: page === currentPage ? '#1E3A5F' : '#FFFFFF',
                                                                color: page === currentPage ? '#FFFFFF' : '#374151',
                                                                border: `1px solid ${page === currentPage ? '#1E3A5F' : '#E5E7EB'}`,
                                                                borderRadius: '8px',
                                                                fontSize: '13px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {page}
                                                        </button>
                                                    </span>
                                                ))
                                            }
                                        </div>

                                        <button
                                            onClick={() => loadCustomers(currentPage + 1)}
                                            disabled={!nextPage}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                backgroundColor: nextPage ? '#FFFFFF' : '#F3F4F6',
                                                color: nextPage ? '#374151' : '#9CA3AF',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: nextPage ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Next
                                            <ChevronRight style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* View/Edit Customer Modal */}
                {showViewModal && selectedCustomer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
                                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Company Logo</label>
                                    <div
                                        className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-[#1E3A5F] transition-colors cursor-pointer"
                                        onClick={() => document.getElementById('edit-logo-input')?.click()}
                                    >
                                        <input
                                            id="edit-logo-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setEditLogo(file);
                                                    setEditLogoPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                        {editLogoPreview || (selectedCustomer as any)?.logo ? (
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={editLogoPreview || (selectedCustomer as any)?.logo}
                                                    alt="Logo preview"
                                                    className="w-16 h-16 object-contain rounded-lg"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        {editLogo?.name || 'Current logo'}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditLogo(null);
                                                            setEditLogoPreview(null);
                                                        }}
                                                        className="text-xs text-blue-600 hover:underline mt-1"
                                                    >
                                                        Change logo
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center py-4">
                                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600">Click to upload logo</p>
                                                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Company Name</label>
                                    <input
                                        type="text"
                                        value={editForm.company_name}
                                        onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">City</label>
                                        <input
                                            type="text"
                                            value={editForm.city}
                                            onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Postcode</label>
                                        <input
                                            type="text"
                                            value={editForm.postcode}
                                            onChange={(e) => setEditForm(f => ({ ...f, postcode: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Address</label>
                                    <input
                                        type="text"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                    />
                                </div>

                                {/* Financial Info */}
                                <div className="border-t pt-4">
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-4">Financial Information</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">IBAN</label>
                                            <input
                                                type="text"
                                                value={editForm.iban}
                                                onChange={(e) => setEditForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                                                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">G-Rekening</label>
                                            <input
                                                type="text"
                                                value={editForm.g_rekening}
                                                onChange={(e) => setEditForm(f => ({ ...f, g_rekening: e.target.value.toUpperCase() }))}
                                                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">BTW Number</label>
                                            <input
                                                type="text"
                                                value={editForm.btw_number}
                                                onChange={(e) => setEditForm(f => ({ ...f, btw_number: e.target.value.toUpperCase() }))}
                                                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">KvK Number</label>
                                            <input
                                                type="text"
                                                value={editForm.kvk_number}
                                                onChange={(e) => setEditForm(f => ({ ...f, kvk_number: e.target.value }))}
                                                maxLength={8}
                                                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status Toggle */}
                                <div className="border-t pt-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editForm.is_active}
                                            onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                            className="w-5 h-5 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Active Customer</span>
                                    </label>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowViewModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        className="flex-1 bg-[#1E3A5F]"
                                        disabled={editing}
                                        onClick={handleSaveCustomer}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {editing ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && selectedCustomer && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDeleteModal(false)} />
                        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertTriangle style={{ width: '32px', height: '32px', color: '#DC2626' }} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Delete Customer</h3>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                Are you sure you want to delete <strong>{selectedCustomer.company_name}</strong>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleDeleteCustomer} disabled={deleting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                                    <Trash2 style={{ width: '16px', height: '16px' }} /> {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
