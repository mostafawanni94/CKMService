/**
 * useCustomerDetail — ViewModel for the Customer detail page.
 * Encapsulates all state, API calls, surcharges, contacts, outfolders,
 * services, allowances, contract history, and portal user logic.
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Customer } from '@/lib/api';
import { apiFetch, readApiError } from '@/hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ─── Types ──────────────────────────────────────────────────
export interface Contact {
  id?: string;
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
  id?: string;
  first_name: string;
  last_name: string;
  company_name: string;
  notes: string;
  is_active: boolean;
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

export interface ContractHistory {
  id: number;
  contract_document: string;
  contract_document_url: string;
  effective_from: string;
  effective_to: string | null;
  notes: string;
  uploaded_by_name: string | null;
  service_rates_snapshot: Array<{ service_id: number; service_name: string; price: string }>;
}

export interface ServiceRateHistory {
  id: number;
  service: number;
  service_name: string;
  price: string;
  effective_from: string;
  effective_to: string | null;
  changed_by_name: string | null;
}

// ─── Defaults ───────────────────────────────────────────────
const DEFAULT_EDIT_FORM = {
  company_name: '', city: '', postcode: '', address: '',
  street_name: '', house_number: '', house_number_addition: '',
  country: '', website: '', iban: '', btw_number: '', kvk_number: '',
  g_rekening: '', is_active: true
};

const DEFAULT_OUTFOLDER: Outfolder = {
  first_name: '', last_name: '', company_name: '', notes: '',
  is_active: true,
  contacts: [{ contact_type: 'phone', value: '', label: '', is_primary: false }]
};

const DEFAULT_PORTAL_FORM = { email: '', password: '', first_name: '', last_name: '' };

// ─── Hook ───────────────────────────────────────────────────
export function useCustomerDetail() {
  const params = useParams();
  const router = useRouter();

  // Core
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({ ...DEFAULT_EDIT_FORM });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Contacts
  const [customerContacts, setCustomerContacts] = useState<Contact[]>([]);
  const [newCustomerContacts, setNewCustomerContacts] = useState<Contact[]>([]);
  const [hrEmail, setHrEmail] = useState('');
  const [existingHrContactId, setExistingHrContactId] = useState<string | null>(null);

  // Manager
  const [manager, setManager] = useState<Manager>({ first_name: '', last_name: '', contacts: [] });
  const [newManagerContacts, setNewManagerContacts] = useState<Contact[]>([]);

  // Outfolders
  const [outfolders, setOutfolders] = useState<Outfolder[]>([]);
  const [showAddOutfolder, setShowAddOutfolder] = useState(false);
  const [editingOutfolderId, setEditingOutfolderId] = useState<string | null>(null);
  const [newOutfolder, setNewOutfolder] = useState<Outfolder>({ ...DEFAULT_OUTFOLDER });

  // Surcharges
  const [surchargeTypes, setSurchargeTypes] = useState<SurchargeType[]>([]);
  const [hasSurcharges, setHasSurcharges] = useState(false);
  const [selectedSurcharges, setSelectedSurcharges] = useState<CustomerSurcharge[]>([]);
  const [hasServiceSurcharges, setHasServiceSurcharges] = useState(false);
  const [selectedServiceSurcharges, setSelectedServiceSurcharges] = useState<CustomerSurcharge[]>([]);
  const [hasAllowanceSurcharges, setHasAllowanceSurcharges] = useState(false);
  const [selectedAllowanceSurcharges, setSelectedAllowanceSurcharges] = useState<CustomerSurcharge[]>([]);

  // Services
  const [availableServices, setAvailableServices] = useState<{ id: number; name: string; code: string; description: string; is_active: boolean }[]>([]);
  const [serviceRates, setServiceRates] = useState<{ service_id: number; service_name: string; price: number; is_active: boolean }[]>([]);
  const [originalServiceRates, setOriginalServiceRates] = useState<{ service_id: number; price: number }[]>([]);

  // Allowances
  const [availableAllowances, setAvailableAllowances] = useState<{ id: number; name: string; code: string; base_price: string; is_active: boolean }[]>([]);
  const [customerAllowances, setCustomerAllowances] = useState<{
    id?: number; allowance_type?: number; allowance_type_name?: string; allowance_type_code?: string;
    custom_name: string; custom_code?: string; custom_price?: number; price: number;
    is_enabled: boolean; apply_surcharges: boolean; enabled_surcharges_ids?: number[];
  }[]>([]);

  // Contract history
  const [contractHistory, setContractHistory] = useState<ContractHistory[]>([]);
  const [showContractUploadModal, setShowContractUploadModal] = useState(false);
  const [newContractFile, setNewContractFile] = useState<File | null>(null);
  const [newContractRate, setNewContractRate] = useState('');
  const [newContractEffectiveFrom, setNewContractEffectiveFrom] = useState('');
  const [uploadingContract, setUploadingContract] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Portal access
  const [portalUsers, setPortalUsers] = useState<{ id: string; email: string; first_name: string; last_name: string; is_active: boolean; created_at: string; last_login: string | null }[]>([]);
  const [showAddPortalUser, setShowAddPortalUser] = useState(false);
  const [portalUserForm, setPortalUserForm] = useState({ ...DEFAULT_PORTAL_FORM });
  const [creatingPortalUser, setCreatingPortalUser] = useState(false);
  const [portalUserError, setPortalUserError] = useState<string | null>(null);

  // ─── Loaders ──────────────────────────────────────────
  useEffect(() => {
    loadCustomer();
    loadSurchargeTypes();
    loadServices();
    loadAllowanceTypes();
    loadPortalUsers();
  }, [params.id]);

  async function loadCustomer() {
    setLoading(true);
    try {
      const response = await apiFetch(`/customers/customers/${params.id}/`);
      if (!response.ok) throw new Error('Customer not found');
      const data = await response.json();
      setCustomer(data);
      setEditForm({
        company_name: data.company_name || '', city: data.city || '', postcode: data.postcode || '',
        address: data.address || '', street_name: data.street_name || '', house_number: data.house_number || '',
        house_number_addition: data.house_number_addition || '', country: data.country || 'Netherlands',
        website: data.website || '', iban: data.iban || '', btw_number: data.btw_number || '',
        kvk_number: data.kvk_number || '', g_rekening: data.g_rekening || '', is_active: data.is_active ?? true
      });

      // Surcharges
      setHasSurcharges(data.has_surcharges || false);
      if (data.surcharges?.length) setSelectedSurcharges(data.surcharges.map((s: any) => ({
        surcharge_type: s.surcharge_type, surcharge_type_name: s.surcharge_type_name,
        percentage: parseFloat(s.percentage) || 25, is_enabled: s.is_enabled
      })));
      setHasServiceSurcharges(data.has_service_surcharges || false);
      if (data.service_surcharges?.length) setSelectedServiceSurcharges(data.service_surcharges.map((s: any) => ({
        surcharge_type: s.surcharge_type, surcharge_type_name: s.surcharge_type_name,
        percentage: parseFloat(s.percentage) || 25, is_enabled: s.is_enabled
      })));
      setHasAllowanceSurcharges(data.has_allowance_surcharges || false);
      if (data.allowance_surcharges?.length) setSelectedAllowanceSurcharges(data.allowance_surcharges.map((s: any) => ({
        surcharge_type: s.surcharge_type, surcharge_type_name: s.surcharge_type_name,
        percentage: parseFloat(s.percentage) || 25, is_enabled: s.is_enabled
      })));

      // Service rates
      if (data.service_rates?.length) {
        const rates = data.service_rates.map((sr: any) => ({
          service_id: sr.service, service_name: sr.service_name, price: parseFloat(sr.price) || 0, is_active: sr.is_active
        }));
        setServiceRates(rates);
        setOriginalServiceRates(rates.filter((r: any) => r.is_active).map((r: any) => ({ service_id: r.service_id, price: r.price })));
      }

      // Allowances
      if (data.allowances?.length) setCustomerAllowances(data.allowances.map((a: any) => ({
        id: a.id, allowance_type: a.allowance_type, allowance_type_name: a.allowance_type_name,
        custom_name: a.custom_name || a.allowance_type_name || '', price: parseFloat(a.price) || 0,
        is_enabled: a.is_enabled ?? true, apply_surcharges: a.apply_surcharges ?? false
      })));

      // Contacts
      if (data.contacts?.length) {
        const company = data.contacts.filter((c: Contact) => c.label !== 'manager' && c.label?.toLowerCase() !== 'hr');
        const mgr = data.contacts.filter((c: Contact) => c.label === 'manager');
        const hr = data.contacts.find((c: Contact) => c.label?.toLowerCase() === 'hr' && c.contact_type === 'email');
        setCustomerContacts(company);
        setManager({ first_name: data.manager_first_name || '', last_name: data.manager_last_name || '', contacts: mgr });
        setHrEmail(hr?.value || '');
        setExistingHrContactId(hr?.id || null);
      } else {
        setCustomerContacts([]);
        setManager({ first_name: data.manager_first_name || '', last_name: data.manager_last_name || '', contacts: [] });
        setHrEmail(''); setExistingHrContactId(null);
      }
      setNewCustomerContacts([]);
      setNewManagerContacts([]);

      // Outfolders
      if (data.outfolders?.length) setOutfolders(data.outfolders.map((o: any) => ({ ...o, contacts: o.contacts || [] })));

      loadContractHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSurchargeTypes() {
    try {
      const r = await apiFetch(`/employees/surcharge-types/`);
      if (r.ok) { const d = await r.json(); setSurchargeTypes(d.results || d); }
    } catch { console.error('Failed to load surcharge types'); }
  }

  async function loadServices() {
    try {
      const r = await apiFetch(`/customers/services/`);
      if (r.ok) { const d = await r.json(); setAvailableServices(d.results || d); }
    } catch { console.error('Failed to load services'); }
  }

  async function loadAllowanceTypes() {
    try {
      const r = await apiFetch(`/employees/allowance-types/`);
      if (r.ok) { const d = await r.json(); setAvailableAllowances(d.results || d); }
    } catch { console.error('Failed to load allowance types'); }
  }

  async function loadContractHistory() {
    try {
      const r = await apiFetch(`/customers/customers/${params.id}/contract_history/`);
      if (r.ok) setContractHistory(await r.json());
    } catch { console.error('Failed to load contract history'); }
  }

  async function loadPortalUsers() {
    try {
      const r = await apiFetch(`/employees/customer-users/?customer=${params.id}`);
      if (r.ok) setPortalUsers(await r.json());
    } catch { console.error('Failed to load portal users'); }
  }

  // ─── Contact helpers ──────────────────────────────────
  function addCustomerContact(type: 'phone' | 'email') {
    setNewCustomerContacts([...newCustomerContacts, { contact_type: type, value: '', label: 'company', is_primary: false }]);
  }
  function removeNewCustomerContact(index: number) { setNewCustomerContacts(newCustomerContacts.filter((_, i) => i !== index)); }
  function updateNewCustomerContact(index: number, value: string) {
    setNewCustomerContacts(newCustomerContacts.map((c, i) => i === index ? { ...c, value } : c));
  }

  function addManagerContact(type: 'phone' | 'email') {
    setNewManagerContacts([...newManagerContacts, { contact_type: type, value: '', label: 'manager', is_primary: false }]);
  }
  function removeNewManagerContact(index: number) { setNewManagerContacts(newManagerContacts.filter((_, i) => i !== index)); }
  function updateNewManagerContact(index: number, value: string) {
    setNewManagerContacts(newManagerContacts.map((c, i) => i === index ? { ...c, value } : c));
  }

  // ─── Surcharge toggles ────────────────────────────────
  function makeSurchargeToggler(
    selected: CustomerSurcharge[],
    setter: React.Dispatch<React.SetStateAction<CustomerSurcharge[]>>,
  ) {
    return (surchargeTypeId: number) => {
      const existing = selected.find(s => s.surcharge_type === surchargeTypeId);
      if (existing?.is_enabled) {
        setter(selected.map(s => s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: false } : s));
      } else if (existing) {
        setter(selected.map(s => s.surcharge_type === surchargeTypeId ? { ...s, is_enabled: true } : s));
      } else {
        const st = surchargeTypes.find(t => t.id === surchargeTypeId);
        setter([...selected, { surcharge_type: surchargeTypeId, surcharge_type_name: st?.name || '', percentage: 25, is_enabled: true }]);
      }
    };
  }

  function makeSurchargePercentageUpdater(
    selected: CustomerSurcharge[],
    setter: React.Dispatch<React.SetStateAction<CustomerSurcharge[]>>,
  ) {
    return (surchargeTypeId: number, percentage: number) => {
      setter(selected.map(s => s.surcharge_type === surchargeTypeId ? { ...s, percentage } : s));
    };
  }

  const toggleSurcharge = makeSurchargeToggler(selectedSurcharges, setSelectedSurcharges);
  const updateSurchargePercentage = makeSurchargePercentageUpdater(selectedSurcharges, setSelectedSurcharges);
  const toggleServiceSurcharge = makeSurchargeToggler(selectedServiceSurcharges, setSelectedServiceSurcharges);
  const updateServiceSurchargePercentage = makeSurchargePercentageUpdater(selectedServiceSurcharges, setSelectedServiceSurcharges);
  const toggleAllowanceSurcharge = makeSurchargeToggler(selectedAllowanceSurcharges, setSelectedAllowanceSurcharges);
  const updateAllowanceSurchargePercentage = makeSurchargePercentageUpdater(selectedAllowanceSurcharges, setSelectedAllowanceSurcharges);

  // ─── Service toggles ─────────────────────────────────
  function toggleService(serviceId: number) {
    const existing = serviceRates.find(sr => sr.service_id === serviceId);
    if (existing?.is_active) {
      setServiceRates(serviceRates.map(sr => sr.service_id === serviceId ? { ...sr, is_active: false } : sr));
    } else if (existing) {
      setServiceRates(serviceRates.map(sr => sr.service_id === serviceId ? { ...sr, is_active: true } : sr));
    } else {
      const svc = availableServices.find(s => s.id === serviceId);
      setServiceRates([...serviceRates, { service_id: serviceId, service_name: svc?.name || '', price: 0, is_active: true }]);
    }
  }

  function updateServicePrice(serviceId: number, price: number) {
    setServiceRates(serviceRates.map(sr => sr.service_id === serviceId ? { ...sr, price } : sr));
  }

  // ─── Allowance toggles ───────────────────────────────
  function toggleAllowance(allowanceId: number) {
    const existing = customerAllowances.find(a => a.allowance_type === allowanceId);
    if (existing?.is_enabled) {
      setCustomerAllowances(customerAllowances.map(a => a.allowance_type === allowanceId ? { ...a, is_enabled: false } : a));
    } else if (existing) {
      setCustomerAllowances(customerAllowances.map(a => a.allowance_type === allowanceId ? { ...a, is_enabled: true } : a));
    } else {
      const allowance = availableAllowances.find(at => at.id === allowanceId);
      setCustomerAllowances([...customerAllowances, {
        allowance_type: allowanceId, allowance_type_name: allowance?.name || '', allowance_type_code: allowance?.code || '',
        custom_name: allowance?.name || '', custom_price: undefined, price: parseFloat(allowance?.base_price || '0'),
        is_enabled: true, apply_surcharges: true, enabled_surcharges_ids: []
      }]);
    }
  }

  function updateAllowanceCustomPrice(allowanceId: number, customPrice: number | undefined) {
    setCustomerAllowances(customerAllowances.map(a => a.allowance_type === allowanceId ? { ...a, custom_price: customPrice } : a));
  }

  function toggleAllowanceSurcharges(allowanceId: number) {
    setCustomerAllowances(customerAllowances.map(a => a.allowance_type === allowanceId ? { ...a, apply_surcharges: !a.apply_surcharges } : a));
  }

  function toggleAllowanceSurchargeType(allowanceId: number, surchargeTypeId: number) {
    setCustomerAllowances(customerAllowances.map(a => {
      if (a.allowance_type === allowanceId) {
        const current = a.enabled_surcharges_ids || [];
        const newIds = current.includes(surchargeTypeId) ? current.filter(id => id !== surchargeTypeId) : [...current, surchargeTypeId];
        return { ...a, enabled_surcharges_ids: newIds };
      }
      return a;
    }));
  }

  function addCustomAllowance() {
    setCustomerAllowances([...customerAllowances, {
      allowance_type: undefined, custom_name: '', custom_code: '', price: 0, is_enabled: true, apply_surcharges: false
    }]);
  }

  function updateCustomAllowance(index: number, field: string, value: string | number | boolean | undefined) {
    setCustomerAllowances(customerAllowances.map((a, i) => i === index ? { ...a, [field]: value } : a));
  }

  function removeCustomAllowance(index: number) {
    setCustomerAllowances(customerAllowances.filter((_, i) => i !== index));
  }

  // ─── Outfolder helpers ────────────────────────────────
  function addOutfolderContact(type: 'phone' | 'email') {
    setNewOutfolder(s => ({ ...s, contacts: [...s.contacts, { contact_type: type, value: '', label: '', is_primary: false }] }));
  }
  function removeOutfolderContact(index: number) { setNewOutfolder(s => ({ ...s, contacts: s.contacts.filter((_, i) => i !== index) })); }
  function updateOutfolderContact(index: number, value: string) {
    setNewOutfolder(s => ({ ...s, contacts: s.contacts.map((c, i) => i === index ? { ...c, value } : c) }));
  }

  function startEditOutfolder(outfolder: Outfolder) {
    setEditingOutfolderId(outfolder.id || null);
    setNewOutfolder({ ...outfolder, contacts: outfolder.contacts.length > 0 ? outfolder.contacts : [{ contact_type: 'phone', value: '', label: '', is_primary: false }] });
    setShowAddOutfolder(false);
  }

  function cancelEdit() {
    setEditingOutfolderId(null);
    setNewOutfolder({ ...DEFAULT_OUTFOLDER });
  }

  async function handleSaveOutfolder() {
    if (!newOutfolder.first_name.trim() || !newOutfolder.last_name.trim()) { alert('First name and last name are required'); return; }
    try {
      if (editingOutfolderId) {
        const r = await apiFetch(`/customers/outfolders/${editingOutfolderId}/`, {
          method: 'PATCH', 
          body: JSON.stringify({ first_name: newOutfolder.first_name, last_name: newOutfolder.last_name, company_name: newOutfolder.company_name, notes: newOutfolder.notes, is_active: true })
        });
        if (!r.ok) throw new Error('Failed to update supervisor');
        for (const c of newOutfolder.contacts) {
          if (c.value.trim() && !c.id) await apiFetch(`/customers/outfolders/${editingOutfolderId}/add_contact/`, {
            method: 'POST', 
            body: JSON.stringify({ contact_type: c.contact_type, value: c.value, label: c.label || '', is_primary: c.is_primary })
          });
        }
        setEditingOutfolderId(null);
        alert('Supervisor updated successfully!');
      } else {
        const r = await apiFetch(`/customers/outfolders/`, {
          method: 'POST', 
          body: JSON.stringify({ customer: params.id, first_name: newOutfolder.first_name, last_name: newOutfolder.last_name, company_name: newOutfolder.company_name || customer?.company_name || '', notes: newOutfolder.notes, is_active: true })
        });
        if (!r.ok) throw new Error(await readApiError(r));
        const created = await r.json();
        for (const c of newOutfolder.contacts) {
          if (c.value.trim()) await apiFetch(`/customers/outfolders/${created.id}/add_contact/`, {
            method: 'POST', 
            body: JSON.stringify({ contact_type: c.contact_type, value: c.value, label: c.label || '', is_primary: c.is_primary })
          });
        }
        setShowAddOutfolder(false);
        alert('Supervisor added successfully!');
      }
      await loadCustomer();
      setNewOutfolder({ ...DEFAULT_OUTFOLDER });
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to save supervisor'); }
  }

  async function removeOutfolder(outfolderId: string) {
    if (!confirm('Are you sure you want to remove this supervisor?')) return;
    try {
      const r = await apiFetch(`/customers/outfolders/${outfolderId}/`, { method: 'DELETE', });
      if (!r.ok) throw new Error('Failed to delete');
      await loadCustomer();
    } catch { alert('Failed to remove supervisor'); }
  }

  // ─── Contract upload ──────────────────────────────────
  async function handleUploadContract() {
    if (!newContractFile) { alert('Please select a contract document'); return; }
    setUploadingContract(true);
    try {
      const fd = new FormData();
      fd.append('contract_document', newContractFile);
      fd.append('effective_from', newContractEffectiveFrom || new Date().toISOString().split('T')[0]);
      const r = await apiFetch(`/customers/customers/${params.id}/upload_contract/`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await readApiError(r));
      await loadContractHistory();
      setShowContractUploadModal(false); setNewContractFile(null); setNewContractRate(''); setNewContractEffectiveFrom('');
      if (pendingSave) { setPendingSave(false); handleSave(); }
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to upload contract'); setPendingSave(false); }
    finally { setUploadingContract(false); }
  }

  // ─── Save ─────────────────────────────────────────────
  async function handleSave() {
    const currentActive = serviceRates.filter(r => r.is_active).map(r => ({ service_id: r.service_id, price: r.price }));
    const changed = JSON.stringify(currentActive.sort((a, b) => a.service_id - b.service_id)) !==
      JSON.stringify(originalServiceRates.sort((a, b) => a.service_id - b.service_id));
    if (changed && !pendingSave) {
      setPendingSave(true); setNewContractEffectiveFrom(new Date().toISOString().split('T')[0]); setShowContractUploadModal(true); return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('company_name', editForm.company_name); fd.append('city', editForm.city);
      fd.append('postcode', editForm.postcode);
      const combined = [editForm.street_name, editForm.house_number, editForm.house_number_addition].filter(Boolean).join(' ');
      fd.append('address', combined || editForm.address);
      fd.append('street_name', editForm.street_name); fd.append('house_number', editForm.house_number);
      fd.append('house_number_addition', editForm.house_number_addition); fd.append('country', editForm.country || 'Netherlands');
      if (editForm.website) {
        let w = editForm.website.trim().toLowerCase().replace(/^https?:\/\//i, '');
        if (!w.startsWith('www.')) w = 'www.' + w;
        fd.append('website', 'https://' + w);
      }
      fd.append('is_active', String(editForm.is_active));
      if (manager.first_name) fd.append('manager_first_name', manager.first_name);
      if (manager.last_name) fd.append('manager_last_name', manager.last_name);
      if (editForm.iban) fd.append('iban', editForm.iban);
      if (editForm.btw_number) fd.append('btw_number', editForm.btw_number);
      if (editForm.kvk_number) fd.append('kvk_number', editForm.kvk_number);
      if (editForm.g_rekening) fd.append('g_rekening', editForm.g_rekening);
      if (logo) fd.append('logo', logo);

      const r = await apiFetch(`/customers/customers/${params.id}/`, { method: 'PATCH', body: fd });
      if (!r.ok) throw new Error('Failed to save');

      // Billing JSON call
      await apiFetch(`/customers/customers/${params.id}/`, {
        method: 'PATCH', 
        body: JSON.stringify({
          has_surcharges: hasSurcharges,
          surcharges: selectedSurcharges.filter(s => s.is_enabled).map(s => ({ surcharge_type: s.surcharge_type, percentage: s.percentage, is_enabled: true })),
          has_service_surcharges: hasServiceSurcharges,
          service_surcharges: selectedServiceSurcharges.filter(s => s.is_enabled).map(s => ({ surcharge_type: s.surcharge_type, percentage: s.percentage, is_enabled: true })),
          has_allowance_surcharges: hasAllowanceSurcharges,
          allowance_surcharges: selectedAllowanceSurcharges.filter(s => s.is_enabled).map(s => ({ surcharge_type: s.surcharge_type, percentage: s.percentage, is_enabled: true })),
          service_rates: serviceRates.filter(sr => sr.is_active).map(sr => ({ service_id: sr.service_id, price: sr.price, is_active: true })),
          allowances: customerAllowances.filter(a => a.custom_name?.trim() || a.allowance_type).map(a => ({
            id: a.id, allowance_type: a.allowance_type || null, custom_name: a.custom_name, custom_code: a.custom_code || '',
            price: a.price, is_enabled: a.is_enabled, apply_surcharges: a.apply_surcharges
          }))
        })
      });

      // Contacts
      for (const c of newCustomerContacts) {
        if (c.value.trim()) await apiFetch(`/customers/customers/${params.id}/add_contact/`, {
          method: 'POST', 
          body: JSON.stringify({ contact_type: c.contact_type, value: c.value, label: 'company', is_primary: c.is_primary })
        });
      }
      for (const c of newManagerContacts) {
        if (c.value.trim()) await apiFetch(`/customers/customers/${params.id}/add_contact/`, {
          method: 'POST', 
          body: JSON.stringify({ contact_type: c.contact_type, value: c.value, label: 'manager', is_primary: c.is_primary })
        });
      }

      // HR email
      if (hrEmail.trim()) {
        if (existingHrContactId) {
          await apiFetch(`/customers/contacts/${existingHrContactId}/`, { method: 'PATCH',  body: JSON.stringify({ value: hrEmail.trim() }) });
        } else {
          await apiFetch(`/customers/customers/${params.id}/add_contact/`, { method: 'POST',  body: JSON.stringify({ contact_type: 'email', value: hrEmail.trim(), label: 'hr', is_primary: false }) });
        }
      } else if (existingHrContactId) {
        await apiFetch(`/customers/contacts/${existingHrContactId}/`, { method: 'DELETE', });
      }

      setLogo(null);
      await loadCustomer();
      alert('Customer updated successfully!');
    } catch { alert('Failed to save customer'); }
    finally { setSaving(false); }
  }

  // ─── Delete ───────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const r = await apiFetch(`/customers/customers/${params.id}/`, { method: 'DELETE', });
      if (!r.ok) throw new Error('Failed to delete');
      router.push('/dashboard/customers');
    } catch { alert('Failed to delete customer'); setDeleting(false); }
  }

  // ─── Computed ─────────────────────────────────────────
  const existingPhones = customerContacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
  const existingEmails = customerContacts.filter(c => c.contact_type === 'email');
  const newPhones = newCustomerContacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
  const newEmails = newCustomerContacts.filter(c => c.contact_type === 'email');
  const existingManagerPhones = manager.contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
  const existingManagerEmails = manager.contacts.filter(c => c.contact_type === 'email');
  const newManagerPhones = newManagerContacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
  const newManagerEmails = newManagerContacts.filter(c => c.contact_type === 'email');
  const outfolderPhones = newOutfolder.contacts.filter(c => c.contact_type === 'phone' || c.contact_type === 'mobile');
  const outfolderEmails = newOutfolder.contacts.filter(c => c.contact_type === 'email');

  // ─── Styles ───────────────────────────────────────────
  const inputStyle = { width: '100%', padding: '12px 16px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' as const };

  return {
    params, router, customer, loading, saving, deleting,
    showDeleteConfirm, setShowDeleteConfirm,
    editForm, setEditForm, logo, setLogo, logoPreview, setLogoPreview,

    // Contacts
    customerContacts, newCustomerContacts, hrEmail, setHrEmail, existingHrContactId,
    addCustomerContact, removeNewCustomerContact, updateNewCustomerContact,
    manager, setManager, newManagerContacts,
    addManagerContact, removeNewManagerContact, updateNewManagerContact,

    // Outfolders
    outfolders, showAddOutfolder, setShowAddOutfolder,
    editingOutfolderId, newOutfolder, setNewOutfolder,
    addOutfolderContact, removeOutfolderContact, updateOutfolderContact,
    startEditOutfolder, cancelEdit, handleSaveOutfolder, removeOutfolder,

    // Surcharges
    surchargeTypes,
    hasSurcharges, setHasSurcharges, selectedSurcharges, toggleSurcharge, updateSurchargePercentage,
    hasServiceSurcharges, setHasServiceSurcharges, selectedServiceSurcharges, toggleServiceSurcharge, updateServiceSurchargePercentage,
    hasAllowanceSurcharges, setHasAllowanceSurcharges, selectedAllowanceSurcharges, toggleAllowanceSurcharge, updateAllowanceSurchargePercentage,

    // Services
    availableServices, serviceRates, toggleService, updateServicePrice,

    // Allowances
    availableAllowances, customerAllowances, setCustomerAllowances,
    toggleAllowance, updateAllowanceCustomPrice, toggleAllowanceSurcharges, toggleAllowanceSurchargeType,
    addCustomAllowance, updateCustomAllowance, removeCustomAllowance,

    // Contract history
    contractHistory, showContractUploadModal, setShowContractUploadModal,
    newContractFile, setNewContractFile, newContractRate, setNewContractRate,
    newContractEffectiveFrom, setNewContractEffectiveFrom,
    uploadingContract, handleUploadContract, pendingSave,

    // Portal users
    portalUsers, showAddPortalUser, setShowAddPortalUser,
    portalUserForm, setPortalUserForm,
    creatingPortalUser, setCreatingPortalUser,
    portalUserError, setPortalUserError,
    loadPortalUsers, setPortalUsers,

    // Constants
    API_URL,

    // Computed
    existingPhones, existingEmails, newPhones, newEmails,
    existingManagerPhones, existingManagerEmails, newManagerPhones, newManagerEmails,
    outfolderPhones, outfolderEmails,

    // Styles
    inputStyle, labelStyle,

    // Actions
    handleSave, handleDelete
  };
}
