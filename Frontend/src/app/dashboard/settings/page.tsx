'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Settings as SettingsIcon,
    Building2,
    Bell,
    Globe,
    Calendar,
    Save,
    Check,
    Clock,
    Coffee,
    Mail,
    Phone,
    MapPin,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Plus,
    Trash2,
    Send,
    Key,
    ToggleLeft,
    ToggleRight,
    ChevronDown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ContactEntry {
    label: string;
    value: string;
}

interface SystemConfig {
    company_name: string;
    company_emails: ContactEntry[];
    company_phones: ContactEntry[];
    company_address: string;
    frontend_url: string;
    week_starts_on: string;
    week_start_hour: string;
    default_break_minutes: number;
    notify_new_employee: boolean;
    notify_pending_approvals: boolean;
    notify_weekly_summary: boolean;
    notify_certificate_expiry: boolean;
    certificate_expiry_days: number;
    // Email configuration
    smtp_enabled: boolean;
    smtp_email: string;
    smtp_password: string;
    notification_recipients: string[];
    category_recipients: Record<string, string[]>;
    email_on_employees: boolean;
    email_on_worklogs: boolean;
    email_on_certificates: boolean;
    email_on_invoices: boolean;
    email_on_high_priority: boolean;
    // Firebase Push Notifications
    firebase_push_enabled: boolean;
    firebase_server_key: string;
    updated_at?: string;
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [originalSettings, setOriginalSettings] = useState<string>('');
    const [settings, setSettings] = useState<SystemConfig>({
        company_name: 'Pro Totaal Service',
        company_emails: [{ label: 'Main', value: 'admin@prototaalservice.nl' }],
        company_phones: [{ label: 'Main', value: '+31 20 123 4567' }],
        company_address: 'Businesspark 10, Amsterdam',
        frontend_url: 'http://localhost:3000',
        week_starts_on: 'monday',
        week_start_hour: '06:00',
        default_break_minutes: 30,
        notify_new_employee: true,
        notify_pending_approvals: true,
        notify_weekly_summary: false,
        notify_certificate_expiry: true,
        certificate_expiry_days: 30,
        // Email defaults
        smtp_enabled: false,
        smtp_email: '',
        smtp_password: '',
        notification_recipients: [],
        category_recipients: {},
        email_on_employees: true,
        email_on_worklogs: false,
        email_on_certificates: true,
        email_on_invoices: false,
        email_on_high_priority: true,
        firebase_push_enabled: false,
        firebase_server_key: '',
    });

    // Check if settings have changed
    const hasChanges = JSON.stringify(settings) !== originalSettings;

    const [selectedLanguage, setSelectedLanguage] = useState('en');

    // Load settings from API on mount
    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/settings/config/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setOriginalSettings(JSON.stringify(data));
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/settings/config/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                setSaved(true);
                setOriginalSettings(JSON.stringify(settings));
                setTimeout(() => setSaved(false), 3000);
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to save settings');
            }
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    const weekDays = [
        { value: 'monday', label: 'Monday' },
        { value: 'sunday', label: 'Sunday' },
    ];

    const weekHours = [
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    ];

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    ];

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <RefreshCw size={32} className="animate-spin" style={{ color: '#3B82F6', marginBottom: '16px' }} />
                        <p style={{ color: '#6B7280' }}>Loading settings...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ padding: '0 0 32px 0', maxWidth: '900px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                            Settings
                        </h1>
                        <p style={{ fontSize: '15px', color: '#6B7280', marginTop: '6px' }}>
                            Configure system-wide settings and preferences
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: saved ? '#10B981' : !hasChanges ? '#9CA3AF' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
                            boxShadow: hasChanges ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                            transition: 'all 0.2s ease',
                            opacity: (saving || !hasChanges) ? 0.7 : 1,
                        }}
                    >
                        {saving ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : saved ? (
                            <Check size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #FCA5A5',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <AlertCircle size={20} color="#DC2626" />
                        <span style={{ color: '#DC2626', fontWeight: 500 }}>{error}</span>
                    </div>
                )}

                {/* Company Information Card */}
                <SettingsCard
                    icon={Building2}
                    iconColor="#3B82F6"
                    iconBg="#EFF6FF"
                    title="Company Information"
                    description="Basic details about your company"
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <InputField
                            label="Company Name"
                            icon={Building2}
                            value={settings.company_name}
                            onChange={(v) => setSettings({ ...settings, company_name: v })}
                        />
                        <InputField
                            label="Business Address"
                            icon={MapPin}
                            value={settings.company_address}
                            onChange={(v) => setSettings({ ...settings, company_address: v })}
                        />
                    </div>

                    {/* Multiple Emails */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                <Mail size={14} style={{ marginRight: '6px' }} />
                                Email Addresses
                            </label>
                            <button
                                onClick={() => setSettings({
                                    ...settings,
                                    company_emails: [...settings.company_emails, { label: '', value: '' }]
                                })}
                                style={addButtonStyle}
                            >
                                <Plus size={14} /> Add Email
                            </button>
                        </div>
                        {settings.company_emails.map((email, index) => (
                            <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Label (e.g. Info, Support)"
                                    value={email.label}
                                    onChange={(e) => {
                                        const updated = [...settings.company_emails];
                                        updated[index] = { ...updated[index], label: e.target.value };
                                        setSettings({ ...settings, company_emails: updated });
                                    }}
                                    style={{ ...inputStyle, width: '150px' }}
                                />
                                <input
                                    type="email"
                                    placeholder="email@company.nl"
                                    value={email.value}
                                    onChange={(e) => {
                                        const updated = [...settings.company_emails];
                                        updated[index] = { ...updated[index], value: e.target.value };
                                        setSettings({ ...settings, company_emails: updated });
                                    }}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                {settings.company_emails.length > 1 && (
                                    <button
                                        onClick={() => setSettings({
                                            ...settings,
                                            company_emails: settings.company_emails.filter((_, i) => i !== index)
                                        })}
                                        style={deleteButtonStyle}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Multiple Phones */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                <Phone size={14} style={{ marginRight: '6px' }} />
                                Phone Numbers
                            </label>
                            <button
                                onClick={() => setSettings({
                                    ...settings,
                                    company_phones: [...settings.company_phones, { label: '', value: '' }]
                                })}
                                style={addButtonStyle}
                            >
                                <Plus size={14} /> Add Phone
                            </button>
                        </div>
                        {settings.company_phones.map((phone, index) => (
                            <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Label (e.g. Office, Mobile)"
                                    value={phone.label}
                                    onChange={(e) => {
                                        const updated = [...settings.company_phones];
                                        updated[index] = { ...updated[index], label: e.target.value };
                                        setSettings({ ...settings, company_phones: updated });
                                    }}
                                    style={{ ...inputStyle, width: '150px' }}
                                />
                                <input
                                    type="tel"
                                    placeholder="+31 20 123 4567"
                                    value={phone.value}
                                    onChange={(e) => {
                                        const updated = [...settings.company_phones];
                                        updated[index] = { ...updated[index], value: e.target.value };
                                        setSettings({ ...settings, company_phones: updated });
                                    }}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                {settings.company_phones.length > 1 && (
                                    <button
                                        onClick={() => setSettings({
                                            ...settings,
                                            company_phones: settings.company_phones.filter((_, i) => i !== index)
                                        })}
                                        style={deleteButtonStyle}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </SettingsCard>

                {/* Week Configuration Card */}
                <SettingsCard
                    icon={Calendar}
                    iconColor="#10B981"
                    iconBg="#D1FAE5"
                    title="Week Configuration"
                    description="Configure how work weeks are calculated"
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>
                                <Calendar size={14} style={{ marginRight: '6px' }} />
                                Week Starts On
                            </label>
                            <select
                                value={settings.week_starts_on}
                                onChange={(e) => setSettings({ ...settings, week_starts_on: e.target.value })}
                                style={selectStyle}
                            >
                                {weekDays.map(day => (
                                    <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>
                                <Clock size={14} style={{ marginRight: '6px' }} />
                                Week Start Hour
                            </label>
                            <select
                                value={settings.week_start_hour}
                                onChange={(e) => setSettings({ ...settings, week_start_hour: e.target.value })}
                                style={selectStyle}
                            >
                                {weekHours.map(hour => (
                                    <option key={hour} value={hour}>{hour}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>
                                <Coffee size={14} style={{ marginRight: '6px' }} />
                                Default Break (min)
                            </label>
                            <input
                                type="number"
                                value={settings.default_break_minutes}
                                onChange={(e) => setSettings({ ...settings, default_break_minutes: parseInt(e.target.value) || 0 })}
                                style={inputStyle}
                                min={0}
                                max={120}
                            />
                        </div>
                    </div>

                    {/* Week Info Banner */}
                    <div style={{
                        marginTop: '20px',
                        padding: '16px 20px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '12px',
                        border: '1px solid #BBF7D0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <CheckCircle size={20} color="white" />
                        </div>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#166534', margin: 0 }}>
                                Current Configuration
                            </p>
                            <p style={{ fontSize: '13px', color: '#15803D', margin: 0, marginTop: '2px' }}>
                                Week runs from {settings.week_starts_on.charAt(0).toUpperCase() + settings.week_starts_on.slice(1)} at {settings.week_start_hour} with {settings.default_break_minutes} min default break
                            </p>
                        </div>
                    </div>
                </SettingsCard>

                {/* Language Settings Card */}
                <SettingsCard
                    icon={Globe}
                    iconColor="#8B5CF6"
                    iconBg="#EDE9FE"
                    title="Language"
                    description="Choose your preferred display language"
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => setSelectedLanguage(lang.code)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '16px 12px',
                                    borderRadius: '12px',
                                    border: selectedLanguage === lang.code ? '2px solid #8B5CF6' : '2px solid #E5E7EB',
                                    backgroundColor: selectedLanguage === lang.code ? '#F5F3FF' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <span style={{ fontSize: '28px' }}>{lang.flag}</span>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: selectedLanguage === lang.code ? 600 : 500,
                                    color: selectedLanguage === lang.code ? '#7C3AED' : '#374151',
                                }}>
                                    {lang.name}
                                </span>
                                {selectedLanguage === lang.code && (
                                    <CheckCircle size={16} color="#8B5CF6" />
                                )}
                            </button>
                        ))}
                    </div>
                </SettingsCard>

                {/* Push Notifications Card */}
                <SettingsCard
                    icon={Bell}
                    iconColor="#8B5CF6"
                    iconBg="#EDE9FE"
                    title="Push Notifications (Mobile App)"
                    description="Configure Firebase Cloud Messaging for push notifications"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <NotificationToggle
                            label="Enable Push Notifications"
                            description="Send push notifications to employees' mobile devices"
                            checked={settings.firebase_push_enabled}
                            onChange={(v) => setSettings({ ...settings, firebase_push_enabled: v })}
                        />

                        {settings.firebase_push_enabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                    Firebase Server Key
                                </label>
                                <input
                                    type="password"
                                    value={settings.firebase_server_key || ''}
                                    onChange={(e) => setSettings({ ...settings, firebase_server_key: e.target.value })}
                                    placeholder="Enter Firebase Server Key from Console → Cloud Messaging"
                                    style={{
                                        padding: '12px 16px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                    }}
                                />
                                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                                    Get this from Firebase Console → Project Settings → Cloud Messaging → Server key
                                </p>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                {/* Notification Settings Card */}
                <SettingsCard
                    icon={Bell}
                    iconColor="#F59E0B"
                    iconBg="#FEF3C7"
                    title="Email Notifications"
                    description="Configure when to receive email alerts"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <NotificationToggle
                            label="New employee registrations"
                            description="Get notified when a new employee signs up"
                            checked={settings.notify_new_employee}
                            onChange={(v) => setSettings({ ...settings, notify_new_employee: v })}
                        />
                        <NotificationToggle
                            label="Pending approvals"
                            description="Get notified about work logs waiting for approval"
                            checked={settings.notify_pending_approvals}
                            onChange={(v) => setSettings({ ...settings, notify_pending_approvals: v })}
                        />
                        <NotificationToggle
                            label="Weekly summary reports"
                            description="Receive a weekly overview of all activities"
                            checked={settings.notify_weekly_summary}
                            onChange={(v) => setSettings({ ...settings, notify_weekly_summary: v })}
                        />
                        <NotificationToggle
                            label="Certificate expiry warnings"
                            description={`Alert ${settings.certificate_expiry_days} days before certificates expire`}
                            checked={settings.notify_certificate_expiry}
                            onChange={(v) => setSettings({ ...settings, notify_certificate_expiry: v })}
                        />
                    </div>
                </SettingsCard>

                {/* Email Configuration Card */}
                <SettingsCard
                    icon={Send}
                    iconColor="#EC4899"
                    iconBg="#FCE7F3"
                    title="Email Configuration"
                    description="Configure Gmail SMTP for sending notification emails"
                >
                    {/* SMTP Toggle */}
                    <div style={{ marginBottom: '20px' }}>
                        <NotificationToggle
                            label="Enable Email Sending"
                            description="Send notification emails via Gmail SMTP"
                            checked={settings.smtp_enabled}
                            onChange={(v) => setSettings({ ...settings, smtp_enabled: v })}
                        />
                    </div>

                    {settings.smtp_enabled && (
                        <>
                            {/* SMTP Credentials */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>
                                        <Mail size={14} style={{ marginRight: '6px' }} />
                                        Gmail Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="your-email@gmail.com"
                                        value={settings.smtp_email}
                                        onChange={(e) => setSettings({ ...settings, smtp_email: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>
                                        <Key size={14} style={{ marginRight: '6px' }} />
                                        App Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Gmail App Password"
                                        value={settings.smtp_password}
                                        onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            {/* Recipient Emails */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                                        <Mail size={14} style={{ marginRight: '6px' }} />
                                        Notification Recipients
                                    </label>
                                    <button
                                        onClick={() => setSettings({
                                            ...settings,
                                            notification_recipients: [...settings.notification_recipients, '']
                                        })}
                                        style={addButtonStyle}
                                    >
                                        <Plus size={14} /> Add Email
                                    </button>
                                </div>
                                {settings.notification_recipients.length === 0 && (
                                    <p style={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>No recipients configured. Add at least one email.</p>
                                )}
                                {settings.notification_recipients.map((email, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                        <input
                                            type="email"
                                            placeholder="recipient@example.com"
                                            value={email}
                                            onChange={(e) => {
                                                const updated = [...settings.notification_recipients];
                                                updated[index] = e.target.value;
                                                setSettings({ ...settings, notification_recipients: updated });
                                            }}
                                            style={{ ...inputStyle, flex: 1 }}
                                        />
                                        <button
                                            onClick={() => setSettings({
                                                ...settings,
                                                notification_recipients: settings.notification_recipients.filter((_, i) => i !== index)
                                            })}
                                            style={deleteButtonStyle}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Email Rules with Inline Recipients */}
                            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                    Which notifications should trigger email?
                                </h4>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
                                    Enable categories and specify recipients for each
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <EmailRuleWithRecipients
                                        categoryKey="employees"
                                        icon="👤"
                                        label="Employees"
                                        description="New registrations, profile approvals/rejections"
                                        checked={settings.email_on_employees}
                                        onToggle={(v) => setSettings({ ...settings, email_on_employees: v })}
                                        emails={settings.category_recipients?.employees || []}
                                        onEmailsChange={(emails) => setSettings({
                                            ...settings,
                                            category_recipients: { ...settings.category_recipients, employees: emails }
                                        })}
                                        availableEmails={settings.notification_recipients.filter(e => e.trim() !== '')}
                                    />
                                    <EmailRuleWithRecipients
                                        categoryKey="worklogs"
                                        icon="📝"
                                        label="Work Logs"
                                        description="Submitted, approved, or rejected work logs"
                                        checked={settings.email_on_worklogs}
                                        onToggle={(v) => setSettings({ ...settings, email_on_worklogs: v })}
                                        emails={settings.category_recipients?.worklogs || []}
                                        onEmailsChange={(emails) => setSettings({
                                            ...settings,
                                            category_recipients: { ...settings.category_recipients, worklogs: emails }
                                        })}
                                        availableEmails={settings.notification_recipients.filter(e => e.trim() !== '')}
                                    />
                                    <EmailRuleWithRecipients
                                        categoryKey="certificates"
                                        icon="🏥"
                                        label="Certificates"
                                        description="Expiring or expired employee certificates"
                                        checked={settings.email_on_certificates}
                                        onToggle={(v) => setSettings({ ...settings, email_on_certificates: v })}
                                        emails={settings.category_recipients?.certificates || []}
                                        onEmailsChange={(emails) => setSettings({
                                            ...settings,
                                            category_recipients: { ...settings.category_recipients, certificates: emails }
                                        })}
                                        availableEmails={settings.notification_recipients.filter(e => e.trim() !== '')}
                                    />
                                    <EmailRuleWithRecipients
                                        categoryKey="invoices"
                                        icon="📄"
                                        label="Invoices"
                                        description="Generated invoices and payment status changes"
                                        checked={settings.email_on_invoices}
                                        onToggle={(v) => setSettings({ ...settings, email_on_invoices: v })}
                                        emails={settings.category_recipients?.invoices || []}
                                        onEmailsChange={(emails) => setSettings({
                                            ...settings,
                                            category_recipients: { ...settings.category_recipients, invoices: emails }
                                        })}
                                        availableEmails={settings.notification_recipients.filter(e => e.trim() !== '')}
                                    />
                                    <EmailRuleWithRecipients
                                        categoryKey="high_priority"
                                        icon="🔴"
                                        label="High Priority"
                                        description="Urgent notifications regardless of category"
                                        checked={settings.email_on_high_priority}
                                        onToggle={(v) => setSettings({ ...settings, email_on_high_priority: v })}
                                        emails={settings.category_recipients?.high_priority || []}
                                        onEmailsChange={(emails) => setSettings({
                                            ...settings,
                                            category_recipients: { ...settings.category_recipients, high_priority: emails }
                                        })}
                                        availableEmails={settings.notification_recipients.filter(e => e.trim() !== '')}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </SettingsCard>
            </div>
        </DashboardLayout>
    );
}

// Settings Card Component
function SettingsCard({ icon: Icon, iconColor, iconBg, title, description, children }: {
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Icon size={22} color={iconColor} />
                </div>
                <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, marginTop: '2px' }}>{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

// Input Field Component
function InputField({ label, icon: Icon, value, onChange, type = 'text' }: {
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label style={labelStyle}>
                <Icon size={14} style={{ marginRight: '6px' }} />
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={inputStyle}
            />
        </div>
    );
}

// Notification Toggle Component
function NotificationToggle({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                backgroundColor: checked ? '#FFFBEB' : '#FAFAFA',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: checked ? '#FEF3C7' : '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {checked ? (
                        <CheckCircle size={18} color="#F59E0B" />
                    ) : (
                        <XCircle size={18} color="#9CA3AF" />
                    )}
                </div>
                <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#374151', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, marginTop: '2px' }}>{description}</p>
                </div>
            </div>
            <div style={{
                width: '48px',
                height: '28px',
                borderRadius: '14px',
                backgroundColor: checked ? '#F59E0B' : '#D1D5DB',
                padding: '2px',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
            }}>
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transform: checked ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease',
                }} />
            </div>
        </div>
    );
}

// Styles
const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#374151',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: 'white',
    cursor: 'pointer',
};

const addButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
};

const deleteButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '44px',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    border: '1px solid #FECACA',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
};

// Email Rule Toggle Component (with description)
function EmailRuleToggle({ label, description, checked, onChange }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: checked ? '1px solid #10B981' : '1px solid #E5E7EB',
                backgroundColor: checked ? '#ECFDF5' : 'white',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: checked ? '2px solid #10B981' : '2px solid #D1D5DB',
                backgroundColor: checked ? '#10B981' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
            }}>
                {checked && <CheckCircle size={12} color="white" />}
            </div>
            <div style={{ flex: 1 }}>
                <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: checked ? '#065F46' : '#374151',
                    display: 'block',
                }}>
                    {label}
                </span>
                {description && (
                    <span style={{
                        fontSize: '12px',
                        color: checked ? '#059669' : '#6B7280',
                        marginTop: '2px',
                        display: 'block',
                    }}>
                        {description}
                    </span>
                )}
            </div>
        </div>
    );
}

// Email Rule with multi-select dropdown from available recipients
function EmailRuleWithRecipients({
    categoryKey, icon, label, description, checked, onToggle, emails, onEmailsChange, availableEmails
}: {
    categoryKey: string;
    icon: string;
    label: string;
    description: string;
    checked: boolean;
    onToggle: (checked: boolean) => void;
    emails: string[];
    onEmailsChange: (emails: string[]) => void;
    availableEmails: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleEmail = (email: string) => {
        if (emails.includes(email)) {
            onEmailsChange(emails.filter(e => e !== email));
        } else {
            onEmailsChange([...emails, email]);
        }
    };

    return (
        <div
            style={{
                padding: '14px',
                borderRadius: '10px',
                border: checked ? '1px solid #10B981' : '1px solid #E5E7EB',
                backgroundColor: checked ? '#ECFDF5' : 'white',
                transition: 'all 0.15s ease',
            }}
        >
            {/* Header with toggle */}
            <div
                onClick={() => onToggle(!checked)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                }}
            >
                <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: checked ? '2px solid #10B981' : '2px solid #D1D5DB',
                    backgroundColor: checked ? '#10B981' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    {checked && <CheckCircle size={12} color="white" />}
                </div>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: checked ? '#065F46' : '#374151',
                    }}>
                        {label}
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: checked ? '#059669' : '#6B7280',
                        marginLeft: '8px',
                    }}>
                        {description}
                    </span>
                </div>
            </div>

            {/* Multi-select dropdown - only show when enabled */}
            {checked && (
                <div style={{ marginTop: '12px', paddingLeft: '32px' }} ref={dropdownRef}>
                    {availableEmails.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                            Add recipients above first
                        </p>
                    ) : (
                        <>
                            {/* Selected emails as chips */}
                            {emails.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {emails.map(email => (
                                        <span
                                            key={email}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                fontSize: '12px',
                                                backgroundColor: '#10B981',
                                                color: 'white',
                                                borderRadius: '16px',
                                            }}
                                        >
                                            {email}
                                            <span
                                                onClick={(e) => { e.stopPropagation(); toggleEmail(email); }}
                                                style={{ cursor: 'pointer', opacity: 0.8 }}
                                            >
                                                ✕
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown trigger */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        backgroundColor: 'white',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: '#6B7280',
                                    }}
                                >
                                    <span>{emails.length === 0 ? 'Select recipients...' : `${emails.length} selected`}</span>
                                    <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </button>

                                {/* Dropdown menu */}
                                {isOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        marginTop: '4px',
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        zIndex: 50,
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                    }}>
                                        {availableEmails.map(email => {
                                            const isSelected = emails.includes(email);
                                            return (
                                                <div
                                                    key={email}
                                                    onClick={(e) => { e.stopPropagation(); toggleEmail(email); }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        backgroundColor: isSelected ? '#F0FDF4' : 'white',
                                                        borderBottom: '1px solid #F3F4F6',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: isSelected ? '2px solid #10B981' : '2px solid #D1D5DB',
                                                        backgroundColor: isSelected ? '#10B981' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}>
                                                        {isSelected && <Check size={10} color="white" />}
                                                    </div>
                                                    <span style={{ fontSize: '13px', color: '#374151' }}>{email}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
