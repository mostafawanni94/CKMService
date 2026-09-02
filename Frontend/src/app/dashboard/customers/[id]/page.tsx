'use client';

import { DashboardLayout } from '@/components/layout/dashboard';
import { Button } from '@/components/ui';
import { Building2, ArrowLeft, MapPin, Save, Trash2, CreditCard, AlertTriangle, Camera, UserCircle, Plus, X, Phone, Mail, Edit2, Check, PhoneCall, Briefcase, Euro, CheckCircle, Percent, FileText, Upload, Eye, Gift } from 'lucide-react';
import { useCustomerDetail } from '@/hooks/useCustomerDetail';
import { VatSettingsPanel } from '@/components/features/vat/VatSettingsPanel';
import { apiFetch, readApiError } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';

export default function CustomerDetailPage() {
    const { t } = useLanguage();
    const vm = useCustomerDetail();
    const {
        params, router, customer, loading, saving, deleting,
        showDeleteConfirm, setShowDeleteConfirm,
        editForm, setEditForm, logo, setLogo, logoPreview, setLogoPreview,
        customerContacts, newCustomerContacts, hrEmail, setHrEmail, existingHrContactId,
        addCustomerContact, removeNewCustomerContact, updateNewCustomerContact,
        manager, setManager, newManagerContacts,
        addManagerContact, removeNewManagerContact, updateNewManagerContact,
        outfolders, showAddOutfolder, setShowAddOutfolder,
        editingOutfolderId, newOutfolder, setNewOutfolder,
        addOutfolderContact, removeOutfolderContact, updateOutfolderContact,
        startEditOutfolder, cancelEdit, handleSaveOutfolder, removeOutfolder,
        surchargeTypes,
        hasSurcharges, setHasSurcharges, selectedSurcharges, toggleSurcharge, updateSurchargePercentage,
        hasServiceSurcharges, setHasServiceSurcharges, selectedServiceSurcharges, toggleServiceSurcharge, updateServiceSurchargePercentage,
        hasAllowanceSurcharges, setHasAllowanceSurcharges, selectedAllowanceSurcharges, toggleAllowanceSurcharge, updateAllowanceSurchargePercentage,
        availableServices, serviceRates, toggleService, updateServicePrice,
        availableAllowances, customerAllowances, setCustomerAllowances,
        toggleAllowance, updateAllowanceCustomPrice, toggleAllowanceSurcharges, toggleAllowanceSurchargeType,
        addCustomAllowance, updateCustomAllowance, removeCustomAllowance,
        contractHistory, showContractUploadModal, setShowContractUploadModal,
        newContractFile, setNewContractFile, newContractRate, setNewContractRate,
        newContractEffectiveFrom, setNewContractEffectiveFrom,
        uploadingContract, handleUploadContract, pendingSave,
        portalUsers, showAddPortalUser, setShowAddPortalUser,
        portalUserForm, setPortalUserForm,
        creatingPortalUser, setCreatingPortalUser,
        portalUserError, setPortalUserError,
        loadPortalUsers, setPortalUsers,
        API_URL,
        existingPhones, existingEmails, newPhones, newEmails,
        existingManagerPhones, existingManagerEmails, newManagerPhones, newManagerEmails,
        outfolderPhones, outfolderEmails,
        inputStyle, labelStyle,
        handleSave, handleDelete
    } = vm;

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!customer) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <AlertTriangle style={{ width: '64px', height: '64px', color: '#EF4444', marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>{t('Customer Not Found')}</h2>
                    <p style={{ color: '#6B7280', marginBottom: '16px' }}>The customer you're looking for doesn't exist.</p>
                    <Button onClick={() => router.push('/dashboard/customers')} className="bg-[#1E3A5F]">{t('Back to Customers')}</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-6 py-6">
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <button onClick={() => router.push('/dashboard/customers')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px' }}>
                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                        {t('Back to Customers')}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ position: 'relative', width: '72px', height: '72px', cursor: 'pointer' }} onClick={() => document.getElementById('customer-logo-upload')?.click()}>
                                <input id="customer-logo-upload" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setLogo(file); setLogoPreview(URL.createObjectURL(file)); } }} style={{ display: 'none' }} />
                                {logoPreview || (customer as any)?.logo ? (
                                    <img src={logoPreview || (customer as any)?.logo} alt="Company logo" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
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
                                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{customer.company_name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <MapPin style={{ width: '14px', height: '14px', color: '#9CA3AF' }} />
                                    <span style={{ fontSize: '14px', color: '#6B7280' }}>{customer.city}, {customer.country}</span>
                                    <span style={{ marginLeft: '8px', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, backgroundColor: customer.is_active ? '#DCFCE7' : '#F3F4F6', color: customer.is_active ? '#16A34A' : '#6B7280' }}>
                                        {customer.is_active ? t('Active') : t('Inactive')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'white', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                <Trash2 style={{ width: '16px', height: '16px' }} /> {t('Delete')}
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                <Save style={{ width: '16px', height: '16px' }} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Company Information Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '10px' }}>
                            <Building2 style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Company Information')}</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><label style={labelStyle}>{t('Company Name')}</label><input type="text" value={editForm.company_name} onChange={(e) => setEditForm(f => ({ ...f, company_name: e.target.value }))} style={inputStyle} /></div>

                        {/* Street Name with Icon */}
                        <div>
                            <label style={labelStyle}>🛣️ Street Name</label>
                            <input
                                type="text"
                                value={editForm.street_name}
                                onChange={(e) => setEditForm(f => ({ ...f, street_name: e.target.value }))}
                                placeholder="Kerkstraat"
                                style={inputStyle}
                            />
                        </div>

                        {/* House Number and Addition Row */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>🏠 House Nr.</label>
                                <input
                                    type="text"
                                    value={editForm.house_number}
                                    onChange={(e) => setEditForm(f => ({ ...f, house_number: e.target.value }))}
                                    placeholder="123"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ width: '100px' }}>
                                <label style={labelStyle}>➕ Add.</label>
                                <input
                                    type="text"
                                    value={editForm.house_number_addition}
                                    onChange={(e) => setEditForm(f => ({ ...f, house_number_addition: e.target.value.toUpperCase() }))}
                                    placeholder="A"
                                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                                />
                            </div>
                        </div>

                        <div><label style={labelStyle}>{t('City')}</label><input type="text" value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('Postcode')}</label><input type="text" value={editForm.postcode} onChange={(e) => setEditForm(f => ({ ...f, postcode: e.target.value.toUpperCase() }))} style={{ ...inputStyle, textTransform: 'uppercase' }} /></div>

                        {/* Website with Link Icon */}
                        <div>
                            <label style={labelStyle}>🔗 Website</label>
                            <input
                                type="url"
                                value={editForm.website}
                                onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))}
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
                                    {existingPhones.map((contact, idx) => (
                                        <div key={`existing-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                            <Phone style={{ width: '14px', height: '14px', color: '#6B7280' }} />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{contact.value}</span>
                                        </div>
                                    ))}
                                    {newCustomerContacts.map((contact, idx) => contact.contact_type === 'phone' || contact.contact_type === 'mobile' ? (
                                        <div key={`new-${idx}`} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="tel" value={contact.value} onChange={(e) => updateNewCustomerContact(idx, e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            <button onClick={() => removeNewCustomerContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                <X style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        </div>
                                    ) : null)}
                                    {existingPhones.length === 0 && newPhones.length === 0 && (
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
                                    {existingEmails.map((contact, idx) => (
                                        <div key={`existing-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                            <Mail style={{ width: '14px', height: '14px', color: '#6B7280' }} />
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{contact.value}</span>
                                        </div>
                                    ))}
                                    {newCustomerContacts.map((contact, idx) => contact.contact_type === 'email' ? (
                                        <div key={`new-${idx}`} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="email" value={contact.value} onChange={(e) => updateNewCustomerContact(idx, e.target.value)} placeholder="info@company.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            <button onClick={() => removeNewCustomerContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                <X style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        </div>
                                    ) : null)}
                                    {existingEmails.length === 0 && newEmails.length === 0 && (
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


                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: '20px', height: '20px' }} />
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{t('Active Customer')}</span>
                        </label>
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
                            {existingManagerPhones.map((contact, idx) => (
                                <div key={`existing-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                    <Phone style={{ width: '14px', height: '14px', color: '#6B7280' }} />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>{contact.value}</span>
                                </div>
                            ))}
                            {newManagerContacts.map((contact, idx) => contact.contact_type === 'phone' || contact.contact_type === 'mobile' ? (
                                <div key={`new-${idx}`} style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                        <input type="tel" value={contact.value} onChange={(e) => updateNewManagerContact(idx, e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                    </div>
                                    <button onClick={() => removeNewManagerContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                        <X style={{ width: '14px', height: '14px' }} />
                                    </button>
                                </div>
                            ) : null)}
                            {existingManagerPhones.length === 0 && newManagerPhones.length === 0 && (
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
                            {existingManagerEmails.map((contact, idx) => (
                                <div key={`existing-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                    <Mail style={{ width: '14px', height: '14px', color: '#6B7280' }} />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>{contact.value}</span>
                                </div>
                            ))}
                            {newManagerContacts.map((contact, idx) => contact.contact_type === 'email' ? (
                                <div key={`new-${idx}`} style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                        <input type="email" value={contact.value} onChange={(e) => updateNewManagerContact(idx, e.target.value)} placeholder="manager@company.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                    </div>
                                    <button onClick={() => removeNewManagerContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                        <X style={{ width: '14px', height: '14px' }} />
                                    </button>
                                </div>
                            ) : null)}
                            {existingManagerEmails.length === 0 && newManagerEmails.length === 0 && (
                                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No email addresses. Click "Add" to add one.</p>
                            )}
                        </div>
                    </div>
                </div>


                {/* What the VAT engine needs before it will decide anything. */}
                <div style={{ marginBottom: '24px' }}>
                    <VatSettingsPanel
                        endpoint={`/customers/customers/${vm.customer?.id}/`}
                        subtitle="Geldt voor alle projecten van deze klant, tenzij een project het anders vastlegt"
                    />
                </div>

                {/* Supervisors Section */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', backgroundColor: '#F3E8FF', borderRadius: '10px' }}>
                                <UserCircle style={{ width: '20px', height: '20px', color: '#9333EA' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Supervisors')}</h2>
                            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>({outfolders.length})</span>
                        </div>
                        {!showAddOutfolder && !editingOutfolderId && (
                            <button onClick={() => setShowAddOutfolder(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                <Plus style={{ width: '14px', height: '14px' }} /> {t('Add Supervisor')}
                            </button>
                        )}
                    </div>

                    {/* Existing Supervisors List */}
                    {outfolders.length > 0 && !editingOutfolderId && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: showAddOutfolder ? '24px' : '0' }}>
                            {outfolders.map((outfolder, idx) => (
                                <div key={outfolder.id || idx} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{outfolder.first_name} {outfolder.last_name}</p>
                                                {outfolder.company_name && (
                                                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#2563EB', borderRadius: '4px', fontWeight: 500 }}>
                                                        {outfolder.company_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                {outfolder.contacts?.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile').map((contact, i) => (
                                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                                                        <Phone style={{ width: '12px', height: '12px' }} /> {contact.value}
                                                    </span>
                                                ))}
                                                {outfolder.contacts?.filter(c => c.contact_type === 'email').map((contact, i) => (
                                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                                                        <Mail style={{ width: '12px', height: '12px' }} /> {contact.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => startEditOutfolder(outfolder)} style={{ padding: '8px', backgroundColor: '#EFF6FF', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#2563EB' }}>
                                                <Edit2 style={{ width: '16px', height: '16px' }} />
                                            </button>
                                            <button onClick={() => outfolder.id && removeOutfolder(outfolder.id)} style={{ padding: '8px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                <X style={{ width: '16px', height: '16px' }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add/Edit Supervisor Form */}
                    {(showAddOutfolder || editingOutfolderId) && (
                        <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>
                                {editingOutfolderId ? 'Edit Supervisor' : 'Add New Supervisor'}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div><label style={labelStyle}>First Name *</label><input type="text" value={newOutfolder.first_name} onChange={(e) => setNewOutfolder(s => ({ ...s, first_name: e.target.value }))} placeholder="John" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Last Name *</label><input type="text" value={newOutfolder.last_name} onChange={(e) => setNewOutfolder(s => ({ ...s, last_name: e.target.value }))} placeholder="Doe" style={inputStyle} /></div>
                                <div><label style={labelStyle}>{t('Rayon Name')}</label><input type="text" value={newOutfolder.company_name} onChange={(e) => setNewOutfolder(s => ({ ...s, company_name: e.target.value }))} placeholder="e.g. Rotterdam Noord" style={inputStyle} /></div>
                            </div>

                            {/* Phone Numbers */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>{t('Phone Numbers')}</label>
                                    <button onClick={() => addOutfolderContact('phone')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {newOutfolder.contacts.map((contact, idx) => contact.contact_type === 'phone' || contact.contact_type === 'mobile' ? (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Phone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="tel" value={contact.value} onChange={(e) => updateOutfolderContact(idx, e.target.value)} placeholder="+31 6 12345678" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            {outfolderPhones.length > 1 && (
                                                <button onClick={() => removeOutfolderContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
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
                                    <button onClick={() => addOutfolderContact('email')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                        <Plus style={{ width: '12px', height: '12px' }} /> {t('Add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {newOutfolder.contacts.map((contact, idx) => contact.contact_type === 'email' ? (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
                                                <input type="email" value={contact.value} onChange={(e) => updateOutfolderContact(idx, e.target.value)} placeholder="john@example.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                                            </div>
                                            {outfolderEmails.length > 1 && (
                                                <button onClick={() => removeOutfolderContact(idx)} style={{ padding: '10px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}>
                                                    <X style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    ) : null)}
                                    {outfolderEmails.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>Click "Add" to add an email address</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setShowAddOutfolder(false); cancelEdit(); }} style={{ padding: '10px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    {t('Cancel')}
                                </button>
                                <button onClick={handleSaveOutfolder} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    <Check style={{ width: '14px', height: '14px' }} /> {editingOutfolderId ? 'Save Changes' : t('Add Supervisor')}
                                </button>
                            </div>
                        </div>
                    )}

                    {outfolders.length === 0 && !showAddOutfolder && !editingOutfolderId && (
                        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>{t('No supervisors added yet')}</p>
                    )}
                </div>

                {/* Financial Information Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '10px' }}>
                            <CreditCard style={{ width: '20px', height: '20px', color: '#16A34A' }} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Financial Information')}</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div><label style={labelStyle}>{t('IBAN')}</label><input type="text" value={editForm.iban} onChange={(e) => setEditForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))} placeholder="NL00BANK0000000000" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('G-Rekening')}</label><input type="text" value={editForm.g_rekening} onChange={(e) => setEditForm(f => ({ ...f, g_rekening: e.target.value.toUpperCase() }))} placeholder="NL00BANK0000000000" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('BTW Number')}</label><input type="text" value={editForm.btw_number} onChange={(e) => setEditForm(f => ({ ...f, btw_number: e.target.value.toUpperCase() }))} placeholder="NL123456789B01" style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('KvK Number')}</label><input type="text" value={editForm.kvk_number} onChange={(e) => setEditForm(f => ({ ...f, kvk_number: e.target.value }))} placeholder="12345678" maxLength={8} style={inputStyle} /></div>
                    </div>
                </div>
                {/* Services Configuration Card (with integrated surcharges) */}
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
                            padding: '14px 18px',
                            backgroundColor: hasServiceSurcharges ? 'rgba(124, 58, 237, 0.05)' : '#F9FAFB',
                            border: `2px solid ${hasServiceSurcharges ? '#7C3AED' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: hasServiceSurcharges ? '#1F2937' : '#6B7280', margin: 0 }}>{t('Enable Percentage Surcharges')}</p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>{t('Add extra rates for weekends, nights, holidays on services')}</p>
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
                                                onClick={() => toggleServiceSurcharge(st.id)}
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

                    {/* Services List */}
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

                {/* Allowances Configuration Card (with integrated surcharges) */}
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
                            onClick={addCustomAllowance}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', backgroundColor: '#DC2626', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <Plus size={14} /> {t('Add Allowance')}
                        </button>
                    </div>

                    {/* Enable Allowance Surcharges Toggle */}
                    <div
                        onClick={() => setHasAllowanceSurcharges(!hasAllowanceSurcharges)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            backgroundColor: hasAllowanceSurcharges ? 'rgba(220, 38, 38, 0.05)' : '#F9FAFB',
                            border: `2px solid ${hasAllowanceSurcharges ? '#DC2626' : '#E5E7EB'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: hasAllowanceSurcharges ? '#1F2937' : '#6B7280', margin: 0 }}>{t('Enable Percentage Surcharges')}</p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '2px 0 0' }}>{t('Add extra rates for weekends, nights, holidays on allowances')}</p>
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
                                                onClick={() => toggleAllowanceSurcharge(st.id)}
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
                                                updateCustomAllowance(index, 'allowance_type', undefined);
                                            } else {
                                                const typeId = parseInt(value);
                                                const type = availableAllowances.find(t => t.id === typeId);
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
                                        {availableAllowances.filter(t => t.is_active).map(type => (
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
                                                onChange={(e) => updateCustomAllowance(index, 'custom_name', e.target.value)}
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
                                                value={allowance.custom_code || ''}
                                                onChange={(e) => updateCustomAllowance(index, 'custom_code', e.target.value.toUpperCase())}
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
                                            onChange={(e) => updateCustomAllowance(index, 'price', parseFloat(e.target.value) || 0)}
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
                                        onClick={() => updateCustomAllowance(index, 'apply_surcharges', !allowance.apply_surcharges)}
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
                                        onClick={() => removeCustomAllowance(index)}
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

                {/* Allowances Configuration Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Gift style={{ width: '20px', height: '20px', color: '#F59E0B' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Allowances Configuration (Toeslag)</h2>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Select which allowances this customer pays for</p>
                        </div>
                    </div>

                    {availableAllowances.length === 0 ? (
                        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center' }}>
                            No allowance types available. <a href="/dashboard/allowance-types" style={{ color: '#059669' }}>Create some first</a>.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {availableAllowances.filter(at => at.is_active).map((allowance) => {
                                const customerAllowance = customerAllowances.find(a => a.allowance_type === allowance.id);
                                const isEnabled = customerAllowance?.is_enabled || false;
                                const customPrice = customerAllowance?.custom_price;
                                const applySurcharges = customerAllowance?.apply_surcharges ?? true;

                                return (
                                    <div
                                        key={allowance.id}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: `2px solid ${isEnabled ? '#F59E0B' : '#E5E7EB'}`,
                                            backgroundColor: isEnabled ? '#FFFBEB' : '#F9FAFB'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAllowance(allowance.id)}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        border: `2px solid ${isEnabled ? '#F59E0B' : '#D1D5DB'}`,
                                                        backgroundColor: isEnabled ? '#F59E0B' : 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    {isEnabled && <Check size={14} style={{ color: 'white' }} />}
                                                </button>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Gift size={16} style={{ color: '#F59E0B' }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{allowance.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#6B7280' }}>Code: {allowance.code} • Base: €{parseFloat(allowance.base_price).toFixed(2)}/hr</div>
                                                </div>
                                            </div>

                                            {isEnabled && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '13px', color: '#6B7280' }}>Custom €</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder={allowance.base_price}
                                                            value={customPrice || ''}
                                                            onChange={(e) => updateAllowanceCustomPrice(allowance.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                                                            style={{
                                                                width: '80px',
                                                                padding: '6px 10px',
                                                                fontSize: '14px',
                                                                border: '1px solid #FCD34D',
                                                                borderRadius: '8px',
                                                                outline: 'none',
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                        <span style={{ fontSize: '13px', color: '#6B7280' }}>/hr</span>
                                                    </div>
                                                    <div style={{ padding: '6px 12px', backgroundColor: '#FEF3C7', borderRadius: '8px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }}>
                                                            €{customPrice !== undefined ? customPrice.toFixed(2) : parseFloat(allowance.base_price).toFixed(2)}/hr
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Surcharges for this allowance */}
                                        {isEnabled && hasSurcharges && (
                                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #FCD34D' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAllowanceSurcharges(allowance.id)}
                                                        style={{
                                                            width: '40px',
                                                            height: '22px',
                                                            backgroundColor: applySurcharges ? '#059669' : '#D1D5DB',
                                                            borderRadius: '11px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '2px',
                                                            left: applySurcharges ? '20px' : '2px',
                                                            width: '18px',
                                                            height: '18px',
                                                            backgroundColor: 'white',
                                                            borderRadius: '50%',
                                                            transition: 'left 0.2s'
                                                        }} />
                                                    </button>
                                                    <span style={{ fontSize: '13px', color: '#374151' }}>Apply surcharges to this allowance</span>
                                                </div>

                                                {applySurcharges && selectedSurcharges.filter(s => s.is_enabled).length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        {selectedSurcharges.filter(s => s.is_enabled).map(surcharge => {
                                                            const isSelected = customerAllowance?.enabled_surcharges_ids?.includes(surcharge.surcharge_type) || false;
                                                            return (
                                                                <button
                                                                    key={surcharge.surcharge_type}
                                                                    type="button"
                                                                    onClick={() => toggleAllowanceSurchargeType(allowance.id, surcharge.surcharge_type)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        border: `1px solid ${isSelected ? '#059669' : '#E5E7EB'}`,
                                                                        backgroundColor: isSelected ? '#D1FAE5' : 'white',
                                                                        color: isSelected ? '#059669' : '#6B7280',
                                                                        fontSize: '12px',
                                                                        fontWeight: 500,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {surcharge.surcharge_type_name} ({surcharge.percentage}%)
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Contract History Card */}

                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Contract History')}</h2>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>All contracts and rate changes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setNewContractRate('');
                                setNewContractEffectiveFrom(new Date().toISOString().split('T')[0]);
                                setShowContractUploadModal(true);
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', backgroundColor: '#3B82F6', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            <Upload size={16} />
                            Upload Contract
                        </button>
                    </div>

                    {contractHistory.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Effective From')}</th>
                                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Effective To')}</th>
                                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Services')}</th>
                                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Uploaded By')}</th>
                                    <th style={{ padding: '12px 8px', fontWeight: 600 }}>{t('Document')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contractHistory.map((contract) => (
                                    <tr key={contract.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '12px 8px', color: '#374151' }}>{new Date(contract.effective_from).toLocaleDateString()}</td>
                                        <td style={{ padding: '12px 8px', color: '#374151' }}>
                                            {contract.effective_to
                                                ? new Date(contract.effective_to).toLocaleDateString()
                                                : <span style={{ color: '#059669', fontWeight: 500, backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{t('Current')}</span>
                                            }
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#6B7280' }}>
                                            {contract.service_rates_snapshot && contract.service_rates_snapshot.length > 0
                                                ? `${contract.service_rates_snapshot.length} service(s)`
                                                : '-'}
                                        </td>

                                        <td style={{ padding: '12px 8px', color: '#6B7280' }}>{contract.uploaded_by_name || '-'}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            {contract.contract_document_url && (
                                                <a
                                                    href={contract.contract_document_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3B82F6', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}
                                                >
                                                    <Eye size={14} />
                                                    {t('View')}
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                            <FileText size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                            <p style={{ margin: 0 }}>No contracts uploaded yet</p>
                            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Click "Upload Contract" to add your first contract</p>
                        </div>
                    )}
                </div>

                {/* Contract Upload Modal */}
                {showContractUploadModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowContractUploadModal(false)} />
                        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '24px' }}>{t('Upload New Contract')}</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Contract Document *</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => setNewContractFile(e.target.files?.[0] || null)}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Effective From *</label>
                                <input
                                    type="date"
                                    value={newContractEffectiveFrom}
                                    onChange={(e) => setNewContractEffectiveFrom(e.target.value)}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                                />
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>You can set a future date - the contract will activate on that date</p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowContractUploadModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleUploadContract}
                                    disabled={uploadingContract}
                                    style={{
                                        padding: '10px 20px', backgroundColor: '#3B82F6', color: 'white',
                                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                                        opacity: uploadingContract ? 0.5 : 1
                                    }}
                                >
                                    {uploadingContract ? 'Uploading...' : 'Upload Contract'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Portal Access Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserCircle style={{ width: '20px', height: '20px', color: '#6366F1' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{t('Portal Access')}</h2>
                            <span style={{ fontSize: '12px', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '10px' }}>
                                {portalUsers.length} user{portalUsers.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => { setShowAddPortalUser(!showAddPortalUser); setPortalUserError(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                                backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <Plus style={{ width: '14px', height: '14px' }} /> Add Login
                        </button>
                    </div>

                    <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
                        Create login credentials so this customer can view their projects, work entries, and photos in the CKM Customer Portal app.
                    </p>

                    {/* Add Portal User Form */}
                    {showAddPortalUser && (
                        <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>{t('New Portal Login')}</h3>
                            {portalUserError && (
                                <div style={{ padding: '8px 12px', backgroundColor: '#FEE2E2', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>
                                    {portalUserError}
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                <input
                                    type="text" placeholder={t('First name')}
                                    value={portalUserForm.first_name}
                                    onChange={e => setPortalUserForm({ ...portalUserForm, first_name: e.target.value })}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}
                                />
                                <input
                                    type="text" placeholder={t('Last name')}
                                    value={portalUserForm.last_name}
                                    onChange={e => setPortalUserForm({ ...portalUserForm, last_name: e.target.value })}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <input
                                    type="email" placeholder="Email address"
                                    value={portalUserForm.email}
                                    onChange={e => setPortalUserForm({ ...portalUserForm, email: e.target.value })}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}
                                />
                                <input
                                    type="text" placeholder="Password (min 8 chars)"
                                    value={portalUserForm.password}
                                    onChange={e => setPortalUserForm({ ...portalUserForm, password: e.target.value })}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setShowAddPortalUser(false); setPortalUserError(null); }}
                                    style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                                >{t('Cancel')}</button>
                                <button
                                    onClick={async () => {
                                        if (!portalUserForm.email || !portalUserForm.password) {
                                            setPortalUserError('Email and password are required');
                                            return;
                                        }
                                        if (portalUserForm.password.length < 8) {
                                            setPortalUserError('Password must be at least 8 characters');
                                            return;
                                        }
                                        setCreatingPortalUser(true);
                                        setPortalUserError(null);
                                        try {
                                            const res = await apiFetch(`/employees/customer-users/`, {
                                                method: 'POST',
                                                body: JSON.stringify({ ...portalUserForm, customer_id: params.id })
                                            });
                                            if (!res.ok) throw new Error(await readApiError(res));
                                            // Reload portal users
                                            const listRes = await apiFetch(`/employees/customer-users/?customer=${params.id}`);
                                            if (listRes.ok) setPortalUsers(await listRes.json());
                                            setShowAddPortalUser(false);
                                            setPortalUserForm({ email: '', password: '', first_name: '', last_name: '' });
                                        } catch (err: any) {
                                            setPortalUserError(err.message || 'Failed to create portal user');
                                        } finally {
                                            setCreatingPortalUser(false);
                                        }
                                    }}
                                    disabled={creatingPortalUser}
                                    style={{
                                        padding: '8px 16px', backgroundColor: '#6366F1', color: 'white',
                                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                        cursor: creatingPortalUser ? 'not-allowed' : 'pointer',
                                        opacity: creatingPortalUser ? 0.6 : 1
                                    }}
                                >{creatingPortalUser ? 'Creating...' : 'Create Login'}</button>
                            </div>
                        </div>
                    )}

                    {/* Portal Users List */}
                    {portalUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
                            No portal users yet. Click "Add Login" to create access for this customer.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {portalUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: u.is_active ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserCircle style={{ width: '18px', height: '18px', color: u.is_active ? '#16A34A' : '#DC2626' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.email}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                            {u.email} • {u.is_active ? t('Active') : t('Inactive')}
                                            {u.last_login ? ` • Last login: ${new Date(u.last_login).toLocaleDateString()}` : ' • Never logged in'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const action = u.is_active ? 'deactivate' : 'activate';
                                            const res = await apiFetch(`/employees/customer-users/${u.id}/${action}/`, {
                                                method: 'POST'
                                            });
                                            if (!res.ok) {
                                                alert('Kon de portaaltoegang niet wijzigen.');
                                                return;
                                            }
                                            const listRes = await apiFetch(`/employees/customer-users/?customer=${params.id}`);
                                            if (listRes.ok) setPortalUsers(await listRes.json());
                                        }}
                                        style={{
                                            padding: '6px 12px', fontSize: '12px', fontWeight: 500,
                                            border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer',
                                            backgroundColor: u.is_active ? '#FEE2E2' : '#DCFCE7',
                                            color: u.is_active ? '#DC2626' : '#16A34A'
                                        }}
                                    >
                                        {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDeleteConfirm(false)} />
                        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertTriangle style={{ width: '32px', height: '32px', color: '#DC2626' }} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{t('Delete Customer')}</h3>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                                {t('Are you sure you want to delete')} <strong>{customer.company_name}</strong>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>{t('Cancel')}</button>
                                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                                    <Trash2 style={{ width: '16px', height: '16px' }} /> {deleting ? 'Deleting...' : t('Delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
