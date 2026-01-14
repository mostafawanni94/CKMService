'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button, Input } from '@/components/ui';
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, X, Plus, Upload, Building2, ArrowDownLeft, Calendar, Filter } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface IncomingInvoice {
    id: string;
    invoice_number: string;
    vendor_name: string;
    description: string;
    amount: number;
    vat_amount: number;
    total: number;
    invoice_date: string;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue';
    attachment_url?: string;
}

export default function IncomingInvoicesPage() {
    const [invoices, setInvoices] = useState<IncomingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadInvoices();
    }, []);

    async function loadInvoices() {
        setLoading(true);
        setError(null);
        try {
            // TODO: Replace with actual API call when backend is ready
            setInvoices([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        if (filter !== 'all' && inv.status !== filter) return false;
        if (search) {
            const searchLower = search.toLowerCase();
            return inv.invoice_number?.toLowerCase().includes(searchLower) ||
                inv.vendor_name?.toLowerCase().includes(searchLower);
        }
        return true;
    });

    const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #E5E7EB',
                        borderTopColor: '#1E3A5F',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
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
                    gap: '16px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1E3A5F',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            <ArrowDownLeft style={{ width: '28px', height: '28px' }} />
                            Incoming Invoices
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#6B7280',
                            margin: '4px 0 0 0',
                        }}>
                            Manage invoices received from vendors and suppliers
                        </p>
                    </div>
                    <button
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
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Plus size={18} />
                        Add Invoice
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                }}>
                    {/* Total Invoices */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <FileText size={24} style={{ color: '#3B82F6' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Total Invoices</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#1E3A5F', margin: 0 }}>{invoices.length}</p>
                        </div>
                    </div>

                    {/* Pending Payment */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Clock size={24} style={{ color: '#D97706' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Pending Payment</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', margin: 0 }}>€{totalPending.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Paid */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#D1FAE5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <CheckCircle size={24} style={{ color: '#059669' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Paid</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#059669', margin: 0 }}>€{totalPaid.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Overdue */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '20px 24px',
                        border: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#FEE2E2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <AlertCircle size={24} style={{ color: '#DC2626' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Overdue</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626', margin: 0 }}>
                                {invoices.filter(i => i.status === 'overdue').length}
                            </p>
                        </div>
                    </div>
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
                    gap: '16px',
                }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                    }}>
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
                                    color: filter === status ? 'white' : '#6B7280',
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
                                    transition: 'border-color 0.2s',
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
                                    height: '18px',
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
                                transition: 'all 0.2s',
                            }}
                        >
                            <Filter size={16} />
                            Filters
                        </button>
                    </div>
                </div>

                {/* Invoice Table */}
                {error ? (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '48px',
                        textAlign: 'center',
                        border: '1px solid #E5E7EB',
                    }}>
                        <p style={{ color: '#DC2626', marginBottom: '16px' }}>{error}</p>
                        <button
                            onClick={loadInvoices}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: '#1E3A5F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        overflow: 'hidden',
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice #</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                }}>
                                                    <div style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#F3F4F6',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}>
                                                        <Building2 size={36} style={{ color: '#9CA3AF' }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: 0 }}>No incoming invoices yet</p>
                                                        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0' }}>Add invoices from your vendors and suppliers</p>
                                                    </div>
                                                    <button
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
                                                            marginTop: '8px',
                                                        }}
                                                    >
                                                        <Plus size={18} />
                                                        Add First Invoice
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((invoice, index) => (
                                            <tr
                                                key={invoice.id}
                                                style={{
                                                    borderBottom: index < filteredInvoices.length - 1 ? '1px solid #E5E7EB' : 'none',
                                                    transition: 'background-color 0.15s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ fontWeight: 600, color: '#1E3A5F' }}>{invoice.invoice_number}</span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontWeight: 500, color: '#374151' }}>{invoice.vendor_name}</td>
                                                <td style={{ padding: '16px 24px', color: '#6B7280' }}>{invoice.description}</td>
                                                <td style={{ padding: '16px 24px', color: '#6B7280' }}>{invoice.invoice_date}</td>
                                                <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1E3A5F' }}>€{(invoice.total || 0).toLocaleString()}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        backgroundColor: invoice.status === 'paid' ? '#D1FAE5' :
                                                            invoice.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                                                        color: invoice.status === 'paid' ? '#059669' :
                                                            invoice.status === 'pending' ? '#D97706' : '#DC2626',
                                                    }}>
                                                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            style={{
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                backgroundColor: '#F3F4F6',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.15s',
                                                            }}
                                                            title="View"
                                                        >
                                                            <Eye size={16} style={{ color: '#6B7280' }} />
                                                        </button>
                                                        <button
                                                            style={{
                                                                padding: '8px',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                backgroundColor: '#F3F4F6',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.15s',
                                                            }}
                                                            title="Download"
                                                        >
                                                            <Download size={16} style={{ color: '#6B7280' }} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
