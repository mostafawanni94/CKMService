'use client';

import { useState } from 'react';
import { Phone, Mail, Plus, X, UserCircle, Trash2 } from 'lucide-react';
import { FormCard, inputStyle, labelStyle } from './FormCard';
import { ContactListEditor } from './ContactListEditor';

interface Contact {
    contact_type: 'phone' | 'email' | 'mobile';
    value: string;
    label: string;
    is_primary: boolean;
}

export interface Supervisor {
    first_name: string;
    last_name: string;
    rayon_name: string;
    contacts: Contact[];
}

interface SupervisorEditorProps {
    supervisors: Supervisor[];
    onAddSupervisor: (supervisor: Supervisor) => void;
    onRemoveSupervisor: (index: number) => void;
}

/**
 * Reusable component for managing supervisors with their contacts.
 */
export function SupervisorEditor({
    supervisors,
    onAddSupervisor,
    onRemoveSupervisor
}: SupervisorEditorProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSupervisor, setNewSupervisor] = useState<Supervisor>({
        first_name: '',
        last_name: '',
        rayon_name: '',
        contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: true }]
    });

    const addContact = (type: 'phone' | 'email') => {
        setNewSupervisor(s => ({
            ...s,
            contacts: [...s.contacts, { contact_type: type, value: '', label: '', is_primary: false }]
        }));
    };

    const updateContact = (index: number, value: string) => {
        setNewSupervisor(s => ({
            ...s,
            contacts: s.contacts.map((c, i) => i === index ? { ...c, value } : c)
        }));
    };

    const removeContact = (index: number) => {
        setNewSupervisor(s => ({
            ...s,
            contacts: s.contacts.filter((_, i) => i !== index)
        }));
    };

    const handleAdd = () => {
        if (!newSupervisor.first_name || !newSupervisor.last_name) {
            alert('Please enter first and last name');
            return;
        }
        onAddSupervisor(newSupervisor);
        setNewSupervisor({
            first_name: '',
            last_name: '',
            rayon_name: '',
            contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: true }]
        });
        setShowAddForm(false);
    };

    return (
        <FormCard
            title="Supervisors"
            icon={<UserCircle style={{ width: '20px', height: '20px', color: '#9333EA' }} />}
            iconBgColor="#F3E8FF"
            headerRight={
                !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
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
                        <Plus style={{ width: '14px', height: '14px' }} /> Add Supervisor
                    </button>
                )
            }
        >
            {/* Existing Supervisors List */}
            {supervisors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: showAddForm ? '24px' : '0' }}>
                    {supervisors.map((sup, idx) => (
                        <div key={idx} style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '12px',
                            border: '1px solid #E5E7EB'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                            {sup.first_name} {sup.last_name}
                                        </p>
                                        {sup.rayon_name && (
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                backgroundColor: '#EFF6FF',
                                                color: '#2563EB',
                                                borderRadius: '4px',
                                                fontWeight: 500
                                            }}>
                                                {sup.rayon_name}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                        {sup.contacts.filter(c => c.contact_type === 'phone').map((c, i) => (
                                            <span key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '13px',
                                                color: '#6B7280'
                                            }}>
                                                <Phone style={{ width: '12px', height: '12px' }} /> {c.value}
                                            </span>
                                        ))}
                                        {sup.contacts.filter(c => c.contact_type === 'email').map((c, i) => (
                                            <span key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '13px',
                                                color: '#6B7280'
                                            }}>
                                                <Mail style={{ width: '12px', height: '12px' }} /> {c.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveSupervisor(idx)}
                                    style={{
                                        padding: '8px',
                                        backgroundColor: '#FEE2E2',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Supervisor Form */}
            {showAddForm && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px dashed #9333EA'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={labelStyle}>First Name *</label>
                            <input
                                type="text"
                                value={newSupervisor.first_name}
                                onChange={(e) => setNewSupervisor(s => ({ ...s, first_name: e.target.value }))}
                                placeholder="First name"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name *</label>
                            <input
                                type="text"
                                value={newSupervisor.last_name}
                                onChange={(e) => setNewSupervisor(s => ({ ...s, last_name: e.target.value }))}
                                placeholder="Last name"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Rayon / Area</label>
                            <input
                                type="text"
                                value={newSupervisor.rayon_name}
                                onChange={(e) => setNewSupervisor(s => ({ ...s, rayon_name: e.target.value }))}
                                placeholder="e.g., Amsterdam Noord"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <ContactListEditor
                        contacts={newSupervisor.contacts}
                        onAdd={addContact}
                        onUpdate={updateContact}
                        onRemove={removeContact}
                    />

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            onClick={() => setShowAddForm(false)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: 'white',
                                color: '#374151',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 16px',
                                backgroundColor: '#16A34A',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Plus style={{ width: '14px', height: '14px' }} /> Add Supervisor
                        </button>
                    </div>
                </div>
            )}

            {supervisors.length === 0 && !showAddForm && (
                <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
                    No supervisors added yet
                </p>
            )}
        </FormCard>
    );
}
