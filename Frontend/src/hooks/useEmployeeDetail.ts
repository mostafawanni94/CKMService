/**
 * useEmployeeDetail — ViewModel for the Employee Detail page.
 * 
 * Extracts all state, data fetching, mutations, and business logic.
 * The page component only composes UI from this hook's return values.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, apiGet } from '@/hooks/useApi';
import { extractResults } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────

export interface EmployeeDetail {
  id: string;
  user: { id: string; email: string; first_name: string; last_name: string; role: string; };
  status: string;
  first_name: string;
  last_name: string;
  prefix_name: string;
  full_name: string;
  initials: string;
  gender: string;
  date_of_birth: string;
  birthplace: string;
  nationality: string;
  bsn: string;
  phone_number: string;
  street_address: string;
  street_name: string;
  house_number: string;
  house_number_addition: string;
  postcode: string;
  city: string;
  iban: string;
  hourly_rate: string;
  document_type_name: string;
  document_type_id: number;
  document_number: string;
  document_issue_date: string;
  document_expiry_date: string;
  has_drivers_license: boolean;
  drivers_license_number: string;
  drivers_license_issue_date: string;
  drivers_license_expiry_date: string;
  drivers_license_categories: string[];
  contract_type_id: number | null;
  current_agency_id: number | null;
  contract_phase: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_document_url: string | null;
  rejection_reason: string;
  submitted_at: string;
  approved_at: string;
  created_at: string;
  id_document_front_url: string | null;
  id_document_back_url: string | null;
  id_document_pdf_url: string | null;
  drivers_license_front_url: string | null;
  drivers_license_back_url: string | null;
  has_travel_allowance: boolean;
  travel_cost_per_km: string | null;
  travel_hour_percentage: string | null;
  can_add_allowances: boolean;
  receives_surcharges: boolean;
}

export type TabType = 'overview' | 'documents' | 'contract' | 'certificates';

export interface CertificateType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  is_required: boolean;
  has_expiry: boolean;
  has_diploma_number: boolean;
}

export interface EmployeeCertificate {
  id: number;
  employee: number;
  certificate_type: number;
  certificate_type_name: string;
  certificate_file: string;
  certificate_file_back?: string | null;
  diploma_number: string;
  expiry_date: string | null;
  issue_date: string | null;
  status: string;
  is_expired: boolean;
  days_until_expiry: number | null;
  created_at: string;
}

export interface RateHistory {
  id: number;
  hourly_rate: string;
  effective_from: string;
  effective_to: string | null;
  changed_by_name: string;
  notes: string;
  created_at: string;
}

export interface ContractHistory {
  id: number;
  contract_document_url: string;
  hourly_rate: string;
  effective_from: string;
  effective_to: string | null;
  notes: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface ContractTypeInfo {
  id: number;
  name: string;
  code: string;
  requires_end_date: boolean;
  requires_agency: boolean;
}

export interface AgencyInfo {
  id: number;
  name: string;
  code: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('accessToken') || '';
}

function authHeaders(): Record<string, string> {
  return { 'Authorization': `Bearer ${getToken()}` };
}

function jsonAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

// ─── Hook ───────────────────────────────────────────────────

export function useEmployeeDetail() {
  const params = useParams();
  const router = useRouter();

  // ─── Core state ─────────────────────────────────────
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EmployeeDetail>>({});
  const [noPermission, setNoPermission] = useState(false);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Rate change
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [contractHistory, setContractHistory] = useState<ContractHistory[]>([]);
  const [showRateChangeModal, setShowRateChangeModal] = useState(false);
  const [pendingRateChange, setPendingRateChange] = useState<string | null>(null);
  const [newContractFile, setNewContractFile] = useState<File | null>(null);

  // File upload
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Contract tab
  const [contractTypes, setContractTypes] = useState<ContractTypeInfo[]>([]);
  const [agencies, setAgencies] = useState<AgencyInfo[]>([]);
  const [contractDataLoading, setContractDataLoading] = useState(false);
  const [contractDataLoaded, setContractDataLoaded] = useState(false);
  const [contractDataError, setContractDataError] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ agency_id: '', start_date: '', notes: '' });

  // Certificates tab
  const [employeeCertificates, setEmployeeCertificates] = useState<EmployeeCertificate[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificatesLoaded, setCertificatesLoaded] = useState(false);
  const [showAddCertificateModal, setShowAddCertificateModal] = useState(false);
  const [showViewCertificateModal, setShowViewCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<EmployeeCertificate | null>(null);
  const [certificateForm, setCertificateForm] = useState({ certificate_type_id: '', diploma_number: '', expiry_date: '', issue_date: '' });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateFileBack, setCertificateFileBack] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'pdf' | 'images'>('pdf');
  const [savingCertificate, setSavingCertificate] = useState(false);

  // Nationality dropdown
  const [nationalitySearch, setNationalitySearch] = useState('');
  const [nationalityDropdownOpen, setNationalityDropdownOpen] = useState(false);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  // Postcode lookup
  const [postcodeLookupLoading, setPostcodeLookupLoading] = useState(false);
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<{ street: string; city: string; municipality?: string }[]>([]);
  const [showPostcodeSuggestions, setShowPostcodeSuggestions] = useState(false);
  const postcodeDropdownRef = useRef<HTMLDivElement>(null);

  // ─── Click-outside handlers ─────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setNationalityDropdownOpen(false);
      }
      if (postcodeDropdownRef.current && !postcodeDropdownRef.current.contains(event.target as Node)) {
        setShowPostcodeSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Data loading ───────────────────────────────────

  async function loadEmployee() {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/employees/profiles/${params.id}/`,
        { headers: authHeaders() }
      );
      if (response.status === 403) { setNoPermission(true); return; }
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setEmployee(data);
      setEditForm(data);
      setSelectedCategories(data.drivers_license_categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadRateHistory() {
    try {
      const response = await fetch(`${API_URL}/employees/profiles/${params.id}/rate_history/`, { headers: authHeaders() });
      if (response.ok) setRateHistory(await response.json());
    } catch (e) { console.error('Failed to load rate history', e); }
  }

  async function loadContractHistory() {
    try {
      const response = await fetch(`${API_URL}/employees/profiles/${params.id}/contract_history/`, { headers: authHeaders() });
      if (response.ok) setContractHistory(await response.json());
    } catch (e) { console.error('Failed to load contract history', e); }
  }

  async function loadContractTypesAndAgencies() {
    setContractDataLoading(true);
    setContractDataError(null);
    try {
      const [ctRes, agRes] = await Promise.all([
        fetch(`${API_URL}/employees/contract-types/`, { headers: authHeaders() }),
        fetch(`${API_URL}/employees/agencies/`, { headers: authHeaders() }),
      ]);
      if (!ctRes.ok) throw new Error(`Contract types failed: ${ctRes.status}`);
      if (!agRes.ok) throw new Error(`Agencies failed: ${agRes.status}`);
      const ctData = await ctRes.json();
      const agData = await agRes.json();
      setContractTypes(Array.isArray(ctData) ? ctData : (ctData.results || []));
      setAgencies(Array.isArray(agData) ? agData : (agData.results || []));
      setContractDataLoaded(true);
    } catch (e) {
      console.error('Failed to load contract data:', e);
      setContractDataError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setContractDataLoading(false);
    }
  }

  async function loadCertificates() {
    if (!employee) return;
    setCertificatesLoading(true);
    try {
      const [certsRes, typesRes] = await Promise.all([
        fetch(`${API_URL}/certificates/employee-certificates/?employee=${employee.id}`, { headers: authHeaders() }),
        fetch(`${API_URL}/certificates/types/active/`, { headers: authHeaders() }),
      ]);
      if (certsRes.ok) {
        const certsData = await certsRes.json();
        setEmployeeCertificates(certsData.results || certsData || []);
      }
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setCertificateTypes(typesData.results || typesData || []);
      }
      setCertificatesLoaded(true);
    } catch (err) { console.error('Failed to load certificates:', err); }
    finally { setCertificatesLoading(false); }
  }

  // ─── Effects ────────────────────────────────────────
  useEffect(() => { loadEmployee(); }, [params.id]);
  useEffect(() => {
    if (employee) { loadRateHistory(); loadContractHistory(); }
  }, [employee?.id]);
  useEffect(() => {
    if (activeTab === 'contract' && !contractDataLoaded && !contractDataLoading) loadContractTypesAndAgencies();
  }, [activeTab, contractDataLoaded, contractDataLoading]);
  useEffect(() => {
    if (activeTab === 'certificates' && !certificatesLoaded && !certificatesLoading && employee) loadCertificates();
  }, [activeTab, certificatesLoaded, certificatesLoading, employee]);

  // ─── Postcode lookup ────────────────────────────────
  const lookupPostcode = async (postcode: string) => {
    const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
    const postcodeRegex = /^[1-9][0-9]{3}[A-Z]{2}$/;
    if (!postcodeRegex.test(cleanPostcode)) {
      setPostcodeSuggestions([]);
      setShowPostcodeSuggestions(false);
      return;
    }
    setPostcodeLookupLoading(true);
    try {
      const formattedPostcode = cleanPostcode.slice(0, 4) + ' ' + cleanPostcode.slice(4);
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=postcode:${formattedPostcode}&fq=type:adres&rows=50`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.response?.docs?.length > 0) {
          const streetMap = new Map<string, { street: string; city: string; municipality: string }>();
          data.response.docs.forEach((doc: { straatnaam?: string; woonplaatsnaam?: string; gemeentenaam?: string }) => {
            const street = doc.straatnaam || '';
            const city = doc.woonplaatsnaam || doc.gemeentenaam || '';
            if (street && city && !streetMap.has(street)) {
              streetMap.set(street, { street, city, municipality: doc.gemeentenaam || '' });
            }
          });
          const suggestions = Array.from(streetMap.values());
          if (suggestions.length > 0) {
            setPostcodeSuggestions(suggestions);
            setShowPostcodeSuggestions(true);
            return;
          }
        }
      }
      // Fallback - postcode range city lookup
      const postcodeFirstTwo = parseInt(cleanPostcode.slice(0, 2));
      const CITY_MAP: Record<number, string> = {
        10: 'Amsterdam', 11: 'Amsterdam', 12: 'Haarlem', 13: 'Amstelveen',
        14: 'Hoofddorp', 15: 'Purmerend', 16: 'Zaandam', 17: 'Heerhugowaard',
        18: 'Alkmaar', 19: 'Den Helder', 20: 'Den Haag', 23: 'Den Haag',
        24: 'Leiden', 25: 'Leiden', 30: 'Rotterdam', 31: 'Rotterdam',
        32: 'Dordrecht', 35: 'Hilversum', 36: 'Almere', 37: 'Amersfoort',
        38: 'Amersfoort', 50: 'Eindhoven', 51: 'Eindhoven', 52: 'Tilburg',
        53: 'Tilburg', 54: 'Breda', 60: 'Maastricht', 61: 'Maastricht',
        62: 'Maastricht', 63: 'Heerlen', 70: 'Enschede', 80: 'Zwolle',
        81: 'Zwolle', 82: 'Lelystad', 90: 'Groningen', 91: 'Groningen',
        95: 'Leeuwarden', 96: 'Leeuwarden',
      };
      const city = CITY_MAP[postcodeFirstTwo];
      if (city) {
        setPostcodeSuggestions([{ street: '', city, municipality: city }]);
        setShowPostcodeSuggestions(true);
      }
    } catch (error) {
      console.error('Postcode lookup error:', error);
    } finally {
      setPostcodeLookupLoading(false);
    }
  };

  // ─── Mutation actions ───────────────────────────────

  async function handleSaveEdit() {
    if (!employee) return;
    const oldRate = employee.hourly_rate ? parseFloat(employee.hourly_rate) : null;
    const newRate = editForm.hourly_rate ? parseFloat(editForm.hourly_rate as string) : null;
    if (oldRate !== newRate && newRate !== null) {
      setPendingRateChange(editForm.hourly_rate as string);
      setShowRateChangeModal(true);
      return;
    }
    await performSave();
  }

  async function performSave(withContract = false, contractFile: File | null = null) {
    if (!employee) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/employees/profiles/${employee.id}/`,
        {
          method: 'PATCH',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({
            first_name: editForm.first_name, last_name: editForm.last_name, prefix_name: editForm.prefix_name,
            gender: editForm.gender, date_of_birth: editForm.date_of_birth, birthplace: editForm.birthplace,
            nationality: editForm.nationality, bsn: editForm.bsn, phone_number: editForm.phone_number,
            street_address: editForm.street_address, street_name: editForm.street_name,
            house_number: editForm.house_number, house_number_addition: editForm.house_number_addition,
            postcode: editForm.postcode, city: editForm.city,
            iban: editForm.iban, hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate as string) : null,
            has_travel_allowance: !!(editForm.travel_cost_per_km || editForm.travel_hour_percentage),
            travel_cost_per_km: editForm.travel_cost_per_km ? parseFloat(editForm.travel_cost_per_km as string) : null,
            travel_hour_percentage: editForm.travel_hour_percentage ? parseFloat(editForm.travel_hour_percentage as string) : null,
            can_add_allowances: editForm.can_add_allowances,
            receives_surcharges: editForm.receives_surcharges,
            document_type_id: editForm.document_type_id, document_number: editForm.document_number,
            document_issue_date: editForm.document_issue_date, document_expiry_date: editForm.document_expiry_date,
            has_drivers_license: editForm.has_drivers_license, drivers_license_number: editForm.drivers_license_number,
            drivers_license_issue_date: editForm.drivers_license_issue_date, drivers_license_expiry_date: editForm.drivers_license_expiry_date,
            drivers_license_categories: selectedCategories,
            contract_type_id: editForm.contract_type_id, current_agency_id: editForm.current_agency_id,
            contract_type: editForm.contract_type_id, current_agency: editForm.current_agency_id,
            contract_phase: editForm.contract_phase, contract_start_date: editForm.contract_start_date, contract_end_date: editForm.contract_end_date,
            user_email: editForm.user?.email,
          }),
        }
      );
      if (!response.ok) { const d = await response.json(); throw new Error(d.detail || 'Failed'); }
      if (withContract && contractFile && pendingRateChange) {
        const formData = new FormData();
        formData.append('contract_document', contractFile);
        formData.append('hourly_rate', pendingRateChange);
        formData.append('effective_from', new Date().toISOString().split('T')[0]);
        formData.append('notes', 'Contract uploaded with rate change');
        const contractResponse = await fetch(
          `${API_URL}/employees/profiles/${employee.id}/upload_contract/`,
          { method: 'POST', headers: authHeaders(), body: formData }
        );
        if (!contractResponse.ok) {
          const d = await contractResponse.json();
          alert('Rate saved but contract upload failed: ' + (d.error || d.detail || 'Unknown error'));
        }
      }
      setIsEditing(false);
      setShowRateChangeModal(false);
      setPendingRateChange(null);
      setNewContractFile(null);
      await loadEmployee();
      await loadContractHistory();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  }

  function handleRateChangeModalResponse(uploadContract: boolean) {
    if (!uploadContract) performSave(false, null);
  }

  async function handleContractFileSelected(file: File) {
    await performSave(true, file);
  }

  async function handleApprove() {
    if (!employee) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/employees/profiles/${employee.id}/approve/`,
        { method: 'POST', headers: jsonAuthHeaders() });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || d.detail || 'Failed'); }
      setShowApproveModal(false);
      await loadEmployee();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleReject() {
    if (!employee || !rejectReason.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/employees/profiles/${employee.id}/reject/`,
        { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify({ reason: rejectReason }) });
      if (!response.ok) { const d = await response.json(); throw new Error(d.detail || 'Failed'); }
      setShowRejectModal(false);
      setRejectReason('');
      await loadEmployee();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setSaving(false); }
  }

  function cancelEdit() {
    setEditForm(employee || {});
    setSelectedCategories(employee?.drivers_license_categories || []);
    setIsEditing(false);
  }

  async function handleFileUpload(fieldName: string, file: File) {
    if (!employee) return;
    setUploadingFile(fieldName);
    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const response = await fetch(
        `${API_URL}/employees/profiles/${employee.id}/`,
        { method: 'PATCH', headers: authHeaders(), body: formData }
      );
      if (!response.ok) throw new Error('Upload failed');
      const updatedEmployee = await response.json();
      setEmployee(updatedEmployee);
      const urlField = `${fieldName}_url`;
      if (urlField in updatedEmployee) {
        setEditForm(prev => ({ ...prev, [urlField]: updatedEmployee[urlField] }));
      }
    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploadingFile(null); }
  }

  async function handleDeleteFile(fieldName: string) {
    if (!employee || !confirm('Delete this file?')) return;
    try {
      const response = await fetch(
        `${API_URL}/employees/profiles/${employee.id}/`,
        { method: 'PATCH', headers: jsonAuthHeaders(), body: JSON.stringify({ [fieldName]: null }) }
      );
      if (!response.ok) throw new Error('Failed');
      await loadEmployee();
    } catch (err) { alert('Delete failed'); }
  }

  async function handleAddCertificate(e: React.FormEvent) {
    e.preventDefault();
    if (!employee || !certificateForm.certificate_type_id) return;
    if (uploadMode === 'pdf' && !certificateFile) { alert('Please upload a certificate PDF file'); return; }
    if (uploadMode === 'images' && (!certificateFile || !certificateFileBack)) { alert('Please upload both Front and Back images'); return; }

    setSavingCertificate(true);
    try {
      const formData = new FormData();
      formData.append('employee', employee.id);
      formData.append('certificate_type', certificateForm.certificate_type_id);
      if (certificateFile) formData.append('certificate_file', certificateFile);
      if (uploadMode === 'images' && certificateFileBack) formData.append('certificate_file_back', certificateFileBack);
      if (certificateForm.diploma_number) formData.append('diploma_number', certificateForm.diploma_number);
      if (certificateForm.expiry_date) formData.append('expiry_date', certificateForm.expiry_date);
      if (certificateForm.issue_date) formData.append('issue_date', certificateForm.issue_date);

      const response = await fetch(`${API_URL}/certificates/employee-certificates/`,
        { method: 'POST', headers: authHeaders(), body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.certificate_type?.[0] || 'Failed to add certificate');
      }
      setShowAddCertificateModal(false);
      setCertificateForm({ certificate_type_id: '', diploma_number: '', expiry_date: '', issue_date: '' });
      setCertificateFile(null);
      setCertificateFileBack(null);
      setUploadMode('pdf');
      setCertificatesLoaded(false);
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to add certificate'); }
    finally { setSavingCertificate(false); }
  }

  async function handleDeleteCertificate(certId: number) {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    try {
      const response = await fetch(`${API_URL}/certificates/employee-certificates/${certId}/`,
        { method: 'DELETE', headers: authHeaders() });
      if (!response.ok && response.status !== 204) throw new Error('Failed to delete');
      setCertificatesLoaded(false);
    } catch (err) { alert('Failed to delete certificate'); }
  }

  function toggleCategory(cat: string) {
    setSelectedCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);
  }

  const updateEditForm = (updates: Partial<EmployeeDetail>) => setEditForm(prev => ({ ...prev, ...updates }));

  return {
    // Core
    params, router, employee, setEmployee, loading, error, noPermission,
    activeTab, setActiveTab,
    isEditing, setIsEditing, saving,
    editForm, setEditForm, updateEditForm,

    // Approval
    showApproveModal, setShowApproveModal,
    showRejectModal, setShowRejectModal,
    rejectReason, setRejectReason,
    handleApprove, handleReject,

    // Rate change
    rateHistory, contractHistory,
    showRateChangeModal, setShowRateChangeModal,
    pendingRateChange, setPendingRateChange,
    newContractFile, setNewContractFile,
    handleRateChangeModalResponse, handleContractFileSelected,

    // Edit
    handleSaveEdit, performSave, cancelEdit,
    selectedCategories, toggleCategory,

    // File upload
    uploadingFile, handleFileUpload, handleDeleteFile,

    // Contract tab
    contractTypes, agencies,
    contractDataLoading, contractDataLoaded, contractDataError, loadContractTypesAndAgencies,
    showTransferModal, setShowTransferModal,
    transferData, setTransferData,

    // Certificates tab
    employeeCertificates, certificateTypes,
    certificatesLoading, certificatesLoaded,
    showAddCertificateModal, setShowAddCertificateModal,
    showViewCertificateModal, setShowViewCertificateModal,
    selectedCertificate, setSelectedCertificate,
    certificateForm, setCertificateForm,
    certificateFile, setCertificateFile,
    certificateFileBack, setCertificateFileBack,
    uploadMode, setUploadMode,
    savingCertificate,
    handleAddCertificate, handleDeleteCertificate,

    // Nationality dropdown
    nationalitySearch, setNationalitySearch,
    nationalityDropdownOpen, setNationalityDropdownOpen,
    nationalityDropdownRef,

    // Postcode
    postcodeLookupLoading, postcodeSuggestions,
    showPostcodeSuggestions, setShowPostcodeSuggestions,
    postcodeDropdownRef, lookupPostcode,
  };
}
