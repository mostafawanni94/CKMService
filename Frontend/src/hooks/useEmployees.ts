/**
 * useEmployees — ViewModel for the employee list page.
 *
 * The page held 29 pieces of state, its fetching and its handlers inline
 * alongside 1,600 lines of markup. The page composes now; this decides.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { api, Employee } from '@/lib/api';
import { apiFetch, apiGetAll, readApiError } from '@/hooks/useApi';
import { useLanguage } from '@/lib/i18n';

interface CreateEmployeeForm {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

interface CreatedEmployee {
    email: string;
    password: string;
    name: string;
}

interface EditEmployeeForm {
    first_name: string;
    last_name: string;
    prefix_name: string;
    gender: string;
    date_of_birth: string;
    birthplace: string;
    bsn: string;
    phone_number: string;
    /** The profile stores the address in three columns, not one line. */
    street_name: string;
    house_number: string;
    house_number_addition: string;
    postcode: string;
    city: string;
    nationality: string;
    iban: string;
    document_type: string;
    document_number: string;
    document_expiry_date: string;
    has_drivers_license: boolean;
    contract_phase: string;
    contract_start_date: string;
    contract_end_date: string;
    hourly_rate: string;
}


export function useEmployees() {
    const { t } = useLanguage();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Extract modal state
    const [showExtractModal, setShowExtractModal] = useState(false);
    const [extractEmployee, setExtractEmployee] = useState<Employee | null>(null);
    const [availableDocuments, setAvailableDocuments] = useState<{ key: string, label: string, available: boolean }[]>([]);
    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    // Server-side paging: the list is filtered and counted by the API.
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployee | null>(null);
    const [createForm, setCreateForm] = useState<CreateEmployeeForm>({
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [editForm, setEditForm] = useState<EditEmployeeForm>({
        first_name: '',
        last_name: '',
        prefix_name: '',
        gender: '',
        date_of_birth: '',
        birthplace: '',
        bsn: '',
        phone_number: '',
        street_name: '',
        house_number: '',
        house_number_addition: '',
        postcode: '',
        city: '',
        nationality: '',
        iban: '',
        document_type: '',
        document_number: '',
        document_expiry_date: '',
        has_drivers_license: false,
        contract_phase: '',
        contract_start_date: '',
        contract_end_date: '',
        hourly_rate: ''
    });

    // Nationality dropdown state
    const [nationalitySearch, setNationalitySearch] = useState('');
    const [nationalityDropdownOpen, setNationalityDropdownOpen] = useState(false);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);

    // Close nationality dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setNationalityDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, search, filter]);

    // A narrower result set must not strand the reader on a page that is gone.
    useEffect(() => { setPage(1); }, [search, filter]);

    async function loadEmployees() {
        setLoading(true);
        setError(null);
        try {
            // One page, filtered by the server. Fetching every profile so the
            // browser could search them does not scale, and made the header
            // count depend on holding the whole table in memory.
            const query = new URLSearchParams();
            if (search.trim()) query.set('search', search.trim());
            if (filter !== 'all') query.set('status', filter);
            query.set('page', String(page));
            query.set('page_size', String(pageSize));

            const [listRes, pending] = await Promise.all([
                apiFetch(`/employees/profiles/?${query}`).then(r =>
                    r.ok ? r.json() : { results: [], count: 0 }),
                api.getPendingEmployees(),
            ]);
            const all = listRes.results ?? [];
            setTotalCount(listRes.count ?? 0);
            setEmployees(all);
            setPendingEmployees(pending || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    }

    function generatePassword() {
        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCreateForm(f => ({ ...f, password }));
    }

    async function handleCreateEmployee(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);

        try {
            const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: createForm.email,
                    password: createForm.password,
                    first_name: createForm.first_name,
                    last_name: createForm.last_name,
                    role: 'employee'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors
                const errorMsg = data.email?.[0] || data.password?.[0] || data.detail || 'Failed to create employee';
                throw new Error(errorMsg);
            }

            // Store created employee info for sharing
            setCreatedEmployee({
                email: createForm.email,
                password: createForm.password,
                name: `${createForm.first_name} ${createForm.last_name}`
            });

            // Close create modal and open share modal
            setShowCreateModal(false);
            setShowShareModal(true);

            // Reset form
            setCreateForm({ email: '', password: '', first_name: '', last_name: '' });

            // Reload employees
            await loadEmployees();

        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create employee');
        } finally {
            setCreating(false);
        }
    }

    function copyCredentials() {
        if (!createdEmployee) return;
        const text = `CKM Services Login\n\nEmail: ${createdEmployee.email}\nWachtwoord: ${createdEmployee.password}\n\nDownload de app en log in om je profiel aan te vullen.`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function shareWhatsApp() {
        if (!createdEmployee) return;
        const text = encodeURIComponent(`CKM Services Login\n\nEmail: ${createdEmployee.email}\nWachtwoord: ${createdEmployee.password}\n\nDownload de app en log in om je profiel aan te vullen.`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    async function handleApprove(id: string) {
        try {
            await api.approveEmployee(id, {
                contract_phase: 'phase_a',
                contract_start_date: new Date().toISOString().split('T')[0],
                contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            await loadEmployees();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to approve');
        }
    }

    async function handleReject(id: string) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            await api.rejectEmployee(id, reason);
            await loadEmployees();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to reject');
        }
    }

    /**
     * The list serializer returns ten fields. Filling the edit form from a list
     * row therefore left BSN, IBAN, address, date of birth, document and rate
     * blank — and the save PATCHes every one of those fields, so opening the
     * modal and pressing Save erased them. The full profile is fetched first.
     */
    async function openEditModal(emp: Employee) {
        setSelectedEmployee(emp);
        setShowViewModal(false);
        setShowEditModal(true);
        setEditLoading(true);
        setEditError(null);
        try {
            const response = await apiFetch(`/employees/profiles/${emp.id}/`);
            if (!response.ok) throw new Error(await readApiError(response));
            const full = await response.json();
            setEditForm({
                first_name: full.first_name || '',
                last_name: full.last_name || '',
                prefix_name: full.prefix_name || '',
                gender: full.gender || '',
                date_of_birth: full.date_of_birth || '',
                birthplace: full.birthplace || '',
                bsn: full.bsn || '',
                phone_number: full.phone_number || '',
                street_name: full.street_name || '',
                house_number: full.house_number || '',
                house_number_addition: full.house_number_addition || '',
                postcode: full.postcode || '',
                city: full.city || '',
                nationality: full.nationality || '',
                iban: full.iban || '',
                document_type: full.document_type_name || '',
                document_number: full.document_number || '',
                document_expiry_date: full.document_expiry_date || '',
                has_drivers_license: full.has_drivers_license || false,
                contract_phase: full.contract_phase || '',
                contract_start_date: full.contract_start_date || '',
                contract_end_date: full.contract_end_date || '',
                hourly_rate: full.hourly_rate?.toString() || '',
            });
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to load employee');
            setShowEditModal(false);
        } finally {
            setEditLoading(false);
        }
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedEmployee) return;
        setSaving(true);
        try {
            const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/profiles/${selectedEmployee.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    prefix_name: editForm.prefix_name,
                    gender: editForm.gender,
                    date_of_birth: editForm.date_of_birth || null,
                    birthplace: editForm.birthplace,
                    bsn: editForm.bsn,
                    phone_number: editForm.phone_number,
                    street_name: editForm.street_name,
                    house_number: editForm.house_number,
                    house_number_addition: editForm.house_number_addition,
                    postcode: editForm.postcode,
                    city: editForm.city,
                    nationality: editForm.nationality,
                    iban: editForm.iban,
                    document_type_name: editForm.document_type,
                    document_number: editForm.document_number,
                    document_expiry_date: editForm.document_expiry_date || null,
                    has_drivers_license: editForm.has_drivers_license,
                    contract_phase: editForm.contract_phase,
                    contract_start_date: editForm.contract_start_date || null,
                    contract_end_date: editForm.contract_end_date || null,
                    hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null
                })
            });

            if (!response.ok) throw new Error(await readApiError(response));

            setShowEditModal(false);
            await loadEmployees();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    function openDeleteModal(emp: Employee) {
        setSelectedEmployee(emp);
        setShowDeleteModal(true);
        setShowViewModal(false);
    }

    async function handleDelete() {
        if (!selectedEmployee) return;
        setDeleting(true);
        try {
            const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/employees/profiles/${selectedEmployee.id}/soft_delete/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(await readApiError(response));

            setShowDeleteModal(false);
            setSelectedEmployee(null);
            await loadEmployees();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    }

    // The server applies search and status, so this page is already the
    // filtered result. Filtering again would hide rows the count still counts.
    const filteredEmployees = employees;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const statusColors: Record<string, string> = {
        approved: 'bg-green-100 text-green-700',
        pending: 'bg-yellow-100 text-yellow-700',
        incomplete: 'bg-gray-100 text-gray-700',
        rejected: 'bg-red-100 text-red-700',
        suspended: 'bg-gray-200 text-gray-600'
    };


    return {
        t, router,
        statusColors, availableDocuments, copied, editLoading, editError,
        page, setPage, pageSize, setPageSize, totalCount, totalPages, copyCredentials, createError, createForm, createdEmployee, creating, deleting, editForm, employees, error, exporting, extractEmployee, filter, filteredEmployees, generatePassword, handleApprove, handleCreateEmployee, handleDelete, handleReject, handleSaveEdit, loadEmployees, loading, loadingDocs, nationalityDropdownOpen, nationalityDropdownRef, nationalitySearch, openDeleteModal, openEditModal, pendingEmployees, saving, search, selectedDocuments, selectedEmployee, setAvailableDocuments, setCreateForm, setEditForm, setExporting, setExtractEmployee, setFilter, setLoadingDocs, setNationalityDropdownOpen, setNationalitySearch, setSearch, setSelectedDocuments, setShowCreateModal, setShowDeleteModal, setShowEditModal, setShowExtractModal, setShowShareModal, setShowViewModal, shareWhatsApp, showCreateModal, showDeleteModal, showEditModal, showExtractModal, showShareModal, showViewModal,
    };
}

export type EmployeesViewModel = ReturnType<typeof useEmployees>;
