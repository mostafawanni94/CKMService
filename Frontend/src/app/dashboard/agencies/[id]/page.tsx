'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Building2, Euro, Save, Percent, Clock,
    CheckCircle, Sun, Moon, Star, Calendar, Users, FileText,
    Phone, Mail, MapPin, Hash, CreditCard, Plus, Search,
    Download, Eye, AlertCircle, X
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';

// ─── Types ─────────────────────────────────────────────────────
interface SurchargeType {
    id: number;
    name: string;
    category: string;
    description: string;
    is_active: boolean;
}

interface AgencySurcharge {
    id?: number;
    surcharge_type_id: number;
    percentage: number;
    is_enabled: boolean;
}

interface Agency {
    id?: number;
    name: string;
    code: string;
    description: string;
    is_active: boolean;
    base_hourly_rate: number;
    has_surcharges: boolean;
    surcharges?: AgencySurcharge[];
    // Contact
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    // Legal
    kvk_number: string;
    btw_number: string;
    iban: string;
    // Address
    street_name: string;
    house_number: string;
    house_number_addition: string;
    postcode: string;
    city: string;
    country: string;
    full_address?: string;
    employee_count?: number;
}

interface AgencyEmployee {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    phone_number: string;
    hourly_rate: number | null;
    user_email: string;
}

interface AgencyInvoice {
    id: string;
    invoice_number: string;
    period_start: string;
    period_end: string;
    total_hours: string;
    total: string;
    status: string;
    status_display: string;
    amount_paid: string;
    amount_due: string;
    created_at: string;
}

const CATEGORY_ICONS: { [key: string]: React.ElementType } = {
    'weekend': Sun,
    'night_shift': Moon,
    'holiday': Star,
    'custom': Calendar,
};

const CATEGORY_COLORS: { [key: string]: string } = {
    'weekend': '#F59E0B',
    'night_shift': '#3B82F6',
    'holiday': '#10B981',
    'custom': '#8B5CF6',
};

const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
    'draft': { bg: '#F3F4F6', text: '#6B7280' },
    'pending': { bg: '#FEF3C7', text: '#D97706' },
    'sent': { bg: '#DBEAFE', text: '#2563EB' },
    'paid': { bg: '#D1FAE5', text: '#059669' },
    'partially_paid': { bg: '#FDE68A', text: '#B45309' },
    'overdue': { bg: '#FEE2E2', text: '#DC2626' },
    'cancelled': { bg: '#F3F4F6', text: '#9CA3AF' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AgencyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === 'new';
    const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'billing' | 'surcharges'>(isNew ? 'overview' : 'overview');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [surchargeTypes, setSurchargeTypes] = useState<SurchargeType[]>([]);
    const [employees, setEmployees] = useState<AgencyEmployee[]>([]);
    const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // Generate invoice modal
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatePeriodStart, setGeneratePeriodStart] = useState('');
    const [generatePeriodEnd, setGeneratePeriodEnd] = useState('');
    const [generating, setGenerating] = useState(false);

    const defaultAgency: Agency = {
        name: '', code: '', description: '', is_active: true,
        base_hourly_rate: 20.00, has_surcharges: false, surcharges: [],
        contact_name: '', contact_email: '', contact_phone: '',
        kvk_number: '', btw_number: '', iban: '',
        street_name: '', house_number: '', house_number_addition: '',
        postcode: '', city: '', country: 'Netherlands',
    };

    const [formData, setFormData] = useState<Agency>(defaultAgency);
    const [selectedSurcharges, setSelectedSurcharges] = useState<{ [key: number]: { enabled: boolean; percentage: number } }>({});

    useEffect(() => {
        fetchSurchargeTypes();
        if (!isNew) {
            fetchAgency();
        }
    }, [params.id]);

    const fetchSurchargeTypes = async () => {
        try {
            const response = await fetch(`${API_URL}/employees/surcharge-types/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSurchargeTypes(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load surcharge types', err); }
    };

    const fetchAgency = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/employees/agencies/${params.id}/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFormData(data);
                // Build surcharge state
                const surchargeMap: { [key: number]: { enabled: boolean; percentage: number } } = {};
                (data.surcharges || []).forEach((s: AgencySurcharge) => {
                    surchargeMap[s.surcharge_type_id] = { enabled: s.is_enabled, percentage: s.percentage };
                });
                setSelectedSurcharges(surchargeMap);
            }
        } catch (err) { console.error('Failed to load agency', err); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        if (!params.id || isNew) return;
        try {
            setLoadingEmployees(true);
            const response = await fetch(`${API_URL}/employees/agencies/${params.id}/employees/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load employees', err); }
        finally { setLoadingEmployees(false); }
    };

    const fetchInvoices = async () => {
        if (!params.id || isNew) return;
        try {
            setLoadingInvoices(true);
            const response = await fetch(`${API_URL}/invoices/agency-invoices/?agency=${params.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                setInvoices(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load invoices', err); }
        finally { setLoadingInvoices(false); }
    };

    useEffect(() => {
        if (activeTab === 'employees' && employees.length === 0) fetchEmployees();
        if (activeTab === 'billing' && invoices.length === 0) fetchInvoices();
    }, [activeTab]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const surcharges = Object.entries(selectedSurcharges)
                .filter(([, val]) => val.enabled)
                .map(([typeId, val]) => ({
                    surcharge_type_id: parseInt(typeId),
                    percentage: val.percentage,
                    is_enabled: true,
                }));

            const payload = { ...formData, surcharges };
            const url = isNew ? `${API_URL}/employees/agencies/` : `${API_URL}/employees/agencies/${params.id}/`;
            const method = isNew ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                if (isNew) {
                    router.push(`/dashboard/agencies/${data.id}`);
                } else {
                    setFormData(data);
                }
                alert('Agency saved successfully!');
            } else {
                const err = await response.json();
                alert(`Error: ${JSON.stringify(err)}`);
            }
        } catch (err) { alert('Failed to save agency'); }
        finally { setSaving(false); }
    };

    const handleGenerateInvoice = async () => {
        if (!generatePeriodStart || !generatePeriodEnd) return;
        setGenerating(true);
        try {
            const response = await fetch(`${API_URL}/invoices/agency-invoices/generate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify({
                    agency_id: parseInt(params.id as string),
                    period_start: generatePeriodStart,
                    period_end: generatePeriodEnd,
                }),
            });
            if (response.ok) {
                alert('Invoice generated successfully!');
                setShowGenerateModal(false);
                fetchInvoices();
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || JSON.stringify(err)}`);
            }
        } catch (err) { alert('Failed to generate invoice'); }
        finally { setGenerating(false); }
    };

    // ─── Styles ──────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
        borderRadius: '8px', fontSize: '14px', color: '#1E293B',
        outline: 'none', transition: 'border-color 0.2s',
        background: '#FFFFFF',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px',
    };
    const cardStyle: React.CSSProperties = {
        background: 'white', borderRadius: '12px', padding: '24px',
        border: '1px solid #E2E8F0', marginBottom: '20px',
    };
    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px 20px', fontSize: '14px', fontWeight: active ? 700 : 500,
        color: active ? '#1E3A5F' : '#64748B', background: 'transparent',
        border: 'none', borderBottom: active ? '3px solid #1E3A5F' : '3px solid transparent',
        cursor: 'pointer', transition: 'all 0.2s',
    });

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => router.push('/dashboard/agencies')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#64748B' }}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                                {isNew ? 'New Agency' : formData.name}
                            </h1>
                            {!isNew && formData.code && (
                                <span style={{ fontSize: '13px', color: '#64748B' }}>Code: {formData.code}</span>
                            )}
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Tabs */}
                {!isNew && (
                    <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
                        <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
                            <Building2 size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Overview
                        </button>
                        <button style={tabStyle(activeTab === 'employees')} onClick={() => setActiveTab('employees')}>
                            <Users size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Employees ({formData.employee_count || 0})
                        </button>
                        <button style={tabStyle(activeTab === 'billing')} onClick={() => setActiveTab('billing')}>
                            <FileText size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Billing
                        </button>
                        <button style={tabStyle(activeTab === 'surcharges')} onClick={() => setActiveTab('surcharges')}>
                            <Percent size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Surcharges
                        </button>
                    </div>
                )}

                {/* ═══ OVERVIEW TAB ═══ */}
                {(activeTab === 'overview' || isNew) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Basic Info */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={18} color="#1E3A5F" /> Agency Information
                            </h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div><label style={labelStyle}>Agency Name *</label>
                                    <input style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Randstad" /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Code *</label>
                                        <input style={inputStyle} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., RAND" /></div>
                                    <div><label style={labelStyle}>Status</label>
                                        <select style={inputStyle} value={formData.is_active ? 'active' : 'inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'active' })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select></div>
                                </div>
                                <div><label style={labelStyle}>Description</label>
                                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={18} color="#1E3A5F" /> Contact Information
                            </h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div><label style={labelStyle}>Contact Person</label>
                                    <input style={inputStyle} value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Full name" /></div>
                                <div><label style={labelStyle}>Email</label>
                                    <input style={inputStyle} type="email" value={formData.contact_email} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} placeholder="email@agency.nl" /></div>
                                <div><label style={labelStyle}>Phone</label>
                                    <input style={inputStyle} value={formData.contact_phone} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+31 6 12345678" /></div>
                            </div>
                        </div>

                        {/* Address */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} color="#1E3A5F" /> Address
                            </h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Street</label>
                                        <input style={inputStyle} value={formData.street_name} onChange={e => setFormData({ ...formData, street_name: e.target.value })} /></div>
                                    <div><label style={labelStyle}>House Nr.</label>
                                        <input style={inputStyle} value={formData.house_number} onChange={e => setFormData({ ...formData, house_number: e.target.value })} /></div>
                                    <div><label style={labelStyle}>Addition</label>
                                        <input style={inputStyle} value={formData.house_number_addition} onChange={e => setFormData({ ...formData, house_number_addition: e.target.value })} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>Postcode</label>
                                        <input style={inputStyle} value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} /></div>
                                    <div><label style={labelStyle}>City</label>
                                        <input style={inputStyle} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>

                        {/* Legal & Financial */}
                        <div style={cardStyle}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Hash size={18} color="#1E3A5F" /> Legal & Financial
                            </h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={labelStyle}>KvK Number</label>
                                        <input style={inputStyle} value={formData.kvk_number} onChange={e => setFormData({ ...formData, kvk_number: e.target.value })} placeholder="12345678" /></div>
                                    <div><label style={labelStyle}>BTW Number</label>
                                        <input style={inputStyle} value={formData.btw_number} onChange={e => setFormData({ ...formData, btw_number: e.target.value })} placeholder="NL123456789B01" /></div>
                                </div>
                                <div><label style={labelStyle}>IBAN</label>
                                    <input style={inputStyle} value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} placeholder="NL91ABNA0417164300" /></div>
                                <div><label style={labelStyle}>Base Hourly Rate (€)</label>
                                    <input style={inputStyle} type="number" step="0.01" value={formData.base_hourly_rate}
                                        onChange={e => setFormData({ ...formData, base_hourly_rate: parseFloat(e.target.value) || 0 })} /></div>
                            </div>
                        </div>

                        {/* Surcharges toggle for new/overview */}
                        {isNew && (
                            <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Percent size={18} color="#1E3A5F" /> Surcharges
                                    </h3>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formData.has_surcharges}
                                            onChange={e => setFormData({ ...formData, has_surcharges: e.target.checked })} />
                                        <span style={{ fontSize: '14px' }}>Enable Surcharges</span>
                                    </label>
                                </div>
                                {formData.has_surcharges && renderSurchargesGrid()}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ EMPLOYEES TAB ═══ */}
                {activeTab === 'employees' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                                <Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                Employees at {formData.name}
                            </h3>
                        </div>
                        {loadingEmployees ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading employees...</div>
                        ) : employees.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                                <p style={{ fontSize: '15px', fontWeight: 600 }}>No employees assigned</p>
                                <p style={{ fontSize: '13px' }}>Assign employees to this agency from the Employees page.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                                        {['Name', 'Email', 'Phone', 'Status', 'Hourly Rate'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{emp.first_name} {emp.last_name}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#64748B' }}>{emp.user_email}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#64748B' }}>{emp.phone_number}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: emp.status === 'approved' ? '#D1FAE5' : '#FEF3C7', color: emp.status === 'approved' ? '#059669' : '#D97706' }}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>€{emp.hourly_rate || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ═══ BILLING TAB ═══ */}
                {activeTab === 'billing' && (
                    <div>
                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            {[
                                { label: 'Total Invoices', value: invoices.length, icon: FileText, color: '#3B82F6' },
                                { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: CheckCircle, color: '#10B981' },
                                { label: 'Pending', value: invoices.filter(i => ['draft', 'pending', 'sent'].includes(i.status)).length, icon: Clock, color: '#F59E0B' },
                                { label: 'Total Value', value: `€${invoices.reduce((s, i) => s + parseFloat(i.total || '0'), 0).toFixed(2)}`, icon: Euro, color: '#8B5CF6' },
                            ].map((stat, idx) => (
                                <div key={idx} style={{ ...cardStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <stat.icon size={20} color={stat.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>{stat.value}</div>
                                        <div style={{ fontSize: '12px', color: '#64748B' }}>{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Generate + Invoice List */}
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Agency Invoices</h3>
                                <button onClick={() => setShowGenerateModal(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                    <Plus size={16} /> Generate Invoice
                                </button>
                            </div>
                            {loadingInvoices ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading invoices...</div>
                            ) : invoices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                                    <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                                    <p style={{ fontSize: '15px', fontWeight: 600 }}>No invoices yet</p>
                                    <p style={{ fontSize: '13px' }}>Generate an invoice from approved work entries.</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                                            {['Invoice #', 'Period', 'Hours', 'Total', 'Status', 'Paid'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map(inv => {
                                            const sc = STATUS_COLORS[inv.status] || STATUS_COLORS['draft'];
                                            return (
                                                <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }} onClick={() => router.push(`/dashboard/agencies/${params.id}/invoice/${inv.id}`)}>
                                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: '#1E3A5F' }}>{inv.invoice_number}</td>
                                                    <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>{inv.period_start} → {inv.period_end}</td>
                                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600 }}>{parseFloat(inv.total_hours).toFixed(1)}h</td>
                                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}>€{parseFloat(inv.total).toFixed(2)}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: sc.bg, color: sc.text }}>{inv.status_display}</span>
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: parseFloat(inv.amount_due) <= 0 ? '#059669' : '#DC2626' }}>
                                                        €{parseFloat(inv.amount_paid).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ SURCHARGES TAB ═══ */}
                {activeTab === 'surcharges' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Surcharge Configuration</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formData.has_surcharges}
                                    onChange={e => setFormData({ ...formData, has_surcharges: e.target.checked })} />
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>Enable Surcharges</span>
                            </label>
                        </div>
                        {formData.has_surcharges ? renderSurchargesGrid() : (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                                <Percent size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                                <p style={{ fontSize: '15px', fontWeight: 600 }}>Surcharges disabled</p>
                                <p style={{ fontSize: '13px' }}>Enable surcharges above to configure rates.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ GENERATE INVOICE MODAL ═══ */}
                {showGenerateModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '440px', maxWidth: '90vw' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Generate Agency Invoice</h3>
                                <button onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                                Select the period for approved work entries. Only un-invoiced entries will be included.
                            </p>
                            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
                                <div><label style={labelStyle}>Period Start</label>
                                    <input type="date" style={inputStyle} value={generatePeriodStart} onChange={e => setGeneratePeriodStart(e.target.value)} /></div>
                                <div><label style={labelStyle}>Period End</label>
                                    <input type="date" style={inputStyle} value={generatePeriodEnd} onChange={e => setGeneratePeriodEnd(e.target.value)} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowGenerateModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                                <button onClick={handleGenerateInvoice} disabled={generating || !generatePeriodStart || !generatePeriodEnd}
                                    style={{ padding: '10px 20px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: generating ? 0.7 : 1 }}>
                                    {generating ? 'Generating...' : 'Generate Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );

    function renderSurchargesGrid() {
        const grouped: { [cat: string]: SurchargeType[] } = {};
        surchargeTypes.filter(t => t.is_active).forEach(t => {
            const cat = t.category || 'custom';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(t);
        });

        return (
            <div style={{ display: 'grid', gap: '16px' }}>
                {Object.entries(grouped).map(([category, types]) => {
                    const Icon = CATEGORY_ICONS[category] || Calendar;
                    const color = CATEGORY_COLORS[category] || '#8B5CF6';
                    return (
                        <div key={category}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <Icon size={16} color={color} />
                                <span style={{ fontSize: '13px', fontWeight: 700, color, textTransform: 'capitalize' }}>{category.replace('_', ' ')}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                                {types.map(type => {
                                    const state = selectedSurcharges[type.id] || { enabled: false, percentage: 0 };
                                    return (
                                        <div key={type.id} style={{ padding: '12px 14px', border: `1.5px solid ${state.enabled ? color : '#E2E8F0'}`, borderRadius: '10px', background: state.enabled ? `${color}08` : '#FAFAFA', transition: 'all 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                                                    <input type="checkbox" checked={state.enabled}
                                                        onChange={e => setSelectedSurcharges(prev => ({
                                                            ...prev,
                                                            [type.id]: { ...prev[type.id], enabled: e.target.checked, percentage: prev[type.id]?.percentage || 0 }
                                                        }))} />
                                                    {type.name}
                                                </label>
                                            </div>
                                            {state.enabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="number" step="0.01" style={{ ...inputStyle, width: '100px' }} value={state.percentage}
                                                        onChange={e => setSelectedSurcharges(prev => ({
                                                            ...prev,
                                                            [type.id]: { ...prev[type.id], percentage: parseFloat(e.target.value) || 0 }
                                                        }))} />
                                                    <span style={{ fontSize: '13px', color: '#64748B' }}>%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
}
