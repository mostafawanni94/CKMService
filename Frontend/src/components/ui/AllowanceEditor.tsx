'use client';

import { Plus, Trash2, Gift } from 'lucide-react';
import { FormCard, inputStyle, labelStyle } from './FormCard';

interface AllowanceType {
    id: number;
    name: string;
    code: string;
    base_price: string;
}

export interface CustomerAllowance {
    allowance_type: number | null;
    allowance_type_name?: string;
    allowance_type_code?: string;
    custom_name: string;
    custom_code: string;
    price: number;
    apply_surcharges: boolean;
}

interface AllowanceEditorProps {
    allowances: CustomerAllowance[];
    availableTypes: AllowanceType[];
    onAdd: () => void;
    onUpdate: (index: number, field: keyof CustomerAllowance, value: any) => void;
    onRemove: (index: number) => void;
    onSetAllowance: (index: number, allowance: CustomerAllowance) => void;
}

/**
 * Reusable component for managing customer allowances (predefined + custom).
 */
export function AllowanceEditor({
    allowances,
    availableTypes,
    onAdd,
    onUpdate,
    onRemove,
    onSetAllowance
}: AllowanceEditorProps) {
    return (
        <FormCard
            title="Allowances Configuration"
            subtitle="Add predefined or custom allowances"
            icon={<Gift style={{ width: '20px', height: '20px', color: '#F59E0B' }} />}
            iconBgColor="#FEF3C7"
            headerRight={
                <button
                    onClick={onAdd}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#1E3A5F',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Plus style={{ width: '14px', height: '14px' }} /> Add Allowance
                </button>
            }
        >
            {allowances.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '2px dashed #E5E7EB'
                }}>
                    <Gift style={{ width: '32px', height: '32px', color: '#9CA3AF', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                        No allowances configured. Click "Add Allowance" to get started.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allowances.map((allowance, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px 20px',
                                backgroundColor: allowance.allowance_type ? '#F0FDF4' : '#FEF2F2',
                                border: `2px solid ${allowance.allowance_type ? '#BBF7D0' : '#FECACA'}`,
                                borderRadius: '12px',
                            }}
                        >
                            {/* Type Dropdown */}
                            <select
                                value={allowance.allowance_type || 'custom'}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'custom') {
                                        onUpdate(index, 'allowance_type', null);
                                    } else {
                                        const typeId = parseInt(value);
                                        const type = availableTypes.find(t => t.id === typeId);
                                        if (type) {
                                            onSetAllowance(index, {
                                                allowance_type: type.id,
                                                allowance_type_name: type.name,
                                                allowance_type_code: type.code,
                                                custom_name: '',
                                                custom_code: '',
                                                price: parseFloat(type.base_price) || 0,
                                                apply_surcharges: allowance.apply_surcharges
                                            });
                                        }
                                    }
                                }}
                                style={{
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    backgroundColor: 'white',
                                    minWidth: '180px'
                                }}
                            >
                                <option value="custom">Custom Allowance</option>
                                {availableTypes.map(type => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} ({type.code})
                                    </option>
                                ))}
                            </select>

                            {/* Custom Name/Code (only for custom allowances) */}
                            {!allowance.allowance_type && (
                                <>
                                    <input
                                        type="text"
                                        value={allowance.custom_name}
                                        onChange={(e) => onUpdate(index, 'custom_name', e.target.value)}
                                        placeholder="Allowance Name"
                                        style={{ ...inputStyle, width: '150px' }}
                                    />
                                    <input
                                        type="text"
                                        value={allowance.custom_code}
                                        onChange={(e) => onUpdate(index, 'custom_code', e.target.value.toUpperCase())}
                                        placeholder="CODE"
                                        style={{ ...inputStyle, width: '80px', textTransform: 'uppercase' }}
                                    />
                                </>
                            )}

                            {/* Price */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '14px', color: '#6B7280' }}>€</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={allowance.price}
                                    onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
                                    style={{
                                        width: '80px',
                                        padding: '10px 12px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}
                                />
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>/hr</span>
                            </div>

                            {/* Apply Surcharges Toggle */}
                            <button
                                onClick={() => onUpdate(index, 'apply_surcharges', !allowance.apply_surcharges)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    backgroundColor: allowance.apply_surcharges ? '#DCFCE7' : '#F3F4F6',
                                    border: `1px solid ${allowance.apply_surcharges ? '#22C55E' : '#D1D5DB'}`,
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: allowance.apply_surcharges ? '#16A34A' : '#6B7280',
                                    cursor: 'pointer'
                                }}
                            >
                                {allowance.apply_surcharges ? '✓ Surcharges' : '○ No Surcharges'}
                            </button>

                            {/* Remove Button */}
                            <button
                                onClick={() => onRemove(index)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#FEE2E2',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} color="#DC2626" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </FormCard>
    );
}
