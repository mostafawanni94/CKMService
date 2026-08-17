'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Receipt, Plus, Search, Filter, Upload, Download,
    Trash2, Edit3, Eye, X, Calendar, CreditCard,
    Building, Monitor, Shield, Car, Package, Phone,
    Calculator, Wrench, Plane, Megaphone, GraduationCap,
    MoreHorizontal, CheckCircle, Clock, AlertCircle,
    FileText, Euro, ChevronDown
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';

interface ExpenseCategory {
    id: number;
    name: string;
    name_nl: string;
    code: string;
    icon: string;
    color: string;
    category_type: string;
}

interface Expense {
    id: string;
    category: number;
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
    is_recurring: boolean;
    recurring_frequency: string;
    status: string;
    status_display: string;
    has_receipt: boolean;
    created_at: string;
}

const ICON_MAP: { [key: string]: React.ElementType } = {
    'building': Building, 'monitor': Monitor, 'shield': Shield,
    'car': Car, 'package': Package, 'phone': Phone,
    'calculator': Calculator, 'wrench': Wrench, 'plane': Plane,
    'megaphone': Megaphone, 'graduation-cap': GraduationCap,
    'credit-card': CreditCard, 'more-horizontal': MoreHorizontal,
    'receipt': Receipt,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function ExpensesPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [saving, setSaving] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Form state
    const [form, setForm] = useState({
        category: '',
        description: '',
        vendor_name: '',
        amount_excl_vat: '',
        vat_rate: '21.00',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        is_paid: true,
        paid_date: '',
        reference_number: '',
        is_recurring: false,
        recurring_frequency: '',
        notes: '',
    });

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/expenses/categories/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load categories', err); }
    }, []);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/expenses/expenses/?year=${yearFilter}`;
            if (categoryFilter) url += `&category=${categoryFilter}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) { console.error('Failed to load expenses', err); }
        finally { setLoading(false); }
    }, [yearFilter, categoryFilter, searchQuery]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const openCreateModal = () => {
        setEditingExpense(null);
        setForm({
            category: categories.length > 0 ? String(categories[0].id) : '',
            description: '', vendor_name: '', amount_excl_vat: '',
            vat_rate: '21.00', expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'bank_transfer', is_paid: true, paid_date: '',
            reference_number: '', is_recurring: false, recurring_frequency: '', notes: '',
        });
        setReceiptFile(null);
        setShowModal(true);
    };

    const openEditModal = (expense: Expense) => {
        setEditingExpense(expense);
        setForm({
            category: String(expense.category),
            description: expense.description,
            vendor_name: expense.vendor_name,
            amount_excl_vat: expense.amount_excl_vat,
            vat_rate: expense.vat_rate,
            expense_date: expense.expense_date,
            payment_method: expense.payment_method,
            is_paid: expense.is_paid,
            paid_date: expense.paid_date || '',
            reference_number: expense.reference_number,
            is_recurring: expense.is_recurring,
            recurring_frequency: expense.recurring_frequency,
            notes: '',
        });
        setReceiptFile(null);
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value !== '' && value !== null && value !== undefined) {
                    formData.append(key, String(value));
                }
            });
            if (receiptFile) {
                formData.append('receipt_file', receiptFile);
            }

            const url = editingExpense
                ? `${API_URL}/expenses/expenses/${editingExpense.id}/`
                : `${API_URL}/expenses/expenses/`;
            const method = editingExpense ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                body: formData,
            });

            if (res.ok) {
                setShowModal(false);
                fetchExpenses();
            } else {
                const err = await res.json();
                alert(`Error: ${JSON.stringify(err)}`);
            }
        } catch (err) { alert('Failed to save expense'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        try {
            await fetch(`${API_URL}/expenses/expenses/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            fetchExpenses();
        } catch (err) { console.error('Delete failed', err); }
    };

    const handleExport = async () => {
        try {
            const res = await fetch(`${API_URL}/expenses/expenses/export/?year=${yearFilter}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Aangifte_${yearFilter}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Export failed');
            }
        } catch (err) { alert('Export failed'); }
    };

    // Calculate totals
    const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.total_amount || '0'), 0);
    const totalVAT = expenses.reduce((s, e) => s + parseFloat(e.vat_amount || '0'), 0);
    const vatPreview = (parseFloat(form.amount_excl_vat || '0') * parseFloat(form.vat_rate || '0') / 100);
    const totalPreview = parseFloat(form.amount_excl_vat || '0') + vatPreview;

    const cardStyle: React.CSSProperties = {
        background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
        borderRadius: '8px', fontSize: '14px', color: '#1E293B', outline: 'none',
        background: '#FFFFFF',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px',
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Expenses</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Track business expenses for Aangifte</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleExport}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                            <Download size={16} /> Export Excel
                        </button>
                        <button onClick={openCreateModal}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            <Plus size={16} /> Add Expense
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total Expenses', value: `€${totalAmount.toFixed(2)}`, icon: Receipt, color: '#EF4444' },
                        { label: 'Total BTW', value: `€${totalVAT.toFixed(2)}`, icon: Euro, color: '#F59E0B' },
                        { label: 'Records', value: expenses.length, icon: FileText, color: '#3B82F6' },
                        { label: 'Categories', value: categories.length, icon: Filter, color: '#8B5CF6' },
                    ].map((stat, idx) => (
                        <div key={idx} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <stat.icon size={20} color={stat.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>{stat.value}</div>
                                <div style={{ fontSize: '12px', color: '#64748B' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search + Filters */}
                <div style={{ ...cardStyle, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input style={{ ...inputStyle, paddingLeft: '36px' }}
                                placeholder="Search vendor, description..."
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <select style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}
                            value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <select style={{ ...inputStyle, width: 'auto', minWidth: '100px' }}
                            value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Expense Table */}
                <div style={cardStyle}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Loading...</div>
                    ) : expenses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                            <Receipt size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ fontSize: '16px', fontWeight: 600 }}>No expenses found</p>
                            <p style={{ fontSize: '13px' }}>Add your first expense to start tracking.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                                    {['Date', 'Vendor', 'Category', 'Description', 'Excl. BTW', 'BTW', 'Total', 'Method', ''].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => {
                                    const CatIcon = ICON_MAP[categories.find(c => c.id === exp.category)?.icon || 'receipt'] || Receipt;
                                    return (
                                        <tr key={exp.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' }}>{exp.expense_date}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.vendor_name}</td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: `${exp.category_color}15`, color: exp.category_color }}>
                                                    <CatIcon size={12} /> {exp.category_code}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 600 }}>€{parseFloat(exp.amount_excl_vat).toFixed(2)}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#64748B' }}>€{parseFloat(exp.vat_amount).toFixed(2)}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>€{parseFloat(exp.total_amount).toFixed(2)}</td>
                                            <td style={{ padding: '14px 12px', fontSize: '12px', color: '#64748B' }}>{exp.payment_method_display}</td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => openEditModal(exp)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><Edit3 size={14} /></button>
                                                    <button onClick={() => handleDelete(exp.id)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ═══ CREATE/EDIT MODAL ═══ */}
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '600px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gap: '16px' }}>
                                {/* Row 1: Category + Date */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Category *</label>
                                        <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            <option value="">Select...</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Date *</label>
                                        <input type="date" style={inputStyle} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                                    </div>
                                </div>

                                {/* Row 2: Vendor + Reference */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Vendor / Supplier *</label>
                                        <input style={inputStyle} value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g., KPN, Ziggo" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Reference #</label>
                                        <input style={inputStyle} value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="INV-001" />
                                    </div>
                                </div>

                                {/* Row 3: Description */}
                                <div>
                                    <label style={labelStyle}>Description *</label>
                                    <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
                                </div>

                                {/* Row 4: Amount + VAT */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Amount (excl. BTW) *</label>
                                        <input type="number" step="0.01" style={inputStyle} value={form.amount_excl_vat} onChange={e => setForm({ ...form, amount_excl_vat: e.target.value })} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>BTW Rate</label>
                                        <select style={inputStyle} value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })}>
                                            <option value="21.00">21% (Standaard)</option>
                                            <option value="9.00">9% (Laag)</option>
                                            <option value="0.00">0% (Vrijgesteld)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Total incl. BTW</label>
                                        <div style={{ ...inputStyle, background: '#F8FAFC', fontWeight: 700, color: '#0F172A' }}>
                                            €{totalPreview.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 5: Payment */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelStyle}>Payment Method</label>
                                        <select style={inputStyle} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="pin">Pin / Debit</option>
                                            <option value="cash">Cash</option>
                                            <option value="credit_card">Credit Card</option>
                                            <option value="direct_debit">Automatische Incasso</option>
                                            <option value="ideal">iDEAL</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Paid Date</label>
                                        <input type="date" style={inputStyle} value={form.paid_date} onChange={e => setForm({ ...form, paid_date: e.target.value })} />
                                    </div>
                                </div>

                                {/* Row 6: Receipt Upload */}
                                <div>
                                    <label style={labelStyle}>Receipt / Bill</label>
                                    <div style={{ border: '2px dashed #E2E8F0', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA' }}
                                        onClick={() => document.getElementById('receipt-upload')?.click()}>
                                        <Upload size={24} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                                        <p style={{ fontSize: '13px', color: '#64748B' }}>{receiptFile ? receiptFile.name : 'Click to upload receipt (photo or PDF)'}</p>
                                        <input id="receipt-upload" type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                                            onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                {/* Row 7: Recurring */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.is_recurring}
                                            onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
                                        <span style={{ fontSize: '14px' }}>Recurring expense</span>
                                    </label>
                                    {form.is_recurring && (
                                        <select style={{ ...inputStyle, width: 'auto' }} value={form.recurring_frequency}
                                            onChange={e => setForm({ ...form, recurring_frequency: e.target.value })}>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                                <button onClick={() => setShowModal(false)}
                                    style={{ padding: '10px 20px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                                <button onClick={handleSave} disabled={saving || !form.category || !form.vendor_name || !form.amount_excl_vat}
                                    style={{ padding: '10px 24px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Saving...' : editingExpense ? 'Update' : 'Save Expense'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
