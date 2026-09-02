/**
 * useCustomerCreate — ViewModel for the page of the same name.
 *
 * Extracted from the page, which held its state, its fetching and its handlers
 * inline alongside the markup. The page composes; this decides.
 */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
    apiDownload, apiFetch, apiGet, apiGetAll, apiMutate, readApiError,
} from '@/hooks/useApi';
import type { PendingContract } from '@/components/ui/ContractUploader';

export interface Contact {
    contact_type: 'phone' | 'email' | 'mobile';
    value: string;
    label: string;
    is_primary: boolean;
}

export interface Manager {
    first_name: string;
    last_name: string;
    contacts: Contact[];
}

export interface Outfolder {
    first_name: string;
    last_name: string;
    rayon_name: string;
    contacts: Contact[];
}

export interface SurchargeType {
    id: number;
    name: string;
    category: string;
    is_active: boolean;
}

export interface CustomerSurcharge {
    surcharge_type: number;
    surcharge_type_name?: string;
    percentage: number;
    is_enabled: boolean;
}


export function useCustomerCreate() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [form, setForm] = useState({
        company_name: '',
        address: '',
        street_name: '',
        house_number: '',
        house_number_addition: '',
        city: '',
        postcode: '',
        website: '',
        iban: '',
        btw_number: '',
        kvk_number: '',
        g_rekening: ''
    });

    // Customer contacts (phones and emails)
    const [customerContacts, setCustomerContacts] = useState<Contact[]>([
        { contact_type: 'phone', value: '', label: '', is_primary: true },
    ]);
    const [hrEmail, setHrEmail] = useState<string>('');  // HR email with label 'hr'


    // General Manager
    const [manager, setManager] = useState<Manager>({
        first_name: '',
        last_name: '',
        contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: true }]
    });

    const [supervisors, setSupervisors] = useState<Outfolder[]>([]);
    const [showAddSupervisor, setShowAddSupervisor] = useState(false);
    const [newSupervisor, setNewSupervisor] = useState<Outfolder>({
        first_name: '',
        last_name: '',
        rayon_name: '',
        contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: false }]
    });

    // Pending Contracts (uploaded after customer creation)
    const [pendingContracts, setPendingContracts] = useState<PendingContract[]>([]);

    // Surcharge Types (shared)
    const [surchargeTypes, setSurchargeTypes] = useState<SurchargeType[]>([]);

    // Services Surcharges
    const [hasServiceSurcharges, setHasServiceSurcharges] = useState<boolean>(false);
    const [selectedServiceSurcharges, setSelectedServiceSurcharges] = useState<CustomerSurcharge[]>([]);

    // Allowances Surcharges
    const [hasAllowanceSurcharges, setHasAllowanceSurcharges] = useState<boolean>(false);
    const [selectedAllowanceSurcharges, setSelectedAllowanceSurcharges] = useState<CustomerSurcharge[]>([]);

    // Services Configuration
    const [availableServices, setAvailableServices] = useState<{ id: number; name: string; code: string; description: string; is_active: boolean }[]>([]);
    const [serviceRates, setServiceRates] = useState<{ service_id: number; service_name: string; price: number; is_active: boolean; apply_surcharges: boolean }[]>([]);

    // Allowances Configuration (global types + custom)
    interface AllowanceType {
        id: number;
        name: string;
        code: string;
        base_price: string;
        is_active: boolean;
    }
    const [availableAllowanceTypes, setAvailableAllowanceTypes] = useState<AllowanceType[]>([]);
    const [customerAllowances, setCustomerAllowances] = useState<{
        id?: number;
        allowance_type?: number | null;
        custom_name: string;
        custom_code: string;
        price: number;
        apply_surcharges: boolean;
    }[]>([]);

    // Postcode Lookup State
    const [postcodeSuggestions, setPostcodeSuggestions] = useState<Partial<{ street: string; city: string; municipality: string }>[]>([]);
    const [showPostcodeSuggestions, setShowPostcodeSuggestions] = useState(false);
    const [postcodeLookupLoading, setPostcodeLookupLoading] = useState(false);
    const postcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    useEffect(() => {
        loadSurchargeTypes();
        loadServices();
        loadAllowanceTypes();
    }, []);

    async function loadSurchargeTypes() {
        try {
            const response = await apiFetch(`/employees/surcharge-types/`);
            if (response.ok) {
                const data = await response.json();
                setSurchargeTypes(data.results || data);
            }
        } catch (err) {
            console.error('Failed to load surcharge types', err);
        }
    }

    async function loadServices() {
        try {
            const response = await apiFetch(`/customers/services/`);
            if (response.ok) {
                const data = await response.json();
                setAvailableServices(data.results || data);
            }
        } catch (err) {
            console.error('Failed to load services', err);
        }
    }

    async function loadAllowanceTypes() {
        try {
            const response = await apiFetch(`/employees/allowance-types/`);
            if (response.ok) {
                const data = await response.json();
                setAvailableAllowanceTypes(data.results || data);
            }
        } catch (err) {
            console.error('Failed to load allowance types', err);
        }
    }

    // Postcode Lookup Function using PDOK API
    async function lookupPostcode(postcode: string) {
        const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();

        if (cleanPostcode.length < 4) {
            setPostcodeSuggestions([]);
            setShowPostcodeSuggestions(false);
            return;
        }

        if (postcodeTimeoutRef.current) {
            clearTimeout(postcodeTimeoutRef.current);
        }

        postcodeTimeoutRef.current = setTimeout(async () => {
            if (cleanPostcode.length !== 6) return;

            setPostcodeLookupLoading(true);
            try {
                const formattedPostcode = cleanPostcode.slice(0, 4) + ' ' + cleanPostcode.slice(4);
                const response = await fetch(
                    `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${formattedPostcode}&fq=type:adres&rows=50`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data?.response?.docs && data.response.docs.length > 0) {
                        const streetMap = new Map<string, Partial<{ street: string; city: string; municipality: string }>>();

                        data.response.docs.forEach((doc: {
                            straatnaam?: string;
                            woonplaatsnaam?: string;
                            gemeentenaam?: string;
                        }) => {
                            const street = doc.straatnaam || '';
                            const city = doc.woonplaatsnaam || doc.gemeentenaam || '';
                            if (street && city && !streetMap.has(street)) {
                                streetMap.set(street, { municipality: doc.gemeentenaam || '' });
                            }
                        });

                        const suggestions = Array.from(streetMap.values());
                        if (suggestions.length > 0) {
                            setPostcodeSuggestions(suggestions);
                            setShowPostcodeSuggestions(true);
                        }
                    }
                }
            } catch (err) {
                console.error('Postcode lookup failed:', err);
            } finally {
                setPostcodeLookupLoading(false);
            }
        }, 500);
    }

    // Service Surcharge functions
    function toggleServiceSurcharge(surchargeTypeId: number) {
        const existing = selectedServiceSurcharges.find(s => s.surcharge_type === surchargeTypeId);
        if (existing?.is_enabled) {
            setSelectedServiceSurcharges(selectedServiceSurcharges.map(s =>
                s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: false } : s
            ));
        } else {
            if (existing) {
                setSelectedServiceSurcharges(selectedServiceSurcharges.map(s =>
                    s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: true } : s
                ));
            } else {
                const st = surchargeTypes.find(t => t.id === surchargeTypeId);
                setSelectedServiceSurcharges([...selectedServiceSurcharges, {
                    surcharge_type: surchargeTypeId,
                    surcharge_type_name: st?.name || '',
                    percentage: 25,
                    is_enabled: true
                }]);
            }
        }
    }

    function updateServiceSurchargePercentage(surchargeTypeId: number, percentage: number) {
        setSelectedServiceSurcharges(selectedServiceSurcharges.map(s =>
            s.surcharge_type === surchargeTypeId ? { ...s, percentage } : s
        ));
    }

    // Allowance Surcharge functions
    function toggleAllowanceSurcharge(surchargeTypeId: number) {
        const existing = selectedAllowanceSurcharges.find(s => s.surcharge_type === surchargeTypeId);
        if (existing?.is_enabled) {
            setSelectedAllowanceSurcharges(selectedAllowanceSurcharges.map(s =>
                s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: false } : s
            ));
        } else {
            if (existing) {
                setSelectedAllowanceSurcharges(selectedAllowanceSurcharges.map(s =>
                    s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: true } : s
                ));
            } else {
                const st = surchargeTypes.find(t => t.id === surchargeTypeId);
                setSelectedAllowanceSurcharges([...selectedAllowanceSurcharges, {
                    surcharge_type: surchargeTypeId,
                    surcharge_type_name: st?.name || '',
                    percentage: 25,
                    is_enabled: true
                }]);
            }
        }
    }

    function updateAllowanceSurchargePercentage(surchargeTypeId: number, percentage: number) {
        setSelectedAllowanceSurcharges(selectedAllowanceSurcharges.map(s =>
            s.surcharge_type === surchargeTypeId ? { ...s, percentage } : s
        ));
    }

    // Calculate rate is now based on service price, not base hourly rate
    // This function is no longer needed for surcharges preview
    // Surcharges will be applied during invoice generation

    // Service functions
    function toggleService(serviceId: number) {
        const existing = serviceRates.find(sr => sr.service_id === serviceId);
        if (existing?.is_active) {
            setServiceRates(serviceRates.map(sr =>
                sr.service_id === serviceId ? { ...sr, is_active: false } : sr
            ));
        } else {
            if (existing) {
                setServiceRates(serviceRates.map(sr =>
                    sr.service_id === serviceId ? { ...sr, is_active: true } : sr
                ));
            } else {
                const svc = availableServices.find(s => s.id === serviceId);
                setServiceRates([...serviceRates, {
                    service_id: serviceId,
                    service_name: svc?.name || '',
                    price: 0,
                    is_active: true,
                    apply_surcharges: true
                }]);
            }
        }
    }

    function updateServicePrice(serviceId: number, price: number) {
        setServiceRates(serviceRates.map(sr =>
            sr.service_id === serviceId ? { ...sr, price } : sr
        ));
    }

    function toggleServiceSurcharges(serviceId: number) {
        setServiceRates(serviceRates.map(sr =>
            sr.service_id === serviceId ? { ...sr, apply_surcharges: !sr.apply_surcharges } : sr
        ));
    }

    // Allowance functions
    function addAllowance() {
        setCustomerAllowances([...customerAllowances, {
            allowance_type: null,
            custom_name: '',
            custom_code: '',
            price: 0,
            apply_surcharges: false
        }]);
    }

    function updateAllowance(index: number, field: string, value: string | number | boolean | null) {
        setCustomerAllowances(customerAllowances.map((a, i) =>
            i === index ? { ...a, [field]: value } : a
        ));
    }

    function removeAllowance(index: number) {
        setCustomerAllowances(customerAllowances.filter((_, i) => i !== index));
    }

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    // Customer contact functions
    function addCustomerContact(type: 'phone' | 'email') {
        setCustomerContacts([...customerContacts, { contact_type: type, value: '', label: '', is_primary: false }]);
    }

    function removeCustomerContact(index: number) {
        setCustomerContacts(customerContacts.filter((_, i) => i !== index));
    }

    function updateCustomerContact(index: number, value: string) {
        setCustomerContacts(customerContacts.map((c, i) => i === index ? { ...c, value } : c));
    }

    // Manager contact functions
    function addManagerContact(type: 'phone' | 'email') {
        setManager(m => ({ ...m, contacts: [...m.contacts, { contact_type: type, value: '', label: '', is_primary: false }] }));
    }

    function removeManagerContact(index: number) {
        setManager(m => ({ ...m, contacts: m.contacts.filter((_, i) => i !== index) }));
    }

    function updateManagerContact(index: number, value: string) {
        setManager(m => ({ ...m, contacts: m.contacts.map((c, i) => i === index ? { ...c, value } : c) }));
    }

    // Supervisor contact functions
    function addSupervisorContact(type: 'phone' | 'email') {
        setNewSupervisor(s => ({
            ...s,
            contacts: [...s.contacts, { contact_type: type, value: '', label: '', is_primary: false }]
        }));
    }

    function removeSupervisorContact(index: number) {
        setNewSupervisor(s => ({ ...s, contacts: s.contacts.filter((_, i) => i !== index) }));
    }

    function updateSupervisorContact(index: number, value: string) {
        setNewSupervisor(s => ({
            ...s,
            contacts: s.contacts.map((c, i) => i === index ? { ...c, value } : c)
        }));
    }

    function handleAddSupervisor() {
        if (!newSupervisor.first_name.trim() || !newSupervisor.last_name.trim()) {
            alert('First name and last name are required');
            return;
        }
        setSupervisors([...supervisors, {
            ...newSupervisor,
            contacts: newSupervisor.contacts.filter(c => c.value.trim())
        }]);
        setNewSupervisor({
            first_name: '',
            last_name: '',
            rayon_name: '',
            contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: false }]
        });
        setShowAddSupervisor(false);
    }

    function removeSupervisor(index: number) {
        setSupervisors(supervisors.filter((_, i) => i !== index));
    }

    async function handleCreate() {
        if (!form.company_name.trim()) {
            alert('Company name is required');
            return;
        }

        setSaving(true);
        try {
            // First, create the customer
            const formData = new FormData();
            formData.append('company_name', form.company_name);
            formData.append('city', form.city);
            formData.append('postcode', form.postcode);
            // Build combined address for legacy field
            const combinedAddress = [form.street_name, form.house_number, form.house_number_addition].filter(Boolean).join(' ');
            formData.append('address', combinedAddress || form.address);
            formData.append('street_name', form.street_name);
            formData.append('house_number', form.house_number);
            formData.append('house_number_addition', form.house_number_addition);
            formData.append('country', 'Netherlands');
            formData.append('is_active', 'true');
            // Add manager name to customer
            if (manager.first_name) formData.append('manager_first_name', manager.first_name);
            if (manager.last_name) formData.append('manager_last_name', manager.last_name);
            if (form.iban) formData.append('iban', form.iban);
            if (form.btw_number) formData.append('btw_number', form.btw_number);
            if (form.kvk_number) formData.append('kvk_number', form.kvk_number);
            if (form.g_rekening) formData.append('g_rekening', form.g_rekening);
            if (form.website) {
                // Auto-format website: add https://www. if needed
                let website = form.website.trim().toLowerCase();
                // Remove any existing protocol
                website = website.replace(/^https?:\/\//i, '');
                // Add www. if not present
                if (!website.startsWith('www.')) {
                    website = 'www.' + website;
                }
                // Add https://
                website = 'https://' + website;
                formData.append('website', website);
            }
            if (logo) formData.append('logo', logo);

            const customerResponse = await apiFetch(`/customers/customers/`, {
                method: 'POST',
                body: formData
            });

            if (!customerResponse.ok) throw new Error(await readApiError(customerResponse));

            const createdCustomer = await customerResponse.json();

            // Add customer contacts
            for (const contact of customerContacts) {
                if (contact.value.trim()) {
                    await apiFetch(`/customers/customers/${createdCustomer.id}/add_contact/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contact_type: contact.contact_type,
                            value: contact.value,
                            label: 'company',
                            is_primary: contact.is_primary
                        })
                    });
                }
            }

            // Add manager contacts (labeled as 'manager')
            for (const contact of manager.contacts) {
                if (contact.value.trim()) {
                    await apiFetch(`/customers/customers/${createdCustomer.id}/add_contact/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contact_type: contact.contact_type,
                            value: contact.value,
                            label: 'manager',
                            is_primary: contact.is_primary
                        })
                    });
                }
            }

            // Add HR email if provided
            if (hrEmail.trim()) {
                await apiFetch(`/customers/customers/${createdCustomer.id}/add_contact/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contact_type: 'email',
                        value: hrEmail.trim(),
                        label: 'hr',
                        is_primary: false
                    })
                });
            }

            // Create the supervisors (outfolders)
            for (const supervisor of supervisors) {
                const outfolderResponse = await apiFetch(`/customers/outfolders/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer: createdCustomer.id,
                        first_name: supervisor.first_name,
                        last_name: supervisor.last_name,
                        company_name: supervisor.rayon_name || form.company_name,
                        notes: '',
                        is_active: true
                    })
                });

                if (outfolderResponse.ok) {
                    const createdOutfolder = await outfolderResponse.json();

                    for (const contact of supervisor.contacts) {
                        if (contact.value.trim()) {
                            await apiFetch(`/customers/outfolders/${createdOutfolder.id}/add_contact/`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    contact_type: contact.contact_type,
                                    value: contact.value,
                                    label: contact.label || '',
                                    is_primary: contact.is_primary
                                })
                            });
                        }
                    }
                }
            }

            // Save Billing Configuration
            const billingPayload = {
                has_service_surcharges: hasServiceSurcharges,
                has_allowance_surcharges: hasAllowanceSurcharges,
                service_surcharges: selectedServiceSurcharges.filter(s => s.is_enabled).map(s => ({
                    surcharge_type: s.surcharge_type,
                    percentage: s.percentage,
                    is_enabled: s.is_enabled
                })),
                allowance_surcharges: selectedAllowanceSurcharges.filter(s => s.is_enabled).map(s => ({
                    surcharge_type: s.surcharge_type,
                    percentage: s.percentage,
                    is_enabled: s.is_enabled
                })),
                service_rates: serviceRates.filter(sr => sr.is_active).map(sr => ({
                    service_id: sr.service_id,
                    price: sr.price,
                    is_active: true,
                    apply_surcharges: sr.apply_surcharges
                })),
                allowances: customerAllowances.filter(a => a.allowance_type || a.custom_name.trim()).map(a => ({
                    allowance_type: a.allowance_type || null,
                    custom_name: a.custom_name,
                    custom_code: a.custom_code || '',
                    price: a.price,
                    apply_surcharges: a.apply_surcharges
                }))
            };
            await apiFetch(`/customers/customers/${createdCustomer.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(billingPayload)
            });

            // Upload pending contracts
            for (const contract of pendingContracts) {
                const contractFormData = new FormData();
                contractFormData.append('contract_document', contract.file);
                contractFormData.append('effective_from', contract.effectiveFrom);
                if (contract.notes) contractFormData.append('notes', contract.notes);

                await apiFetch(`/customers/customers/${createdCustomer.id}/upload_contract/`, {
                    method: 'POST',
                    body: contractFormData
                });
            }

            router.push('/dashboard/customers');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create customer');
        } finally {
            setSaving(false);
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        fontSize: '14px',
        outline: 'none'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: '#6B7280',
        marginBottom: '8px',
        textTransform: 'uppercase' as const
    };

    const customerPhones = customerContacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
    const customerEmails = customerContacts.filter(c => c.contact_type === 'email');
    const managerPhones = manager.contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
    const managerEmails = manager.contacts.filter(c => c.contact_type === 'email');
    const supervisorPhones = newSupervisor.contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
    const supervisorEmails = newSupervisor.contacts.filter(c => c.contact_type === 'email');


    return {
        addAllowance, addCustomerContact, addManagerContact, addSupervisorContact, availableAllowanceTypes, availableServices, customerAllowances, customerContacts, customerEmails, customerPhones, form, handleAddSupervisor, handleCreate, handleLogoChange, hasAllowanceSurcharges, hasServiceSurcharges, hrEmail, inputStyle, labelStyle, logo, logoPreview, lookupPostcode, manager, managerEmails, managerPhones, newSupervisor, pendingContracts, postcodeLookupLoading, postcodeSuggestions, removeAllowance, removeCustomerContact, removeManagerContact, removeSupervisor, removeSupervisorContact, router, saving, selectedAllowanceSurcharges, selectedServiceSurcharges, serviceRates, setCustomerAllowances, setForm, setHasAllowanceSurcharges, setHasServiceSurcharges, setHrEmail, setManager, setNewSupervisor, setPendingContracts, setShowAddSupervisor, setShowPostcodeSuggestions, showAddSupervisor, showPostcodeSuggestions, supervisorEmails, supervisorPhones, supervisors, surchargeTypes, toggleAllowanceSurcharge, toggleService, toggleServiceSurcharge, updateAllowance, updateAllowanceSurchargePercentage, updateCustomerContact, updateManagerContact, updateServicePrice, updateServiceSurchargePercentage, updateSupervisorContact,
    };
}

export type CustomerCreateViewModel = ReturnType<typeof useCustomerCreate>;
