/**
 * useAgencyInvoices — ViewModel for the Agency Invoices listing page.
 */
import { useState, useCallback, useEffect } from 'react';
import { apiGet } from '@/hooks/useApi';
import { extractResults, extractCount } from '@/lib/types';
import type { AgencyInvoice } from '@/lib/types';

export function useAgencyInvoices() {
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/invoices/agency-invoices/?page=${page}&page_size=${pageSize}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const data = await apiGet<unknown>(url);
      setInvoices(extractResults<AgencyInvoice>(data));
      setTotalCount(extractCount(data));
    } catch (err) { console.error('Failed to load agency invoices', err); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Client-side search filter
  const filtered = invoices.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(q)
      || inv.agency_name?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    invoices: filtered, loading,
    page, setPage, totalPages,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    refetch: fetchInvoices,
  };
}
