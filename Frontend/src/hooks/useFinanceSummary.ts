/**
 * useFinanceSummary — ViewModel for the Financial Overview page.
 * Handles year/quarter filtering, data fetching, and export.
 */
import { useState, useCallback, useEffect } from 'react';
import { apiGet, apiDownload } from '@/hooks/useApi';
import type { FinancialSummary } from '@/lib/types';

export function useFinanceSummary() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/expenses/expenses/summary/?year=${year}`;
      if (quarter) url += `&quarter=${quarter}`;
      const data = await apiGet<FinancialSummary>(url);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load financial summary', err);
    } finally {
      setLoading(false);
    }
  }, [year, quarter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleExport = useCallback(async () => {
    let url = `/expenses/expenses/export/?year=${year}`;
    if (quarter) url += `&quarter=${quarter}`;
    const filename = `Aangifte_${quarter ? `Q${quarter}_` : ''}${year}.xlsx`;
    await apiDownload(url, filename);
  }, [year, quarter]);

  // Parsed numbers for display
  const income = parseFloat(summary?.total_income || '0');
  const expenses = parseFloat(summary?.total_expenses || '0');
  const netProfit = parseFloat(summary?.net_profit || '0');
  const vatCollected = parseFloat(summary?.total_vat_collected || '0');
  const vatPaid = parseFloat(summary?.total_vat_paid || '0');
  const vatDue = parseFloat(summary?.vat_due || '0');
  const incomeExclVat = parseFloat(summary?.total_income_excl_vat || '0');
  const expensesExclVat = parseFloat(summary?.total_expenses_excl_vat || '0');

  return {
    // State
    summary, loading, year, quarter,
    // Parsed values
    income, expenses, netProfit, vatCollected, vatPaid, vatDue,
    incomeExclVat, expensesExclVat,
    // Actions
    setYear, setQuarter, handleExport, refetch: fetchSummary
  };
}
