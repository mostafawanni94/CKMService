'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button } from '@/components/ui';
import { api, Project, Customer } from '@/lib/api';
import { useLanguage } from '@/lib/i18n'
import { FolderKanban, Plus, MapPin, Users, Calendar, Eye, Search, X, Building2, UserCircle, Check, LayoutGrid, List } from 'lucide-react';

interface Supervisor {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string;
}

interface CreateProjectForm {
    name: string;
    customer: string;
    location: string;
    description: string;
    supervisors: string[];
}

export default function ProjectsPage() {
    const { t } = useLanguage();
    const [projects, setProjects] = useState<Project[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState<CreateProjectForm>({
        name: '',
        customer: '',
        location: '',
        description: '',
        supervisors: [],
    });
    const [customerSupervisors, setCustomerSupervisors] = useState<Supervisor[]>([]);
    const [loadingSupervisors, setLoadingSupervisors] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    useEffect(() => {
        loadData();
    }, []);

    // Load supervisors when customer is selected
    useEffect(() => {
        if (createForm.customer) {
            loadCustomerSupervisors(createForm.customer);
        } else {
            setCustomerSupervisors([]);
            setCreateForm(f => ({ ...f, supervisors: [] }));
        }
    }, [createForm.customer]);

    // Search customers when search term changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            searchCustomers(customerSearch, true);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    const [customerNextPage, setCustomerNextPage] = useState<string | null>(null);
    const [hasMoreCustomers, setHasMoreCustomers] = useState(false);

    async function searchCustomers(searchTerm: string, reset = false) {
        setLoadingCustomers(true);
        try {
            const token = localStorage.getItem('access_token');
            const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const response = await fetch(
                `${API_URL}/customers/customers/?page_size=15${searchParam}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.results || []);
                setCustomerNextPage(data.next);
                setHasMoreCustomers(!!data.next);
            }
        } catch (err) {
            console.error('Failed to search customers:', err);
        } finally {
            setLoadingCustomers(false);
        }
    }

    async function loadMoreCustomers() {
        if (!customerNextPage || loadingCustomers) return;
        setLoadingCustomers(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(customerNextPage, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers(prev => [...prev, ...(data.results || [])]);
                setCustomerNextPage(data.next);
                setHasMoreCustomers(!!data.next);
            }
        } catch (err) {
            console.error('Failed to load more customers:', err);
        } finally {
            setLoadingCustomers(false);
        }
    }

    function handleCustomerScroll(e: React.UIEvent<HTMLDivElement>) {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMoreCustomers && !loadingCustomers) {
            loadMoreCustomers();
        }
    }


    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            // Get first 15 customers initially
            const token = localStorage.getItem('access_token');
            const [projectsRes, customersRes] = await Promise.all([
                api.getProjects(),
                fetch(`${API_URL}/customers/customers/?page_size=15`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json())
            ]);
            setProjects(projectsRes.results || []);
            setCustomers(customersRes.results || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }


    async function loadCustomerSupervisors(customerId: string) {
        setLoadingSupervisors(true);
        try {
            const response = await fetch(`${API_URL}/customers/customers/${customerId}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setCustomerSupervisors(data.outfolders || []);
            }
        } catch (err) {
            console.error('Failed to load supervisors:', err);
            setCustomerSupervisors([]);
        } finally {
            setLoadingSupervisors(false);
        }
    }

    function toggleSupervisor(supervisorId: string) {
        setCreateForm(f => ({
            ...f,
            supervisors: f.supervisors.includes(supervisorId)
                ? f.supervisors.filter(id => id !== supervisorId)
                : [...f.supervisors, supervisorId],
        }));
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await fetch(`${API_URL}/projects/projects/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({
                    name: createForm.name,
                    customer: createForm.customer,
                    location: createForm.location,
                    description: createForm.description || '',
                    status: 'active',
                    outfolder: createForm.supervisors.length > 0 ? createForm.supervisors[0] : null,
                    supervisors: createForm.supervisors,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || data.name?.[0] || 'Failed to create project');
            }

            setShowCreateModal(false);
            setCreateForm({ name: '', customer: '', location: '', description: '', supervisors: [] });
            setCustomerSupervisors([]);
            await loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setCreating(false);
        }
    }

    const filteredProjects = projects.filter(p => {
        if (filter !== 'all' && p.status !== filter) return false;
        if (selectedCustomers.length > 0 && !selectedCustomers.includes(p.customer)) return false;
        if (search) {
            const searchLower = search.toLowerCase();
            return p.name?.toLowerCase().includes(searchLower) ||
                p.customer_name?.toLowerCase().includes(searchLower);
        }
        return true;
    });

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>Projects</h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>Manage your projects and assignments</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={loadData}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: 'white',
                                color: '#374151',
                                border: '1px solid #E5E7EB',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 18px',
                                backgroundColor: '#1E3A5F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <Plus style={{ width: '16px', height: '16px' }} />
                            New Project
                        </button>
                    </div>
                </div>

                {/* Stats */}
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
                                <FolderKanban style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Total Projects</p>
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
                                <FolderKanban style={{ width: '24px', height: '24px', color: '#16a34a' }} />
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
                                <FolderKanban style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500, margin: 0 }}>Completed</p>
                                <p style={{ fontSize: '28px', fontWeight: 700, color: '#4b5563', margin: 0 }}>{stats.completed}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Status Filter */}
                        {['all', 'active', 'completed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: filter === f ? '#1E3A5F' : 'white',
                                    color: filter === f ? 'white' : '#374151',
                                    border: filter === f ? 'none' : '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}

                        {/* Customer Filter - Searchable Multi-Select */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: selectedCustomers.length > 0 ? '#EFF6FF' : 'white',
                                    border: selectedCustomers.length > 0 ? '1px solid #2563EB' : '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    color: selectedCustomers.length > 0 ? '#2563EB' : '#374151',
                                    cursor: 'pointer',
                                    minWidth: '180px',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span>
                                    {selectedCustomers.length === 0 ? 'All Customers' :
                                        selectedCustomers.length === 1 ? customers.find(c => c.id === selectedCustomers[0])?.company_name :
                                            `${selectedCustomers.length} customers`}
                                </span>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                </svg>
                            </button>

                            {customerDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: '4px',
                                    width: '280px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                }}>
                                    {/* Search Input */}
                                    <div style={{ padding: '12px', borderBottom: '1px solid #E5E7EB' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                            <input
                                                type="text"
                                                placeholder="Search customers..."
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 34px',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    outline: 'none',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Clear/Select All */}
                                    <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #F3F4F6' }}>
                                        <button
                                            onClick={() => setSelectedCustomers([])}
                                            style={{ padding: '4px 8px', fontSize: '12px', color: '#6B7280', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            onClick={() => setSelectedCustomers(customers.map(c => c.id))
                                            }
                                            style={{ padding: '4px 8px', fontSize: '12px', color: '#2563EB', backgroundColor: '#EFF6FF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Select All
                                        </button>
                                    </div>

                                    {/* Customer List */}
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }} onScroll={handleCustomerScroll}>
                                        {customers.map((customer) => (
                                            <div
                                                key={customer.id}
                                                onClick={() => {
                                                    setSelectedCustomers(prev =>
                                                        prev.includes(customer.id)
                                                            ? prev.filter(id => id !== customer.id)
                                                            : [...prev, customer.id]
                                                    );
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedCustomers.includes(customer.id) ? '#EFF6FF' : 'transparent',
                                                    borderLeft: selectedCustomers.includes(customer.id) ? '3px solid #2563EB' : '3px solid transparent',
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    backgroundColor: selectedCustomers.includes(customer.id) ? '#2563EB' : 'white',
                                                    border: selectedCustomers.includes(customer.id) ? 'none' : '2px solid #D1D5DB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {selectedCustomers.includes(customer.id) && (
                                                        <Check style={{ width: '12px', height: '12px', color: 'white' }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {customer.company_name}
                                                    </p>
                                                    {customer.city && (
                                                        <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>{customer.city}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                        }
                                        {loadingCustomers && (
                                            <p style={{ padding: '12px', textAlign: 'center', color: '#6B7280', fontSize: '12px', margin: 0 }}>
                                                Loading...
                                            </p>
                                        )}
                                        {customers.length === 0 && !loadingCustomers && (
                                            <p style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px', margin: 0 }}>
                                                No customers found
                                            </p>
                                        )}
                                    </div>

                                    {/* Done Button */}
                                    <div style={{ padding: '8px 12px', borderTop: '1px solid #E5E7EB' }}>
                                        <button
                                            onClick={() => setCustomerDropdownOpen(false)}
                                            style={{ width: '100%', padding: '8px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* View Toggle */}
                        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '4px' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '6px 10px',
                                    backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                <LayoutGrid style={{ width: '16px', height: '16px', color: viewMode === 'grid' ? '#1E3A5F' : '#6B7280' }} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '6px 10px',
                                    backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                            >
                                <List style={{ width: '16px', height: '16px', color: viewMode === 'list' ? '#1E3A5F' : '#6B7280' }} />
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    padding: '10px 12px 10px 38px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    width: '200px',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Projects Grid/List */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #E5E7EB',
                            borderTopColor: '#1E3A5F',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#FEE2E2', borderRadius: '12px' }}>
                        <p style={{ color: '#DC2626', fontWeight: 600 }}>{error}</p>
                        <button onClick={loadData} style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            backgroundColor: '#DC2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}>
                            Retry
                        </button>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                        <FolderKanban style={{ width: '48px', height: '48px', color: '#9CA3AF', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No Projects Found</h3>
                        <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px' }}>
                            {selectedCustomers.length > 0 ? 'No projects found for selected customers' : 'Create your first project to get started'}
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                backgroundColor: '#1E3A5F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <Plus style={{ width: '16px', height: '16px' }} />
                            Create Project
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    // Grid View
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    border: '1px solid #E5E7EB',
                                    padding: '20px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                                        <FolderKanban style={{ width: '20px', height: '20px', color: '#1E3A5F' }} />
                                    </div>
                                    <span style={{
                                        padding: '6px 12px',
                                        borderRadius: '9999px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        backgroundColor: project.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                                        color: project.status === 'active' ? '#16A34A' : '#6B7280',
                                    }}>
                                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                    </span>
                                </div>

                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{project.name}</h3>
                                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>{project.customer_name}</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6B7280' }}>
                                        <MapPin style={{ width: '16px', height: '16px' }} />
                                        <span>{project.location || 'No location'}</span>
                                    </div>
                                </div>

                                <div style={{ paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                                    <button
                                        onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '10px',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Eye style={{ width: '14px', height: '14px' }} />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // List View
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 100px',
                            gap: '16px',
                            padding: '14px 20px',
                            backgroundColor: '#F9FAFB',
                            borderBottom: '1px solid #E5E7EB',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                        }}>
                            <span>Project</span>
                            <span>Customer</span>
                            <span>Location</span>
                            <span>Status</span>
                            <span></span>
                        </div>

                        {/* Rows */}
                        {filteredProjects.map((project, idx) => (
                            <div
                                key={project.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 100px',
                                    gap: '16px',
                                    padding: '16px 20px',
                                    borderBottom: idx < filteredProjects.length - 1 ? '1px solid #F3F4F6' : 'none',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                                        <FolderKanban style={{ width: '16px', height: '16px', color: '#1E3A5F' }} />
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{project.name}</span>
                                </div>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>{project.customer_name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#6B7280' }}>
                                    <MapPin style={{ width: '14px', height: '14px' }} />
                                    {project.location || 'N/A'}
                                </div>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: project.status === 'active' ? '#DCFCE7' : '#F3F4F6',
                                    color: project.status === 'active' ? '#16A34A' : '#6B7280',
                                }}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                                <button
                                    onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Project Modal */}
                {showCreateModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}>
                        <div
                            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
                            onClick={() => setShowCreateModal(false)}
                        />
                        <div style={{
                            position: 'relative',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '560px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#9CA3AF',
                                    padding: '4px',
                                }}
                            >
                                <X style={{ width: '20', height: '20' }} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                                    <FolderKanban style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                                </div>
                                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>Create New Project</h2>
                            </div>

                            <form onSubmit={handleCreateProject}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            Customer *
                                        </label>
                                        <select
                                            required
                                            value={createForm.customer}
                                            onChange={(e) => setCreateForm(f => ({ ...f, customer: e.target.value, supervisors: [] }))}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <option value="">Select a customer...</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.company_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {createForm.customer && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                Assign Supervisors
                                            </label>
                                            {loadingSupervisors ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                                                    Loading supervisors...
                                                </div>
                                            ) : customerSupervisors.length === 0 ? (
                                                <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                                                    <UserCircle style={{ width: '24px', height: '24px', color: '#9CA3AF', margin: '0 auto 8px' }} />
                                                    <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No supervisors found for this customer</p>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {customerSupervisors.map((supervisor) => (
                                                        <div
                                                            key={supervisor.id}
                                                            onClick={() => toggleSupervisor(supervisor.id)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                padding: '12px 16px',
                                                                backgroundColor: createForm.supervisors.includes(supervisor.id) ? '#EFF6FF' : '#F9FAFB',
                                                                border: createForm.supervisors.includes(supervisor.id) ? '2px solid #2563EB' : '1px solid #E5E7EB',
                                                                borderRadius: '10px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s',
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '4px',
                                                                backgroundColor: createForm.supervisors.includes(supervisor.id) ? '#2563EB' : 'white',
                                                                border: createForm.supervisors.includes(supervisor.id) ? 'none' : '2px solid #D1D5DB',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}>
                                                                {createForm.supervisors.includes(supervisor.id) && (
                                                                    <Check style={{ width: '14px', height: '14px', color: 'white' }} />
                                                                )}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                                                    {supervisor.first_name} {supervisor.last_name}
                                                                </p>
                                                                {supervisor.company_name && (
                                                                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                                                                        {supervisor.company_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {createForm.supervisors.length > 0 && (
                                                        <p style={{ fontSize: '12px', color: '#16A34A', margin: '4px 0 0' }}>
                                                            {createForm.supervisors.length} supervisor{createForm.supervisors.length > 1 ? 's' : ''} selected
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            Project Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Enter project name"
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            Location *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.location}
                                            onChange={(e) => setCreateForm(f => ({ ...f, location: e.target.value }))}
                                            placeholder="e.g., Rotterdam, Netherlands"
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={createForm.description}
                                            onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="Brief project description..."
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: '#F9FAFB',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            style={{
                                                flex: 1,
                                                padding: '12px 20px',
                                                backgroundColor: 'white',
                                                color: '#374151',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px 20px',
                                                backgroundColor: '#1E3A5F',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                cursor: creating ? 'not-allowed' : 'pointer',
                                                opacity: creating ? 0.7 : 1,
                                            }}
                                        >
                                            <Plus style={{ width: '16px', height: '16px' }} />
                                            {creating ? 'Creating...' : 'Create Project'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
