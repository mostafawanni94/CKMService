'use client';

import { Phone, Mail, Plus, X } from 'lucide-react';
import { inputStyle, labelStyle } from './FormCard';

interface Contact {
    contact_type: 'phone' | 'email' | 'mobile';
    value: string;
    label: string;
    is_primary: boolean;
}

interface ContactListEditorProps {
    contacts: Contact[];
    onAdd: (type: 'phone' | 'email') => void;
    onUpdate: (index: number, value: string) => void;
    onRemove: (index: number) => void;
    showLabels?: boolean;
}

/**
 * Reusable component for editing a list of phone numbers and emails.
 * Used in Company, Manager, and Supervisor sections.
 */
export function ContactListEditor({
    contacts,
    onAdd,
    onUpdate,
    onRemove,
    showLabels = true
}: ContactListEditorProps) {
    const phones = contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
    const emails = contacts.filter(c => c.contact_type === 'email');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Phone Numbers */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    {showLabels && <label style={{ ...labelStyle, marginBottom: 0 }}>Phone Numbers</label>}
                    <button
                        onClick={() => onAdd('phone')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus style={{ width: '12px', height: '12px' }} /> Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {phones.map((contact) => {
                        const idx = contacts.indexOf(contact);
                        return (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Phone style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '14px',
                                        height: '14px',
                                        color: '#9CA3AF'
                                    }} />
                                    <input
                                        type="tel"
                                        value={contact.value}
                                        onChange={(e) => onUpdate(idx, e.target.value)}
                                        placeholder="+31 6 12345678"
                                        style={{ ...inputStyle, paddingLeft: '36px' }}
                                    />
                                </div>
                                {phones.length > 1 && (
                                    <button
                                        onClick={() => onRemove(idx)}
                                        style={{
                                            padding: '10px',
                                            backgroundColor: '#FEE2E2',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#DC2626'
                                        }}
                                    >
                                        <X style={{ width: '14px', height: '14px' }} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {phones.length === 0 && (
                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
                            Click "Add" to add a phone number
                        </p>
                    )}
                </div>
            </div>

            {/* Email Addresses */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    {showLabels && <label style={{ ...labelStyle, marginBottom: 0 }}>Email Addresses</label>}
                    <button
                        onClick={() => onAdd('email')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus style={{ width: '12px', height: '12px' }} /> Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {emails.map((contact) => {
                        const idx = contacts.indexOf(contact);
                        return (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Mail style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '14px',
                                        height: '14px',
                                        color: '#9CA3AF'
                                    }} />
                                    <input
                                        type="email"
                                        value={contact.value}
                                        onChange={(e) => onUpdate(idx, e.target.value)}
                                        placeholder="email@example.com"
                                        style={{ ...inputStyle, paddingLeft: '36px' }}
                                    />
                                </div>
                                <button
                                    onClick={() => onRemove(idx)}
                                    style={{
                                        padding: '10px',
                                        backgroundColor: '#FEE2E2',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        color: '#DC2626'
                                    }}
                                >
                                    <X style={{ width: '14px', height: '14px' }} />
                                </button>
                            </div>
                        );
                    })}
                    {emails.length === 0 && (
                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>
                            Click "Add" to add an email address
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
