/**
 * useAgencyDetail — ViewModel for the Agency detail/create page.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiMutate, apiFetch } from '@/hooks/useApi';
import { extractResults } from '@/lib/types';
import type { Agency, AgencySurcharge, AgencyEmployee, AgencyInvoice, SurchargeType } from '@/lib/types';

type TabKey = 'overview' | 'employees' | 'billing' | 'surcharges';

const DEFAULT_AGENCY: Agency = {
  name: '', code: '', description: '', is_active: true,
  base_hourly_rate: 20.00, has_surcharges: false, surcharges: [],
  contact_name: '', contact_email: '', contact_phone: '',
  kvk_number: '', btw_number: '', iban: '',
  street_name: '', house_number: '', house_number_addition: '',
  postcode: '', city: '', country: 'Netherlands',
};

export interface SurchargeState {
  [typeId: number]: { enabled: boolean; percentage: number };
}

export function useAgencyDetail() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';

  // Core state
  const [formData, setFormData] = useState<Agency>(DEFAULT_AGENCY);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Related data
  const [surchargeTypes, setSurchargeTypes] = useState<SurchargeType[]>([]);
  const [selectedSurcharges, setSelectedSurcharges] = useState<SurchargeState>({});
  const [employees, setEmployees] = useState<AgencyEmployee[]>([]);
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Generate invoice modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePeriodStart, setGeneratePeriodStart] = useState('');
  const [generatePeriodEnd, setGeneratePeriodEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  // ─── Fetch functions ────────────────────────────────
  const fetchSurchargeTypes = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/employees/surcharge-types/');
      setSurchargeTypes(extractResults<SurchargeType>(data));
    } catch (err) { console.error('Failed to load surcharge types', err); }
  }, []);

  const fetchAgency = useCallback(async () => {
    if (isNew) return;
    try {
      setLoading(true);
      const data = await apiGet<Agency>(`/employees/agencies/${params.id}/`);
      setFormData(data);
      const surchargeMap: SurchargeState = {};
      (data.surcharges || []).forEach((s: AgencySurcharge) => {
        surchargeMap[s.surcharge_type_id] = { enabled: s.is_enabled, percentage: s.percentage };
      });
      setSelectedSurcharges(surchargeMap);
    } catch (err) { console.error('Failed to load agency', err); }
    finally { setLoading(false); }
  }, [isNew, params.id]);

  const fetchEmployees = useCallback(async () => {
    if (isNew || !params.id) return;
    try {
      setLoadingEmployees(true);
      const data = await apiGet<unknown>(`/employees/agencies/${params.id}/employees/`);
      setEmployees(extractResults<AgencyEmployee>(data));
    } catch (err) { console.error('Failed to load employees', err); }
    finally { setLoadingEmployees(false); }
  }, [isNew, params.id]);

  const fetchInvoices = useCallback(async () => {
    if (isNew || !params.id) return;
    try {
      setLoadingInvoices(true);
      const data = await apiGet<unknown>(`/invoices/agency-invoices/?agency=${params.id}`);
      setInvoices(extractResults<AgencyInvoice>(data));
    } catch (err) { console.error('Failed to load invoices', err); }
    finally { setLoadingInvoices(false); }
  }, [isNew, params.id]);

  // ─── Effects ────────────────────────────────────────
  useEffect(() => { fetchSurchargeTypes(); fetchAgency(); }, [fetchSurchargeTypes, fetchAgency]);
  useEffect(() => {
    if (activeTab === 'employees' && employees.length === 0) fetchEmployees();
    if (activeTab === 'billing' && invoices.length === 0) fetchInvoices();
  }, [activeTab]);

  // ─── Actions ────────────────────────────────────────
  const updateForm = (updates: Partial<Agency>) => setFormData(prev => ({ ...prev, ...updates }));

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
      const url = isNew ? '/employees/agencies/' : `/employees/agencies/${params.id}/`;
      const method = isNew ? 'POST' : 'PUT';
      const data = await apiMutate<Agency>(url, method, payload as unknown as Record<string, unknown>);

      if (isNew) {
        router.push(`/dashboard/agencies/${data.id}`);
      } else {
        setFormData(data);
      }
      alert('Agency saved successfully!');
    } catch (err) {
      alert(`Error: ${JSON.stringify(err)}`);
    } finally { setSaving(false); }
  };

  const handleGenerateInvoice = async () => {
    if (!generatePeriodStart || !generatePeriodEnd) return;
    setGenerating(true);
    try {
      const data = await apiMutate('/invoices/agency-invoices/generate/', 'POST', {
        agency_id: parseInt(params.id as string),
        period_start: generatePeriodStart,
        period_end: generatePeriodEnd,
      });
      alert('Invoice generated successfully!');
      setShowGenerateModal(false);
      fetchInvoices();
    } catch (err: unknown) {
      const errObj = err as Record<string, string>;
      alert(`Error: ${errObj?.error || JSON.stringify(err)}`);
    } finally { setGenerating(false); }
  };

  const goBack = () => router.push('/dashboard/agencies');

  return {
    // Core
    isNew, formData, updateForm, activeTab, setActiveTab,
    loading, saving, handleSave, goBack,
    // Surcharges
    surchargeTypes, selectedSurcharges, setSelectedSurcharges,
    // Employees
    employees, loadingEmployees,
    // Invoices
    invoices, loadingInvoices,
    // Generate modal
    showGenerateModal, setShowGenerateModal,
    generatePeriodStart, setGeneratePeriodStart,
    generatePeriodEnd, setGeneratePeriodEnd,
    generating, handleGenerateInvoice,
    // Router
    params,
  };
}
