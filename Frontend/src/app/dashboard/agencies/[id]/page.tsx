'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Building2,
    Euro,
    Save,
    Percent,
    Clock,
    CheckCircle,
    Sun,
    Moon,
    Star,
    Calendar
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function AgencyFormPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === 'new';
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [surchargeTypes, setSurchargeTypes] = useState<SurchargeType[]>([]);

    const [formData, setFormData] = useState<Agency>({
        name: '',
        code: '',
        description: '',
        is_active: true,
        base_hourly_rate: 20.00,
        has_surcharges: false,
        surcharges: [],
    });

    const [selectedSurcharges, setSelectedSurcharges] = useState<{ [key: number]: { enabled: boolean; percentage: number } }>({});

    useEffect(() => {
        loadSurchargeTypes();
        if (!isNew) {
            loadAgency();
        }
    }, [params.id]);

    async function loadAgency() {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/employees/agencies/${params.id}/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFormData(data);
                // Load existing surcharges
                if (data.surcharges) {
                    const surchargeMap: { [key: number]: { enabled: boolean; percentage: number } } = {};
                    data.surcharges.forEach((s: any) => {
                        // Backend returns surcharge_type as integer ID in list, or object in detail
                        // We check all possibilities
                        const typeId = s.surcharge_type?.id || s.surcharge_type || s.surcharge_type_id;
                        if (typeId) {
                            surchargeMap[typeId] = {
                                enabled: s.is_enabled,
                                percentage: s.percentage
                            };
                        }
                    });
                    setSelectedSurcharges(surchargeMap);
                }
            }
        } catch (e) {
            console.error('Failed to load agency', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadSurchargeTypes() {
        try {
            const response = await fetch(`${API_URL}/employees/surcharge-types/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                const types = Array.isArray(data) ? data : (data.results || []);
                setSurchargeTypes(types.filter((t: SurchargeType) => t.is_active));
            }
        } catch (e) {
            console.error('Failed to load surcharge types', e);
        }
    }

    async function handleSave() {
        if (!formData.name.trim() || !formData.code.trim()) {
            alert('Please fill in required fields');
            return;
        }

        setSaving(true);
        try {
            const url = isNew ? `${API_URL}/employees/agencies/` : `${API_URL}/employees/agencies/${params.id}/`;
            const method = isNew ? 'POST' : 'PUT';

            // Prepare surcharges data
            const surchargesData = Object.entries(selectedSurcharges)
                .filter(([_, data]) => data.enabled)
                .map(([typeId, data]) => ({
                    surcharge_type: parseInt(typeId),
                    percentage: data.percentage,
                    is_enabled: true
                }));

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    ...formData,
                    surcharges: surchargesData
                })
            });

            if (response.ok) {
                router.push('/dashboard/agencies');
            } else {
                const data = await response.json();
                alert(data.detail || 'Failed to save');
            }
        } catch (e) {
            alert('Failed to save agency');
        } finally {
            setSaving(false);
        }
    }

    function toggleSurcharge(typeId: number) {
        setSelectedSurcharges(prev => ({
            ...prev,
            [typeId]: {
                enabled: !prev[typeId]?.enabled,
                percentage: prev[typeId]?.percentage || 25
            }
        }));
    }

    function updatePercentage(typeId: number, percentage: number) {
        setSelectedSurcharges(prev => ({
            ...prev,
            [typeId]: {
                ...prev[typeId],
                percentage
            }
        }));
    }

    function calculateRate(percentage: number): string {
        const baseVal = formData.base_hourly_rate;
        // Handle string inputs (including comma for decimals) and ensure number
        let base: number;

        if (typeof baseVal === 'string') {
            base = parseFloat((baseVal as string).replace(',', '.'));
        } else if (typeof baseVal === 'number') {
            base = baseVal;
        } else {
            base = 0;
        }

        const safeBase = Number.isNaN(base) ? 0 : base;
        return (safeBase + (safeBase * percentage / 100)).toFixed(2);
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div style={{ textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ padding: '0 0 32px 0', maxWidth: '900px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => router.push('/dashboard/agencies')}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: '#F3F4F6',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <ArrowLeft size={20} color="#6B7280" />
                        </button>
                        <div>
                            <h1 style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#1F2937',
                                margin: 0,
                            }}>
                                {isNew ? 'Create Agency' : 'Edit Agency'}
                            </h1>
                            <p style={{
                                fontSize: '15px',
                                color: '#6B7280',
                                marginTop: '4px',
                            }}>
                                Configure agency details and billing rates
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: saving ? '#9CA3AF' : '#7C3AED',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                        }}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Agency'}
                    </button>
                </div>

                {/* Basic Information Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    marginBottom: '24px',
                }}>
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#F3E8FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Building2 size={20} color="#7C3AED" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                Basic Information
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                Agency name and identification
                            </p>
                        </div>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={labelStyle}>Agency Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Randstad"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., RAND"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description..."
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        <div>
                            <ToggleOption
                                label="Active"
                                description="Agency is available for selection"
                                checked={formData.is_active}
                                onChange={(v) => setFormData({ ...formData, is_active: v })}
                                color="#7C3AED"
                            />
                        </div>
                    </div>
                </div>

                {/* Billing Configuration Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    marginBottom: '24px',
                }}>
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#D1FAE5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Euro size={20} color="#059669" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                                Billing Configuration
                            </h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                                Set base rates and surcharges
                            </p>
                        </div>
                    </div>

                    <div style={{ padding: '24px' }}>
                        {/* Base Hourly Rate */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Base Hourly Rate</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ position: 'relative', width: '200px' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#6B7280',
                                        fontWeight: 500,
                                    }}>€</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.base_hourly_rate ?? 0}
                                        onChange={(e) => setFormData({ ...formData, base_hourly_rate: parseFloat(e.target.value) || 0 })}
                                        style={{ ...inputStyle, paddingLeft: '36px' }}
                                    />
                                </div>
                                <div style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#D1FAE5',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
                                        €{Number(formData.base_hourly_rate || 0).toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#059669' }}>per hour</span>
                                </div>
                            </div>
                        </div>

                        {/* Enable Surcharges Toggle */}
                        <div style={{ marginBottom: '24px' }}>
                            <ToggleOption
                                label="Enable Percentage Surcharges"
                                description="Add extra rates for weekends, nights, holidays"
                                checked={formData.has_surcharges}
                                onChange={(v) => setFormData({ ...formData, has_surcharges: v })}
                                color="#059669"
                            />
                        </div>

                        {/* Surcharge Selection */}
                        {formData.has_surcharges && (
                            <div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '16px',
                                }}>
                                    <Percent size={18} color="#6B7280" />
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                        Available Surcharge Types
                                    </span>
                                </div>

                                {surchargeTypes.length === 0 ? (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: '12px',
                                        border: '1px dashed #E5E7EB',
                                    }}>
                                        <Clock size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                                        <p style={{ color: '#6B7280', fontSize: '14px' }}>
                                            No surcharge types available
                                        </p>
                                        <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '4px' }}>
                                            Create surcharge types in "Day Payment Types" first
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {surchargeTypes.map((type) => {
                                            const Icon = CATEGORY_ICONS[type.category] || Calendar;
                                            const color = CATEGORY_COLORS[type.category] || '#8B5CF6';
                                            const isSelected = selectedSurcharges[type.id]?.enabled;
                                            const percentage = selectedSurcharges[type.id]?.percentage || 25;

                                            return (
                                                <div
                                                    key={type.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '16px',
                                                        padding: '16px 20px',
                                                        backgroundColor: isSelected ? `${color}08` : '#F9FAFB',
                                                        border: `2px solid ${isSelected ? color : '#E5E7EB'}`,
                                                        borderRadius: '12px',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {/* Checkbox */}
                                                    <button
                                                        onClick={() => toggleSurcharge(type.id)}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            backgroundColor: isSelected ? color : 'white',
                                                            border: isSelected ? 'none' : '2px solid #D1D5DB',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {isSelected && <CheckCircle size={16} color="white" />}
                                                    </button>

                                                    {/* Icon */}
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        backgroundColor: `${color}15`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <Icon size={20} color={color} />
                                                    </div>

                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            color: isSelected ? '#1F2937' : '#6B7280',
                                                            margin: 0,
                                                        }}>
                                                            {type.name}
                                                        </p>
                                                        {type.description && (
                                                            <p style={{
                                                                fontSize: '12px',
                                                                color: '#9CA3AF',
                                                                margin: '2px 0 0',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {type.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Percentage Input */}
                                                    {isSelected && (
                                                        <>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="200"
                                                                    value={percentage}
                                                                    onChange={(e) => updatePercentage(type.id, parseFloat(e.target.value) || 0)}
                                                                    style={{
                                                                        width: '80px',
                                                                        padding: '8px 12px',
                                                                        fontSize: '14px',
                                                                        fontWeight: 600,
                                                                        border: '1px solid #E5E7EB',
                                                                        borderRadius: '8px',
                                                                        textAlign: 'center',
                                                                    }}
                                                                />
                                                                <span style={{ color: '#6B7280', fontWeight: 500 }}>%</span>
                                                            </div>

                                                            {/* Calculated Rate */}
                                                            <div style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: '#D1FAE5',
                                                                borderRadius: '8px',
                                                                minWidth: '100px',
                                                                textAlign: 'center',
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '16px',
                                                                    fontWeight: 700,
                                                                    color: '#059669',
                                                                }}>
                                                                    €{calculateRate(percentage)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
    color: '#374151',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    backgroundColor: 'white',
};

// Toggle Option Component
function ToggleOption({ label, description, checked, onChange, color = '#7C3AED' }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    color?: string;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: checked ? `${color}08` : '#F9FAFB',
                border: `2px solid ${checked ? color : '#E5E7EB'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            <div>
                <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: checked ? '#1F2937' : '#6B7280',
                    margin: 0,
                }}>{label}</p>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '2px 0 0' }}>{description}</p>
            </div>
            <div style={{
                width: '48px',
                height: '28px',
                borderRadius: '14px',
                backgroundColor: checked ? color : '#D1D5DB',
                position: 'relative',
                transition: 'all 0.15s ease',
            }}>
                <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '23px' : '3px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }} />
            </div>
        </div>
    );
}
