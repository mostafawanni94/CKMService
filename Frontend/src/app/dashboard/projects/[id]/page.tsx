'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';
import { FolderKanban, ArrowLeft, MapPin, Save, Trash2, Building2, AlertTriangle, UserCircle, Check, X, Calendar } from 'lucide-react';
import { Customer } from '@/lib/api';

interface Supervisor {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string;
}

interface ProjectDetail {
    id: string;
    name: string;
    location: string;
    description: string;
    customer: string;
    customer_name: string;
    status: string;
    supervisors_list?: Supervisor[];
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [editForm, setEditForm] = useState({
        name: '',
        location: '',
        description: '',
        customer: '',
    });

    // Supervisors state
    const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
    const [customerSupervisors, setCustomerSupervisors] = useState<Supervisor[]>([]);
    const [loadingSupervisors, setLoadingSupervisors] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    useEffect(() => {
        loadProject();
        loadCustomers();
    }, [params.id]);

    // Load supervisors when customer changes
    useEffect(() => {
        if (editForm.customer) {
            loadCustomerSupervisors(editForm.customer);
        } else {
            setCustomerSupervisors([]);
        }
    }, [editForm.customer]);

    async function loadCustomers() {
        try {
            const response = await fetch(`${API_URL}/customers/customers/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.results || []);
            }
        } catch (err) {
            console.error('Failed to load customers', err);
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

    async function loadProject() {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/projects/projects/${params.id}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Project not found');
            const data = await response.json();
            setProject(data);
            setEditForm({
                name: data.name || '',
                location: data.location || '',
                description: data.description || '',
                customer: data.customer || '',
            });
            // Set selected supervisors from project data
            if (data.supervisors_list) {
                setSelectedSupervisors(data.supervisors_list.map((s: Supervisor) => s.id));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function toggleSupervisor(supervisorId: string) {
        setSelectedSupervisors(prev =>
            prev.includes(supervisorId)
                ? prev.filter(id => id !== supervisorId)
                : [...prev, supervisorId]
        );
    }

    async function handleSave() {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/projects/projects/${params.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({
                    ...editForm,
                    outfolder: selectedSupervisors.length > 0 ? selectedSupervisors[0] : null,
                    supervisors: selectedSupervisors,
                }),
            });
            if (!response.ok) throw new Error('Failed to save');
            await loadProject();
            alert('Project updated successfully!');
        } catch (err) {
            alert('Failed to save project');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const response = await fetch(`${API_URL}/projects/projects/${params.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) throw new Error('Failed to delete');
            router.push('/dashboard/projects');
        } catch (err) {
            alert('Failed to delete project');
            setDeleting(false);
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none',
    };

    const labelStyle = {
        display: 'block' as const,
        fontSize: '12px',
        fontWeight: 600,
        color: '#6B7280',
        marginBottom: '8px',
        textTransform: 'uppercase' as const,
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <AlertTriangle style={{ width: '64px', height: '64px', color: '#EF4444', marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Project Not Found</h2>
                    <p style={{ color: '#6B7280', marginBottom: '16px' }}>The project you're looking for doesn't exist.</p>
                    <Button onClick={() => router.push('/dashboard/projects')} className="bg-[#1E3A5F]">
                        Back to Projects
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const statusStyles: Record<string, { bg: string; text: string }> = {
        active: { bg: '#DCFCE7', text: '#16A34A' },
        completed: { bg: '#F3F4F6', text: '#6B7280' },
        paused: { bg: '#FEF3C7', text: '#D97706' },
    };

    const currentStatus = statusStyles[project.status] || statusStyles.active;

    return (
        <DashboardLayout>
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard/projects')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6B7280',
                        fontSize: '14px',
                        fontWeight: 500,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '16px',
                    }}
                >
                    <ArrowLeft style={{ width: '16px', height: '16px' }} />
                    Back to Projects
                </button>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Project Icon */}
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1E3A5F, #3E5A8F)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '4px solid white',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        }}>
                            <FolderKanban style={{ width: '32px', height: '32px', color: 'white' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                {project.name}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <Building2 style={{ width: '14px', height: '14px', color: '#9CA3AF' }} />
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>{project.customer_name}</span>
                                <span style={{
                                    marginLeft: '8px',
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: currentStatus.bg,
                                    color: currentStatus.text,
                                }}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => router.push(`/dashboard/projects/${params.id}/planning`)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                backgroundColor: '#8B5CF6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <Calendar style={{ width: '16px', height: '16px' }} />
                            Planning
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                backgroundColor: 'white',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                            Delete
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 18px',
                                backgroundColor: '#1E3A5F',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.7 : 1,
                            }}
                        >
                            <Save style={{ width: '16px', height: '16px' }} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Form Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Project Details Card */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        padding: '24px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                                <FolderKanban style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Project Details</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Project Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Location</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} />
                                    <input
                                        type="text"
                                        value={editForm.location}
                                        onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                                        style={{ ...inputStyle, paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Customer</label>
                                <select
                                    value={editForm.customer}
                                    onChange={(e) => {
                                        setEditForm(f => ({ ...f, customer: e.target.value }));
                                        setSelectedSupervisors([]); // Reset supervisors when customer changes
                                    }}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                >
                                    <option value="">Select a customer...</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    rows={4}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Supervisors Card */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #E5E7EB',
                        padding: '24px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#F3E8FF', borderRadius: '10px' }}>
                                <UserCircle style={{ width: '20px', height: '20px', color: '#9333EA' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Supervisors</h2>
                                {selectedSupervisors.length > 0 && (
                                    <p style={{ fontSize: '12px', color: '#16A34A', margin: 0 }}>{selectedSupervisors.length} assigned</p>
                                )}
                            </div>
                        </div>

                        {!editForm.customer ? (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <UserCircle style={{ width: '32px', height: '32px', color: '#D1D5DB', margin: '0 auto 8px' }} />
                                <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>Select a customer first to see available supervisors</p>
                            </div>
                        ) : loadingSupervisors ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                                Loading supervisors...
                            </div>
                        ) : customerSupervisors.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <UserCircle style={{ width: '32px', height: '32px', color: '#D1D5DB', margin: '0 auto 8px' }} />
                                <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>No supervisors found for this customer</p>
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
                                            backgroundColor: selectedSupervisors.includes(supervisor.id) ? '#EFF6FF' : '#F9FAFB',
                                            border: selectedSupervisors.includes(supervisor.id) ? '2px solid #2563EB' : '1px solid #E5E7EB',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            backgroundColor: selectedSupervisors.includes(supervisor.id) ? '#2563EB' : 'white',
                                            border: selectedSupervisors.includes(supervisor.id) ? 'none' : '2px solid #D1D5DB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {selectedSupervisors.includes(supervisor.id) && (
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
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
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
                            onClick={() => setShowDeleteConfirm(false)}
                        />
                        <div style={{
                            position: 'relative',
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '100%',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#FEE2E2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <Trash2 style={{ width: '28px', height: '28px', color: '#DC2626' }} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Delete Project</h3>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
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
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        backgroundColor: '#DC2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: deleting ? 'not-allowed' : 'pointer',
                                        opacity: deleting ? 0.7 : 1,
                                    }}
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
