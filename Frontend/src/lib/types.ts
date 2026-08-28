/**
 * Shared TypeScript interfaces used across multiple pages.
 * Feature-specific types stay in their own hook files.
 */

// ─── Pagination ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Extract results from paginated or flat response. */
export function extractResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as PaginatedResponse<T>).results;
  }
  return [];
}

/** Extract total count from paginated response. */
export function extractCount(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object' && 'count' in data) {
    return (data as PaginatedResponse<unknown>).count;
  }
  return 0;
}

// ─── Common Entities ────────────────────────────────────────

export interface Agency {
  id?: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  base_hourly_rate: number | string;
  has_surcharges: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  kvk_number: string;
  btw_number: string;
  iban: string;
  street_name: string;
  house_number: string;
  house_number_addition: string;
  postcode: string;
  city: string;
  country: string;
  full_address?: string;
  employee_count?: number;
  surcharges?: AgencySurcharge[];
}

export interface AgencySurcharge {
  id?: number;
  surcharge_type_id: number;
  percentage: number;
  is_enabled: boolean;
}

export interface AgencyEmployee {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  status: string;
  phone_number: string;
  hourly_rate: number | null;
  user_email: string;
}

export interface AgencyInvoice {
  id: string;
  invoice_number: string;
  agency: number;
  agency_name: string;
  agency_code: string;
  period_start: string;
  period_end: string;
  total_hours: string;
  subtotal: string;
  total_surcharges: string;
  vat_amount: string;
  total: string;
  status: string;
  status_display: string;
  amount_paid: string;
  amount_due: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  line_count: number;
  created_at: string;
}

export interface SurchargeType {
  id: number;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
}

// ─── Expense Types ──────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string;
}

export interface Expense {
  id: string;
  category: string;
  category_name: string;
  category_code: string;
  category_color: string;
  description: string;
  vendor_name: string;
  amount_excl_vat: string;
  vat_rate: string;
  vat_amount: string;
  total_amount: string;
  expense_date: string;
  payment_method: string;
  payment_method_display: string;
  is_paid: boolean;
  paid_date: string | null;
  reference_number: string;
  receipt_file: string | null;
  is_recurring: boolean;
  recurring_frequency: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface IncomeRecord {
  id: string;
  source: string;
  source_display: string;
  description: string;
  payer_name: string;
  amount_excl_vat: string;
  vat_amount: string;
  total_amount: string;
  received_date: string;
  invoice_number: string | null;
}

export interface FinancialSummary {
  year: number;
  period_start: string;
  period_end: string;
  total_income: string;
  total_expenses: string;
  net_profit: string;
  total_income_excl_vat: string;
  total_expenses_excl_vat: string;
  total_vat_collected: string;
  total_vat_paid: string;
  vat_due: string;
  expenses_by_category: { category: string; code: string; color: string; total: string }[];
  monthly_breakdown: { month: string; expenses: number; expenses_vat: number; income: number; income_vat: number }[];
}

// ─── Payment Methods ────────────────────────────────────────

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'pin', label: 'PIN / Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'ideal', label: 'iDEAL' },
  { value: 'cash', label: 'Cash' },
  { value: 'direct_debit', label: 'Automatische Incasso' },
  { value: 'other', label: 'Other' },
] as const;

export const VAT_RATES = [
  { value: '0.00', label: '0% (Vrijgesteld)' },
  { value: '9.00', label: '9% (Laag tarief)' },
  { value: '21.00', label: '21% (Standaard)' },
] as const;
