'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { StatCard, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import {
    Users,
    Clock,
    DollarSign,
    FileText,
    UserCheck,
    CheckCircle,
    ArrowRight,
    ExternalLink,
    Building2,
    FolderKanban,
    Settings,
    Calendar,
    Activity,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    pendingEmployees: number;
    pendingWorkLogs: number;
    pendingAdvances: number;
}

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const [stats, setStats] = useState<DashboardStats>({
        pendingEmployees: 0,
        pendingWorkLogs: 0,
        pendingAdvances: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const data = await api.getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    }

    const totalPending = stats.pendingEmployees + stats.pendingWorkLogs + stats.pendingAdvances;

    const dateLocale = language === 'ar' ? 'ar-SA'
        : language === 'ru' ? 'ru-RU'
            : language === 'uk' ? 'uk-UA'
                : 'en-US';

    if (loading) {
        return (
            <DashboardLayout>
                <Loading />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Welcome Section */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{t('welcomeBack')} 👋</h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>{t('welcomeMessage')}</p>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <Calendar style={{ width: '20px', height: '20px', color: '#1E3A5F' }} />
                        <div>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{t('today')}</p>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                {new Date().toLocaleDateString(dateLocale, {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <StatCard
                    title={t('pendingEmployees')}
                    value={stats.pendingEmployees}
                    subtitle={t('awaitingApproval')}
                    icon={<UserCheck size={24} />}
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                    action={
                        <Link
                            href="/dashboard/employees?filter=pending"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500, color: '#d97706', textDecoration: 'none' }}
                        >
                            {t('reviewNow')} <ArrowRight size={16} />
                        </Link>
                    }
                />
                <StatCard
                    title={t('pendingWorkLogs')}
                    value={stats.pendingWorkLogs}
                    subtitle={t('hoursToApprove')}
                    icon={<Clock size={24} />}
                    iconBg="#dbeafe"
                    iconColor="#2563eb"
                    action={
                        <Link
                            href="/dashboard/worklogs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500, color: '#2563eb', textDecoration: 'none' }}
                        >
                            {t('reviewNow')} <ArrowRight size={16} />
                        </Link>
                    }
                />
                <StatCard
                    title={t('pendingAdvances')}
                    value={stats.pendingAdvances}
                    subtitle={t('moneyRequests')}
                    icon={<DollarSign size={24} />}
                    iconBg="#dcfce7"
                    iconColor="#16a34a"
                    action={
                        <Link
                            href="/dashboard/wallet"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500, color: '#16a34a', textDecoration: 'none' }}
                        >
                            {t('reviewNow')} <ArrowRight size={16} />
                        </Link>
                    }
                />
                <StatCard
                    title={t('totalPending')}
                    value={totalPending}
                    subtitle={t('actionsNeeded')}
                    icon={totalPending > 0 ? <Activity size={24} /> : <CheckCircle size={24} />}
                    iconBg={totalPending > 0 ? '#fee2e2' : '#dcfce7'}
                    iconColor={totalPending > 0 ? '#dc2626' : '#16a34a'}
                    action={
                        totalPending === 0 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 500, color: '#16a34a' }}>
                                <CheckCircle size={16} /> {t('allCaughtUp')}
                            </span>
                        ) : null
                    }
                />
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>{t('quickActions')}</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px'
                }}>
                    {[
                        { title: t('addEmployee'), desc: t('addEmployeeDesc'), icon: UserCheck, href: '/dashboard/employees', color: '#2563eb' },
                        { title: t('addCustomer'), desc: t('addCustomerDesc'), icon: Building2, href: '/dashboard/customers', color: '#7c3aed' },
                        { title: t('worklogs'), desc: t('reviewWorkLogsDesc'), icon: Clock, href: '/dashboard/worklogs', color: '#16a34a' },
                        { title: t('invoices'), desc: t('generateInvoiceDesc'), icon: FileText, href: '/dashboard/invoices', color: '#ea580c' },
                    ].map((action) => (
                        <Link key={action.title} href={action.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                height: '100%'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    backgroundColor: action.color,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <action.icon size={24} style={{ color: '#ffffff' }} />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{action.title}</h3>
                                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>{action.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Two Column Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Getting Started */}
                <div style={{
                    backgroundColor: '#1E3A5F',
                    borderRadius: '12px',
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <Activity size={20} style={{ color: '#ffffff' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>{t('gettingStarted')}</h2>
                    </div>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>{t('completeSteps')}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[t('step1'), t('step2'), t('step3'), t('step4'), t('step5')].map((text, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '10px'
                                }}
                            >
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    flexShrink: 0
                                }}>
                                    {index + 1}
                                </div>
                                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Links */}
                <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>{t('systemLinks')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { title: t('djangoAdmin'), desc: t('djangoAdminDesc'), icon: FolderKanban, href: 'http://localhost:8000/admin/', color: '#ea580c', external: true },
                            { title: t('apiDocs'), desc: t('apiDocsDesc'), icon: FileText, href: 'http://localhost:8000/api/docs/', color: '#2563eb', external: true },
                            { title: t('systemSettings'), desc: t('systemSettingsDesc'), icon: Settings, href: '/dashboard/settings', color: '#7c3aed', external: false },
                        ].map((link) => (
                            <a
                                key={link.title}
                                href={link.href}
                                target={link.external ? '_blank' : undefined}
                                rel={link.external ? 'noopener noreferrer' : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '16px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    textDecoration: 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: `${link.color}15`,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <link.icon size={20} style={{ color: link.color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{link.title}</p>
                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{link.desc}</p>
                                </div>
                                {link.external ? (
                                    <ExternalLink size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                ) : (
                                    <ArrowRight size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                )}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
