'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { useCustomerCreate } from '@/hooks/useCustomerCreate';
import { Button } from '@/components/ui';
import { ContractUploader, PendingContract } from '@/components/ui/ContractUploader';
import { FormCard, inputStyle as formInputStyle, labelStyle as formLabelStyle } from '@/components/ui/FormCard';
import { ContactListEditor } from '@/components/ui/ContactListEditor';
import { ArrowLeft, Save, Camera, Building2, UserCircle, Plus, X, Phone, Mail, PhoneCall, Briefcase, Euro, CheckCircle, Percent, CreditCard, Gift, Trash2, Check } from 'lucide-react';
import { apiFetch, readApiError } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';






export default function NewCustomerPage() {
    const { t } = useLanguage();
    const vm = useCustomerCreate();
    const {
        addAllowance, addCustomerContact, addManagerContact, addSupervisorContact, availableAllowanceTypes, availableServices, customerAllowances, customerContacts, customerEmails, customerPhones, form, handleAddSupervisor, handleCreate, handleLogoChange, hasAllowanceSurcharges, hasServiceSurcharges, hrEmail, inputStyle, labelStyle, logo, logoPreview, lookupPostcode, manager, managerEmails, managerPhones, newSupervisor, pendingContracts, postcodeLookupLoading, postcodeSuggestions, removeAllowance, removeCustomerContact, removeManagerContact, removeSupervisor, removeSupervisorContact, router, saving, selectedAllowanceSurcharges, selectedServiceSurcharges, serviceRates, setCustomerAllowances, setForm, setHasAllowanceSurcharges, setHasServiceSurcharges, setHrEmail, setManager, setNewSupervisor, setPendingContracts, setShowAddSupervisor, setShowPostcodeSuggestions, showAddSupervisor, showPostcodeSuggestions, supervisorEmails, supervisorPhones, supervisors, surchargeTypes, toggleAllowanceSurcharge, toggleService, toggleServiceSurcharge, updateAllowance, updateAllowanceSurchargePercentage, updateCustomerContact, updateManagerContact, updateServicePrice, updateServiceSurchargePercentage, updateSupervisorContact,
    } = vm;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-6 py-6">
                {/* Header - matching edit page design */}
                <div style={{ marginBottom: '24px' }}>
                    <button onClick={() => router.push('/dashboard/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px' }}>
                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                        {t('Back to Customers')}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ position: 'relative', width: '72px', height: '72px', cursor: 'pointer' }} onClick={() => document.getElementById('logo-upload')?.click()}>
                                <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Company logo" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                ) : (
                                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A5F, #3E5A8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                        <Building2 style={{ width: '32px', height: '32px', color: 'white' }} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                                    <Camera style={{ width: '14px', height: '14px', color: 'white' }} />
                                </div>
                            </div>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{t('Add New Customer')}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>Create a new customer account</span>
                                    <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                                        New
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => router.push('/dashboard/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'white', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                {t('Cancel')}
                            </button>
                            <button onClick={handleCreate} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                <Save style={{ width: '16px', height: '16px' }} /> {saving ? 'Creating...' : 'Create Customer'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Company Information Card - matching edit page style */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                            <Building2 style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Company Information')}</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><label style={labelStyle}>Company Name *</label><input type="text" value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="ACME Corporation" style={inputStyle} /></div>

                        {/* Street Name with Icon */}
                        <div>
                            <label style={labelStyle}>{t('Street Name')}</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🛣️</span>
                                <input
                                    type="text"
                                    value={form.street_name}
                                    onChange={(e) => setForm(f => ({ ...f, street_name: e.target.value }))}
                                    placeholder="Kerkstraat"
                                    style={{ ...inputStyle, paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        {/* House Number and Addition Row */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>{t('House Nr.')}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>🏠</span>
                                    <input
                                        type="text"
                                        value={form.house_number}
                                        onChange={(e) => setForm(f => ({ ...f, house_number: e.target.value }))}
                                        placeholder="123"
                                        style={{ ...inputStyle, paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={labelStyle}>{t('Add.')}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>➕</span>
                                    <input
                                        type="text"
                                        value={form.house_number_addition}
                                        onChange={(e) => setForm(f => ({ ...f, house_number_addition: e.target.value.toUpperCase() }))}
                                        placeholder="A"
                                        style={{ ...inputStyle, paddingLeft: '32px', textTransform: 'uppercase' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div><label style={labelStyle}>{t('City')}</label><input type="text" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Amsterdam" style={inputStyle} /></div>

                        {/* Postcode with Lookup */}
                        <div style={{ position: 'relative' }}>
                            <label style={labelStyle}>Postcode 🔗</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={form.postcode}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        setForm(f => ({ ...f, postcode: value }));
                                        lookupPostcode(value);
                                    }}
                                    placeholder="1234 AB"
                                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                                />
                                {postcodeLookupLoading && (
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>⏳</span>
                                )}
                            </div>

                            {/* Street Suggestions Dropdown */}
                            {showPostcodeSuggestions && postcodeSuggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 9999,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                                        <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>🛣️ Select Street</span>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {postcodeSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    // A PDOK suggestion may
                                                    // carry only part of an
                                                    // address; keep what is
                                                    // already typed.
                                                    setForm(f => ({
                                                        ...f,
                                                        city: suggestion.city ?? f.city,
                                                        street_name: suggestion.street ?? f.street_name,
                                                    }));
                                                    setShowPostcodeSuggestions(false);
                                                }}
                                                style={{
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'transparent',
                                                    borderBottom: '1px solid #F3F4F6'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style={{ fontSize: '14px' }}>🛣️</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{suggestion.street}</div>
                                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{suggestion.city}</div>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>{t('Select')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Website with Link Icon */}
                        <div>
                            <label style={labelStyle}>🔗 Website</label>
                            <input
                                type="url"
                                value={form.website}
                                onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                                placeholder="https://www.example.com"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Contact Information Section - integrated into Company Information */}
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '8px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
                                <PhoneCall style={{ width: '16px', height: '16px', color: '#D97706' }} />
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: 0 }}>{t('Contact Information')}</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Phone Numbers */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Phone Numbers')}</label>
                                    <button onClick={() => addCustomerContact('phone')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {customerPhones.map((contact, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="tel" value={contact.value} onChange={(e) => updateCustomerContact(customerContacts.indexOf(contact), e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            {customerPhones.length > 0 && (
                                                <button onClick={() => removeCustomerContact(customerContacts.indexOf(contact))} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                    <X style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {customerPhones.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No phone numbers. Click "Add" to add one.</p>
                                    )}
                                </div>
                            </div>

                            {/* Email Addresses */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Email Addresses')}</label>
                                    <button onClick={() => addCustomerContact('email')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {customerEmails.map((contact, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="email" value={contact.value} onChange={(e) => updateCustomerContact(customerContacts.indexOf(contact), e.target.value)} placeholder="info@company.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            <button onClick={() => removeCustomerContact(customerContacts.indexOf(contact))} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                <X style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        </div>
                                    ))}
                                    {customerEmails.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No email addresses. Click "Add" to add one.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* HR Email - Special field */}
                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Mail style={{ width: '16px', height: '16px', color: '#16A34A' }} />
                                <label style={{ ...labelStyle, marginBottom: 0, color: '#16A34A' }}>{t('HR Email (for Reports)')}</label>
                            </div>
                            <input
                                type="email"
                                value={hrEmail}
                                onChange={(e) => setHrEmail(e.target.value)}
                                placeholder="hr@company.com"
                                style={{ ...inputStyle, backgroundColor: 'white', borderColor: '#86EFAC' }}
                            />
                            <p style={{ fontSize: '11px', color: '#6B7280', margin: '6px 0 0' }}>{t('This email will appear on HR export reports')}</p>
                        </div>
                    </div>
                </div>


                {/* General Manager Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#DCFCE7', borderRadius: '10px' }}>
                            <Briefcase style={{ width: '20px', height: '20px', color: '#16A34A' }} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('General Manager')}</h2>
                    </div>

                    {/* Manager Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div><label style={labelStyle}>{t('First Name')}</label><input type="text" value={manager.first_name} onChange={(e) => setManager(m => ({ ...m, first_name: e.target.value }))} placeholder="John" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('Last Name')}</label><input type="text" value={manager.last_name} onChange={(e) => setManager(m => ({ ...m, last_name: e.target.value }))} placeholder="Doe" style={inputStyle} /></div>
                    </div>

                    {/* Manager Phone Numbers */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Phone Numbers')}</label>
                            <button onClick={() => addManagerContact('phone')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {managerPhones.map((contact, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                        <input type="tel" value={contact.value} onChange={(e) => updateManagerContact(manager.contacts.indexOf(contact), e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                    </div>
                                    {managerPhones.length > 0 && (
                                        <button onClick={() => removeManagerContact(manager.contacts.indexOf(contact))} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                            <X style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {managerPhones.length === 0 && (
                                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No phone numbers. Click "Add" to add one.</p>
                            )}
                        </div>
                    </div>

                    {/* Manager Email Addresses */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Email Addresses')}</label>
                            <button onClick={() => addManagerContact('email')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {managerEmails.map((contact, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                        <input type="email" value={contact.value} onChange={(e) => updateManagerContact(manager.contacts.indexOf(contact), e.target.value)} placeholder="manager@company.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                    </div>
                                    <button onClick={() => removeManagerContact(manager.contacts.indexOf(contact))} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                        <X style={{ width: '14px', height: '14px' }} />
                                    </button>
                                </div>
                            ))}
                            {managerEmails.length === 0 && (
                                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No email addresses. Click "Add" to add one.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Supervisors Section */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#F3E8FF', borderRadius: '10px' }}>
                                <UserCircle style={{ width: '20px', height: '20px', color: '#9333EA' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Supervisors')}</h2>
                            {supervisors.length > 0 && <span style={{ fontSize: '13px', color: '#9CA3AF' }}>({supervisors.length})</span>}
                        </div>
                        {!showAddSupervisor && (
                            <button onClick={() => setShowAddSupervisor(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <Plus style={{ width: '14px', height: '14px' }} /> {t('Add Supervisor')}
                            </button>
                        )}
                    </div>

                    {/* Existing Supervisors List */}
                    {supervisors.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: showAddSupervisor ? '24px' : '0' }}>
                            {supervisors.map((sup, idx) => (
                                <div key={idx} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{sup.first_name} {sup.last_name}</p>
                                                {sup.rayon_name && (
                                                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#2563EB', borderRadius: '4px', fontWeight: 500 }}>
                                                        {sup.rayon_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                {sup.contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile').map((contact, i) => (
                                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                                                        <Phone style={{ width: '12px', height: '12px' }} /> {contact.value}
                                                    </span>
                                                ))}
                                                {sup.contacts.filter(c => c.contact_type === 'email').map((contact, i) => (
                                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                                                        <Mail style={{ width: '12px', height: '12px' }} /> {contact.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => removeSupervisor(idx)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                                            <X style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Supervisor Form */}
                    {showAddSupervisor && (
                        <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div><label style={labelStyle}>First Name *</label><input type="text" value={newSupervisor.first_name} onChange={(e) => setNewSupervisor(s => ({ ...s, first_name: e.target.value }))} placeholder="John" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Last Name *</label><input type="text" value={newSupervisor.last_name} onChange={(e) => setNewSupervisor(s => ({ ...s, last_name: e.target.value }))} placeholder="Doe" style={inputStyle} /></div>
                                <div><label style={labelStyle}>{t('Rayon Name')}</label><input type="text" value={newSupervisor.rayon_name} onChange={(e) => setNewSupervisor(s => ({ ...s, rayon_name: e.target.value }))} placeholder="e.g. Rotterdam Noord" style={inputStyle} /></div>
                            </div>

                            {/* Phone Numbers */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Phone Numbers')}</label>
                                    <button onClick={() => addSupervisorContact('phone')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {newSupervisor.contacts.map((contact, idx) => contact.contact_type === 'phone' || contact.contact_type === 'mobile' ? (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="tel" value={contact.value} onChange={(e) => updateSupervisorContact(idx, e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            {supervisorPhones.length > 1 && (
                                                <button onClick={() => removeSupervisorContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                    <X style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    ) : null)}
                                </div>
                            </div>

                            {/* Email Addresses */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Email Addresses')}</label>
                                    <button onClick={() => addSupervisorContact('email')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {newSupervisor.contacts.map((contact, idx) => contact.contact_type === 'email' ? (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="email" value={contact.value} onChange={(e) => updateSupervisorContact(idx, e.target.value)} placeholder="john@example.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            {supervisorEmails.length > 1 && (
                                                <button onClick={() => removeSupervisorContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                    <X style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    ) : null)}
                                    {supervisorEmails.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>Click "Add" to add an email address</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setShowAddSupervisor(false); setNewSupervisor({ first_name: '', last_name: '', rayon_name: '', contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: false }] }); }} style={{ padding: '10px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    {t('Cancel')}
                                </button>
                                <button onClick={handleAddSupervisor} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    <Plus style={{ width: '14px', height: '14px' }} /> {t('Add Supervisor')}
                                </button>
                            </div>
                        </div>
                    )}

                    {supervisors.length === 0 && !showAddSupervisor && (
                        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>{t('No supervisors added yet')}</p>
                    )}
                </div>


                {/* Services Configuration Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Briefcase style={{ width: '20px', height: '20px', color: '#7C3AED' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Services Configuration')}</h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{t('Select services and set prices for this customer')}</p>
                        </div>
                    </div>

                    {/* Enable Service Surcharges Toggle */}
                    <div
                        onClick={() => setHasServiceSurcharges(!hasServiceSurcharges)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            backgroundColor: hasServiceSurcharges ? 'rgba(124, 58, 237, 0.05)' : '#F9FAFB',
                            border: `2px solid ${hasServiceSurcharges ? '#7C3AED' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: hasServiceSurcharges ? '20px' : '24px'
                        }}
                    >
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: hasServiceSurcharges ? '#1F2937' : '#6B7280', margin: 0 }}>{t('Enable Percentage Surcharges')}</p>
                            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '2px 0 0' }}>{t('Add extra rates for weekends, nights, holidays on services')}</p>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '26px',
                            borderRadius: '13px',
                            backgroundColor: hasServiceSurcharges ? '#7C3AED' : '#D1D5DB',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: hasServiceSurcharges ? '21px' : '3px',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>

                    {/* Service Surcharge Types List */}
                    {hasServiceSurcharges && surchargeTypes.length > 0 && (
                        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Percent size={14} color="#7C3AED" />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase' }}>{t('Service Surcharge Types')}</span>
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {surchargeTypes.map((st) => {
                                    const surcharge = selectedServiceSurcharges.find(s => s.surcharge_type === st.id);
                                    const isSelected = surcharge?.is_enabled || false;
                                    const percentage = surcharge?.percentage || 25;

                                    return (
                                        <div
                                            key={st.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 14px',
                                                backgroundColor: isSelected ? '#EDE9FE' : 'white',
                                                border: `1px solid ${isSelected ? '#7C3AED' : '#E5E7EB'}`,
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleServiceSurcharge(st.id); }}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isSelected ? '#7C3AED' : 'white',
                                                    border: isSelected ? 'none' : '2px solid #D1D5DB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {isSelected && <Check size={12} color="white" />}
                                            </button>
                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: isSelected ? '#1F2937' : '#6B7280' }}>{st.name}</span>
                                            {isSelected && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={percentage === 0 ? '' : percentage}
                                                        onChange={(e) => updateServiceSurchargePercentage(st.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '60px',
                                                            padding: '4px 8px',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            color: '#111827',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            outline: 'none',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {availableServices.length === 0 ? (
                        <p style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic' }}>{t('No services available. Add some in Services Management.')}</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {availableServices.map((svc) => {
                                const rate = serviceRates.find(sr => sr.service_id === svc.id);
                                const isSelected = rate?.is_active || false;
                                const price = rate?.price || 0;

                                return (
                                    <div
                                        key={svc.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '16px 20px',
                                            backgroundColor: isSelected ? '#F5F3FF' : '#F9FAFB',
                                            border: `2px solid ${isSelected ? '#7C3AED' : '#E5E7EB'}`,
                                            borderRadius: '12px'
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleService(svc.id)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                backgroundColor: isSelected ? '#7C3AED' : 'white',
                                                border: isSelected ? 'none' : '2px solid #D1D5DB',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            {isSelected && <CheckCircle size={16} color="white" />}
                                        </button>

                                        {/* Service Icon */}
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: isSelected ? '#EDE9FE' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Briefcase size={16} color={isSelected ? '#7C3AED' : '#9CA3AF'} />
                                        </div>

                                        {/* Service Name and Code */}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#1F2937' : '#6B7280', margin: 0 }}>{svc.name}</p>
                                            {svc.code && <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>Code: {svc.code}</p>}
                                        </div>

                                        {/* Price Input */}
                                        {isSelected && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px', color: '#6B7280' }}>€</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={price}
                                                    onChange={(e) => updateServicePrice(svc.id, parseFloat(e.target.value) || 0)}
                                                    style={{
                                                        width: '100px',
                                                        padding: '8px 12px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: '#111827',
                                                        border: '1px solid #EDE9FE',
                                                        borderRadius: '8px',
                                                        outline: 'none',
                                                        backgroundColor: 'white',
                                                        textAlign: 'center'
                                                    }}
                                                />
                                                <span style={{ fontSize: '12px', color: '#6B7280' }}>per hour</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Allowances Configuration Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Gift style={{ width: '20px', height: '20px', color: '#DC2626' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Allowances Configuration')}</h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{t('Custom allowances for this customer (e.g., Mask, Hazard Pay)')}</p>
                            </div>
                        </div>
                        <button
                            onClick={addAllowance}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', backgroundColor: '#DC2626', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <Plus size={14} /> {t('Add Allowance')}
                        </button>
                    </div>

                    {/* Enable Allowances Surcharges Toggle */}
                    <div
                        onClick={() => setHasAllowanceSurcharges(!hasAllowanceSurcharges)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            backgroundColor: hasAllowanceSurcharges ? 'rgba(220, 38, 38, 0.05)' : '#F9FAFB',
                            border: `2px solid ${hasAllowanceSurcharges ? '#DC2626' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: hasAllowanceSurcharges ? '20px' : '24px'
                        }}
                    >
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: hasAllowanceSurcharges ? '#1F2937' : '#6B7280', margin: 0 }}>{t('Enable Percentage Surcharges')}</p>
                            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '2px 0 0' }}>{t('Add extra rates for weekends, nights, holidays on allowances')}</p>
                        </div>
                        <div style={{
                            width: '44px',
                            height: '26px',
                            borderRadius: '13px',
                            backgroundColor: hasAllowanceSurcharges ? '#DC2626' : '#D1D5DB',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: hasAllowanceSurcharges ? '21px' : '3px',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>

                    {/* Allowance Surcharge Types List */}
                    {hasAllowanceSurcharges && surchargeTypes.length > 0 && (
                        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Percent size={14} color="#DC2626" />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase' }}>{t('Allowance Surcharge Types')}</span>
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {surchargeTypes.map((st) => {
                                    const surcharge = selectedAllowanceSurcharges.find(s => s.surcharge_type === st.id);
                                    const isSelected = surcharge?.is_enabled || false;
                                    const percentage = surcharge?.percentage || 25;

                                    return (
                                        <div
                                            key={st.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 14px',
                                                backgroundColor: isSelected ? '#FEE2E2' : 'white',
                                                border: `1px solid ${isSelected ? '#DC2626' : '#E5E7EB'}`,
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleAllowanceSurcharge(st.id); }}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isSelected ? '#DC2626' : 'white',
                                                    border: isSelected ? 'none' : '2px solid #D1D5DB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {isSelected && <Check size={12} color="white" />}
                                            </button>
                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: isSelected ? '#1F2937' : '#6B7280' }}>{st.name}</span>
                                            {isSelected && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={percentage === 0 ? '' : percentage}
                                                        onChange={(e) => updateAllowanceSurchargePercentage(st.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            width: '60px',
                                                            padding: '4px 8px',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            color: '#111827',
                                                            border: '1px solid #D1D5DB',
                                                            borderRadius: '6px',
                                                            outline: 'none',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {customerAllowances.length === 0 ? (
                        <p style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                            No allowances configured. Click "Add Allowance" to select from available types.
                        </p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {customerAllowances.map((allowance, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 20px',
                                        backgroundColor: '#FEF2F2',
                                        border: '2px solid #FECACA',
                                        borderRadius: '12px'
                                    }}
                                >
                                    {/* Allowance Type Dropdown or Custom Name */}
                                    <select
                                        value={allowance.allowance_type || 'custom'}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'custom') {
                                                updateAllowance(index, 'allowance_type', null);
                                            } else {
                                                const typeId = parseInt(value);
                                                const type = availableAllowanceTypes.find(t => t.id === typeId);
                                                if (type) {
                                                    setCustomerAllowances(prev => prev.map((a, i) =>
                                                        i === index ? {
                                                            ...a,
                                                            allowance_type: typeId,
                                                            custom_name: type.name,
                                                            price: parseFloat(type.base_price) || 0
                                                        } : a
                                                    ));
                                                }
                                            }
                                        }}
                                        style={{
                                            width: '200px',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            outline: 'none',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="custom">-- Custom --</option>
                                        {availableAllowanceTypes.filter(t => t.is_active).map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} ({type.code}) - €{parseFloat(type.base_price).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Custom Name (only shown if custom selected) */}
                                    {!allowance.allowance_type && (
                                        <>
                                            <input
                                                type="text"
                                                placeholder={t('Name...')}
                                                value={allowance.custom_name}
                                                onChange={(e) => updateAllowance(index, 'custom_name', e.target.value)}
                                                style={{
                                                    width: '150px',
                                                    padding: '10px 14px',
                                                    fontSize: '14px',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    outline: 'none'
                                                }}
                                            />
                                            <input
                                                type="text"
                                                placeholder={t('Code...')}
                                                value={allowance.custom_code}
                                                onChange={(e) => updateAllowance(index, 'custom_code', e.target.value.toUpperCase())}
                                                maxLength={10}
                                                style={{
                                                    width: '90px',
                                                    padding: '10px 14px',
                                                    fontSize: '14px',
                                                    fontFamily: 'monospace',
                                                    textTransform: 'uppercase',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    outline: 'none'
                                                }}
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
                                            onChange={(e) => updateAllowance(index, 'price', parseFloat(e.target.value) || 0)}
                                            style={{
                                                width: '80px',
                                                padding: '10px 12px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px',
                                                outline: 'none',
                                                textAlign: 'center'
                                            }}
                                        />
                                        <span style={{ fontSize: '12px', color: '#6B7280' }}>/hr</span>
                                    </div>

                                    {/* Apply Surcharges Toggle */}
                                    <button
                                        onClick={() => updateAllowance(index, 'apply_surcharges', !allowance.apply_surcharges)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
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
                                        onClick={() => removeAllowance(index)}
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
                </div>

                {/* Financial Information Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '10px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" />
                                <path d="M1 10h22" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Financial Information')}</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><label style={labelStyle}>{t('IBAN')}</label><input type="text" value={form.iban} onChange={(e) => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))} placeholder="NL00BANK0000000000" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('G-Rekening')}</label><input type="text" value={form.g_rekening} onChange={(e) => setForm(f => ({ ...f, g_rekening: e.target.value.toUpperCase() }))} placeholder="NL00BANK0000000000" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('BTW Number')}</label><input type="text" value={form.btw_number} onChange={(e) => setForm(f => ({ ...f, btw_number: e.target.value.toUpperCase() }))} placeholder="NL123456789B01" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('KvK Number')}</label><input type="text" value={form.kvk_number} onChange={(e) => setForm(f => ({ ...f, kvk_number: e.target.value }))} placeholder="12345678" maxLength={8} style={inputStyle} /></div>
                    </div>
                </div>

                {/* Contract Documents Card */}
                <ContractUploader
                    contracts={pendingContracts}
                    onAdd={(contract) => setPendingContracts(prev => [...prev, contract])}
                    onRemove={(index) => setPendingContracts(prev => prev.filter((_, i) => i !== index))}
                    mode="create"
                />


                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => router.push('/dashboard/customers')} style={{ padding: '12px 24px', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                        {t('Cancel')}
                    </button>
                    <button onClick={handleCreate} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                        <Building2 style={{ width: '16px', height: '16px' }} />
                        {saving ? 'Creating...' : 'Create Customer'}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
