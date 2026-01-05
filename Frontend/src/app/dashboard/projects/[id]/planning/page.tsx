'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard';
import { ArrowLeft, Plus, X, Check, Clock, Trash2, Palette } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ShiftTemplate {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    color: string;
    planned_days_count: number;
}

interface PlannedDay {
    id: string;
    date: string;
    shift_template: string;
    shift_name?: string;
    shift_color: string;
    shift_start_time?: string;
    shift_end_time?: string;
    required_workers: number;
    assignments?: Array<{
        id: string;
        employee: string;
        employee_name: string;
    }>;
}

interface Employee {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    full_name?: string;  // Some endpoints compute this
}

// Helper to get display name
function getEmployeeName(emp: Employee): string {
    if (emp.full_name) return emp.full_name;
    if (emp.first_name || emp.last_name) return `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return emp.email || 'Unknown';
}

interface Project {
    id: string;
    name: string;
    customer_name: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function PlanningPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [showNewTemplate, setShowNewTemplate] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', start_time: '09:00', end_time: '17:00', color: '#10B981' });

    // Day Detail Modal
    const [showDayModal, setShowDayModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [dayShifts, setDayShifts] = useState<PlannedDay[]>([]);

    // Custom Shift Form (inside day modal)
    const [customShift, setCustomShift] = useState({
        start_time: '09:00',
        end_time: '17:00',
        name: 'Custom Shift',
        employee_ids: [] as string[],
    });
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    // Quick Input
    const [quickDates, setQuickDates] = useState('');
    const [quickMonth, setQuickMonth] = useState(new Date().getMonth());



    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Build calendar for year
    const getYearCalendar = () => {
        const months: Date[][] = [];
        for (let m = 0; m < 12; m++) {
            const days: Date[] = [];
            const firstDay = new Date(currentYear, m, 1);
            const lastDay = new Date(currentYear, m + 1, 0);
            for (let d = 1; d <= lastDay.getDate(); d++) {
                days.push(new Date(currentYear, m, d));
            }
            months.push(days);
        }
        return months;
    };

    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Get ALL shift colors for a day (supports multiple shifts)
    const getDayColors = (dateStr: string): string[] => {
        return plannedDays.filter(d => d.date === dateStr).map(d => d.shift_color);
    };

    // Load data
    useEffect(() => {
        loadData();
    }, [projectId]);

    async function loadData() {
        try {
            const [projRes, tempRes, daysRes, empRes] = await Promise.all([
                fetch(`${API_URL}/projects/projects/${projectId}/`, { headers }),
                fetch(`${API_URL}/projects/shift-templates/?project=${projectId}`, { headers }),
                fetch(`${API_URL}/projects/planned-days/?project=${projectId}`, { headers }),
                fetch(`${API_URL}/employees/users/`, { headers }),  // Fixed endpoint
            ]);

            if (projRes.ok) setProject(await projRes.json());
            if (tempRes.ok) {
                const data = await tempRes.json();
                setTemplates(Array.isArray(data) ? data : data.results || []);
            }
            if (daysRes.ok) {
                const data = await daysRes.json();
                setPlannedDays(Array.isArray(data) ? data : data.results || []);
            }
            if (empRes.ok) {
                const data = await empRes.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Open day detail modal
    function openDayModal(dateStr: string) {
        setSelectedDate(dateStr);
        const shifts = plannedDays.filter(d => d.date === dateStr);
        setDayShifts(shifts);
        setShowDayModal(true);
    }

    // Search employees (paginated - only when user types)
    async function searchEmployees(query: string) {
        if (!query.trim()) return; // Only search if there's input
        try {
            const res = await fetch(`${API_URL}/employees/users/?search=${encodeURIComponent(query)}&limit=20`, { headers });
            if (res.ok) {
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : data.results || []);
            }
        } catch (err) {
            console.error('Search employees error:', err);
        }
    }

    // Assign employee to shift
    async function assignEmployee(plannedDayId: string, employeeId: string) {
        try {
            await fetch(`${API_URL}/projects/shift-assignments/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ planned_day: plannedDayId, employee: employeeId }),
            });
            loadData();
            // Refresh modal data
            const updated = plannedDays.filter(d => d.date === selectedDate);
            setDayShifts(updated);
        } catch (err) {
            console.error('Assign error:', err);
        }
    }

    // Delete a shift from a day
    async function deleteShift(shiftId: string) {
        try {
            await fetch(`${API_URL}/projects/planned-days/${shiftId}/`, { method: 'DELETE', headers });
            loadData();
            // Refresh modal
            setDayShifts(prev => prev.filter(s => s.id !== shiftId));
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    // Create a custom shift with yellow color
    async function createCustomShift() {
        if (!selectedDate) return;

        try {
            // First create a new template with yellow color
            const templateRes = await fetch(`${API_URL}/projects/shift-templates/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    project: projectId,
                    name: customShift.name || 'Custom Shift',
                    start_time: customShift.start_time,
                    end_time: customShift.end_time,
                    color: '#F59E0B', // Yellow/Amber color
                }),
            });

            if (templateRes.ok) {
                const template = await templateRes.json();

                // Then create the planned day with this template
                const dayRes = await fetch(`${API_URL}/projects/planned-days/`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        shift_template: template.id,
                        date: selectedDate,
                        required_workers: 1,
                    }),
                });

                // If employees selected, assign them to this shift
                if (dayRes.ok && customShift.employee_ids.length > 0) {
                    const plannedDay = await dayRes.json();
                    // Assign ALL selected employees
                    for (const empId of customShift.employee_ids) {
                        await fetch(`${API_URL}/projects/shift-assignments/`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                planned_day: plannedDay.id,
                                employee: empId,
                            }),
                        });
                    }
                }

                // Reset form
                setCustomShift({ start_time: '09:00', end_time: '17:00', name: 'Custom Shift', employee_ids: [] });
                setEmployeeSearch('');

                // Reload data and close modal
                loadData();
                setShowDayModal(false);
            }
        } catch (err) {
            console.error('Create custom shift error:', err);
        }
    }

    // Paint a day
    async function paintDay(dateStr: string) {
        if (!selectedTemplate) return;

        // Check if already has this shift
        const existing = plannedDays.find(d => d.date === dateStr && d.shift_template === selectedTemplate.id);
        if (existing) {
            // Erase
            await fetch(`${API_URL}/projects/planned-days/${existing.id}/`, { method: 'DELETE', headers });
        } else {
            // Paint
            await fetch(`${API_URL}/projects/planned-days/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ shift_template: selectedTemplate.id, date: dateStr, required_workers: 1 }),
            });
        }
        loadData();
    }

    // Quick input apply
    async function applyQuickInput() {
        if (!selectedTemplate || !quickDates.trim()) return;

        const dates: string[] = [];
        const parts = quickDates.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n));
                for (let d = start; d <= end; d++) {
                    dates.push(`${currentYear}-${String(quickMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
                }
            } else {
                const day = parseInt(part);
                if (!isNaN(day)) {
                    dates.push(`${currentYear}-${String(quickMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                }
            }
        }

        if (dates.length > 0) {
            await fetch(`${API_URL}/projects/planned-days/bulk_create/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ shift_template: selectedTemplate.id, dates }),
            });
            setQuickDates('');
            loadData();
        }
    }

    // Create template
    async function createTemplate() {
        await fetch(`${API_URL}/projects/shift-templates/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ project: projectId, ...newTemplate }),
        });
        setShowNewTemplate(false);
        setNewTemplate({ name: '', start_time: '09:00', end_time: '17:00', color: '#10B981' });
        loadData();
    }

    // Delete template
    async function deleteTemplate(id: string) {
        if (confirm('Delete this shift template?')) {
            await fetch(`${API_URL}/projects/shift-templates/${id}/`, { method: 'DELETE', headers });
            if (selectedTemplate?.id === id) setSelectedTemplate(null);
            loadData();
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                    Loading...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button onClick={() => router.back()} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
                            {project?.name} - Planning {currentYear}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>{project?.customer_name}</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button onClick={() => setCurrentYear(y => y - 1)} style={{ padding: '8px 16px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                            ← {currentYear - 1}
                        </button>
                        <button onClick={() => setCurrentYear(y => y + 1)} style={{ padding: '8px 16px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                            {currentYear + 1} →
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
                    {/* Left: Shift Palette */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Palette size={18} /> Shift Palette
                            </h2>
                            <button
                                onClick={() => setShowNewTemplate(true)}
                                style={{ padding: '6px 12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Plus size={14} /> New
                            </button>
                        </div>

                        {/* Templates */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {templates.length === 0 ? (
                                <p style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                                    No shift templates yet. Create one to start planning.
                                </p>
                            ) : templates.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: selectedTemplate?.id === t.id ? t.color + '20' : '#F9FAFB',
                                        border: selectedTemplate?.id === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: t.color }} />
                                        <span style={{ fontWeight: 600, color: '#111827', flex: 1 }}>{t.name}</span>
                                        {selectedTemplate?.id === t.id && <Check size={16} color={t.color} />}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                                            style={{ padding: '4px', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> {t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)} • {t.planned_days_count} days
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Input */}
                        {selectedTemplate && (
                            <div style={{ marginTop: '20px', padding: '16px', background: selectedTemplate.color + '10', borderRadius: '10px', border: `1px solid ${selectedTemplate.color}40` }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                    Quick Input for {selectedTemplate.name}
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g., 1,3,5,8-15"
                                    value={quickDates}
                                    onChange={e => setQuickDates(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', marginBottom: '8px', fontSize: '14px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={quickMonth}
                                        onChange={e => setQuickMonth(parseInt(e.target.value))}
                                        style={{ flex: 1, padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                                    >
                                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                    <button
                                        onClick={applyQuickInput}
                                        disabled={!quickDates.trim()}
                                        style={{
                                            padding: '10px 16px',
                                            background: quickDates.trim() ? selectedTemplate.color : '#D1D5DB',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            cursor: quickDates.trim() ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Paint Mode Indicator */}
                        {selectedTemplate && (
                            <div style={{ marginTop: '16px', padding: '12px', background: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E' }}>
                                🎨 <strong>Paint Mode:</strong> Click any day on the calendar to paint with <span style={{ color: selectedTemplate.color, fontWeight: 600 }}>{selectedTemplate.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Year Calendar */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            {getYearCalendar().map((days, monthIdx) => (
                                <div key={monthIdx}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                        {MONTHS[monthIdx]}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                                        {DAYS.map(d => (
                                            <div key={d} style={{ fontSize: '9px', color: '#9CA3AF', textAlign: 'center', padding: '2px' }}>
                                                {d.charAt(0)}
                                            </div>
                                        ))}
                                        {/* Empty cells for first week */}
                                        {Array.from({ length: (new Date(currentYear, monthIdx, 1).getDay() + 6) % 7 }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}
                                        {days.map((date, i) => {
                                            const dateStr = formatDate(date);
                                            const colors = getDayColors(dateStr);
                                            const isToday = formatDate(new Date()) === dateStr;
                                            const hasShifts = colors.length > 0;

                                            // Create gradient for multiple shifts
                                            const bgStyle = colors.length === 0
                                                ? '#F3F4F6'
                                                : colors.length === 1
                                                    ? colors[0]
                                                    : `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${(i * 100) / colors.length}%, ${c} ${((i + 1) * 100) / colors.length}%`).join(', ')})`;

                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (selectedTemplate) {
                                                            paintDay(dateStr);
                                                        } else {
                                                            openDayModal(dateStr);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '3px',
                                                        background: bgStyle,
                                                        cursor: selectedTemplate ? 'crosshair' : 'pointer',
                                                        border: isToday ? '2px solid #111' : 'none',
                                                        fontSize: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: hasShifts ? 'white' : '#9CA3AF',
                                                        fontWeight: 500,
                                                        transition: 'transform 0.1s',
                                                        textShadow: hasShifts ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                                                        position: 'relative',
                                                    }}
                                                    onMouseEnter={e => { if (selectedTemplate) (e.target as HTMLElement).style.transform = 'scale(1.2)'; }}
                                                    onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                                                    title={`${date.toDateString()}${hasShifts ? ` - ${colors.length} shift(s)` : ''}`}
                                                >
                                                    {date.getDate()}
                                                    {/* Count badge for multiple shifts */}
                                                    {colors.length > 1 && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-4px',
                                                            right: '-4px',
                                                            width: '10px',
                                                            height: '10px',
                                                            borderRadius: '50%',
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            fontSize: '6px',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}>
                                                            {colors.length}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Template Modal */}
            {showNewTemplate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>New Shift Template</h3>
                            <button onClick={() => setShowNewTemplate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Morning Shift"
                                value={newTemplate.name}
                                onChange={e => setNewTemplate(t => ({ ...t, name: e.target.value }))}
                                style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Start Time</label>
                                <input
                                    type="time"
                                    value={newTemplate.start_time}
                                    onChange={e => setNewTemplate(t => ({ ...t, start_time: e.target.value }))}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>End Time</label>
                                <input
                                    type="time"
                                    value={newTemplate.end_time}
                                    onChange={e => setNewTemplate(t => ({ ...t, end_time: e.target.value }))}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Color</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNewTemplate(t => ({ ...t, color: c }))}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: c,
                                            border: newTemplate.color === c ? '3px solid #111' : 'none',
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={createTemplate}
                            disabled={!newTemplate.name.trim()}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: newTemplate.name.trim() ? newTemplate.color : '#D1D5DB',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: newTemplate.name.trim() ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Create Shift Template
                        </button>
                    </div>
                </div>
            )}

            {/* Day Detail Modal */}
            {showDayModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '450px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                                    {dayShifts.length} shift(s) scheduled
                                </p>
                            </div>
                            <button onClick={() => setShowDayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {dayShifts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                                <p>No shifts scheduled for this day.</p>
                                <p style={{ fontSize: '13px', marginTop: '8px' }}>Select a shift template and click to add.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {dayShifts.map(shift => {
                                    const template = templates.find(t => t.id === shift.shift_template);
                                    return (
                                        <div key={shift.id} style={{ padding: '16px', background: '#F9FAFB', borderRadius: '12px', borderLeft: `4px solid ${shift.shift_color}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>{template?.name || 'Shift'}</div>
                                                    <div style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} />
                                                        {template?.start_time?.slice(0, 5) || '00:00'} - {template?.end_time?.slice(0, 5) || '00:00'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteShift(shift.id)}
                                                    style={{ padding: '6px', background: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#DC2626' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Assigned Employees */}
                                            <div style={{ marginBottom: '8px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                                                    Assigned Employees ({shift.assignments?.length || 0}/{shift.required_workers || 1})
                                                </label>
                                                {(shift.assignments || []).map(a => (
                                                    <div key={a.id} style={{ padding: '8px 10px', background: 'white', borderRadius: '6px', marginBottom: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                                                        {a.employee_name}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Employee */}
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        assignEmployee(shift.id, e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', background: 'white' }}
                                            >
                                                <option value="">+ Assign employee...</option>
                                                {employees.filter(emp =>
                                                    !(shift.assignments || []).some(a => a.employee === emp.id)
                                                ).map(emp => (
                                                    <option key={emp.id} value={emp.id}>{getEmployeeName(emp)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add Custom Shift Form */}
                        <div style={{ marginTop: '20px', padding: '16px', background: '#FEF3C7', borderRadius: '12px', border: '1px solid #F59E0B' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Add Custom Shift
                            </h4>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#78350F', marginBottom: '4px' }}>Shift Name</label>
                                <input
                                    type="text"
                                    value={customShift.name}
                                    onChange={(e) => setCustomShift(s => ({ ...s, name: e.target.value }))}
                                    placeholder="e.g., Extra Shift"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>

                            {/* Employee Selection - Searchable Multi-Select Dropdown */}
                            <div style={{ marginBottom: '12px', position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#78350F', marginBottom: '4px' }}>
                                    Assign Employees
                                </label>

                                {/* Selected employees as bubbles */}
                                {customShift.employee_ids.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                        {customShift.employee_ids.map(empId => {
                                            const emp = employees.find(e => e.id === empId);
                                            return (
                                                <div key={empId} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px', background: '#10B981', color: 'white',
                                                    borderRadius: '20px', fontSize: '13px', fontWeight: 500
                                                }}>
                                                    {emp ? getEmployeeName(emp) : 'Employee'}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomShift(s => ({
                                                            ...s,
                                                            employee_ids: s.employee_ids.filter(id => id !== empId)
                                                        }))}
                                                        style={{ background: 'rgba(255,255,255,0.3)', border: 'none', color: 'white', cursor: 'pointer', padding: '2px 6px', borderRadius: '50%', fontSize: '12px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Dropdown trigger */}
                                <div
                                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                    style={{
                                        width: '100%', padding: '10px 12px',
                                        border: '1px solid #D1D5DB', borderRadius: '6px',
                                        background: 'white', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <span style={{ color: '#6B7280', fontSize: '13px' }}>
                                        {employees.length === 0 ? 'Loading employees...' :
                                            customShift.employee_ids.length === employees.length ? 'All employees added' :
                                                '+ Click to add employees'}
                                    </span>
                                    <span style={{ transform: showEmployeeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                </div>

                                {/* Dropdown content */}
                                {showEmployeeDropdown && (
                                    <div style={{
                                        position: 'absolute', left: 0, right: 0, top: '100%', marginTop: '4px',
                                        background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100
                                    }}>
                                        {/* Search input */}
                                        <div style={{ padding: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="🔍 Type to search employees..."
                                                value={employeeSearch}
                                                onChange={(e) => {
                                                    setEmployeeSearch(e.target.value);
                                                    // Search API when user types (with delay effect)
                                                    if (e.target.value.length >= 2) {
                                                        searchEmployees(e.target.value);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '13px' }}
                                                autoFocus
                                            />
                                        </div>

                                        {/* Employee list */}
                                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {employees.length === 0 ? (
                                                <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                                                    {employeeSearch.length < 2 ? 'Type at least 2 characters to search' : 'No employees found'}
                                                </div>
                                            ) : employees
                                                .filter(emp => !customShift.employee_ids.includes(emp.id))
                                                .filter(emp => getEmployeeName(emp).toLowerCase().includes(employeeSearch.toLowerCase()))
                                                .length === 0 ? (
                                                <div style={{ padding: '16px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                                                    {customShift.employee_ids.length === employees.length ? 'All employees added' : 'No matches found'}
                                                </div>
                                            ) : employees
                                                .filter(emp => !customShift.employee_ids.includes(emp.id))
                                                .filter(emp => getEmployeeName(emp).toLowerCase().includes(employeeSearch.toLowerCase()))
                                                .map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => {
                                                            setCustomShift(s => ({ ...s, employee_ids: [...s.employee_ids, emp.id] }));
                                                            setEmployeeSearch('');
                                                        }}
                                                        style={{
                                                            padding: '10px 12px', cursor: 'pointer', fontSize: '13px',
                                                            borderBottom: '1px solid #F3F4F6'
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                                                    >
                                                        {getEmployeeName(emp)}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>



                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#78350F', marginBottom: '4px' }}>From</label>
                                    <input
                                        type="time"
                                        value={customShift.start_time}
                                        onChange={(e) => setCustomShift(s => ({ ...s, start_time: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#78350F', marginBottom: '4px' }}>To</label>
                                    <input
                                        type="time"
                                        value={customShift.end_time}
                                        onChange={(e) => setCustomShift(s => ({ ...s, end_time: e.target.value }))}
                                        style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px' }}
                                    />
                                </div>
                            </div>


                            <button
                                onClick={createCustomShift}
                                style={{ width: '100%', padding: '12px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Add Shift to This Day
                            </button>
                        </div>

                        <button
                            onClick={() => setShowDayModal(false)}
                            style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
