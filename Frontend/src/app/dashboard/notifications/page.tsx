'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import {
    Bell,
    Check,
    CheckCheck,
    AlertCircle,
    Info,
    AlertTriangle,
    FileText,
    User,
    Briefcase,
    Clock,
    Wallet,
    Award,
    X,
    Trash2,
    Filter,
    RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Notification {
    id: string;
    notification_type: string;
    category: string;
    priority: string;
    title: string;
    message: string;
    is_read: boolean;
    email_sent: boolean;
    created_at: string;
    action_url?: string;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    credentials_created: { icon: User, color: '#3B82F6', bg: '#DBEAFE' },
    profile_submitted: { icon: User, color: '#8B5CF6', bg: '#EDE9FE' },
    profile_approved: { icon: Check, color: '#10B981', bg: '#D1FAE5' },
    profile_rejected: { icon: X, color: '#EF4444', bg: '#FEE2E2' },
    project_assigned: { icon: Briefcase, color: '#3B82F6', bg: '#DBEAFE' },
    worklog_submitted: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
    worklog_approved: { icon: Check, color: '#10B981', bg: '#D1FAE5' },
    worklog_rejected: { icon: X, color: '#EF4444', bg: '#FEE2E2' },
    advance_requested: { icon: Wallet, color: '#8B5CF6', bg: '#EDE9FE' },
    advance_approved: { icon: Wallet, color: '#10B981', bg: '#D1FAE5' },
    advance_rejected: { icon: Wallet, color: '#EF4444', bg: '#FEE2E2' },
    certificate_expiring: { icon: Award, color: '#F59E0B', bg: '#FEF3C7' },
    certificate_expired: { icon: AlertTriangle, color: '#EF4444', bg: '#FEE2E2' },
    invoice_generated: { icon: FileText, color: '#3B82F6', bg: '#DBEAFE' },
    invoice_paid: { icon: Check, color: '#10B981', bg: '#D1FAE5' },
    warning: { icon: AlertTriangle, color: '#F59E0B', bg: '#FEF3C7' },
    alert: { icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
    info: { icon: Info, color: '#3B82F6', bg: '#DBEAFE' },
    system: { icon: Bell, color: '#6B7280', bg: '#F3F4F6' },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
    high: { label: 'High', color: '#F59E0B', bg: '#FEF3C7' },
    normal: { label: 'Normal', color: '#3B82F6', bg: '#DBEAFE' },
    low: { label: 'Low', color: '#6B7280', bg: '#F3F4F6' },
};

const categoryTabs = [
    { key: 'all', label: 'All', icon: '📢' },
    { key: 'employees', label: 'Employees', icon: '👤' },
    { key: 'worklogs', label: 'Work Logs', icon: '📝' },
    { key: 'certificates', label: 'Certificates', icon: '🏥' },
    { key: 'invoices', label: 'Invoices', icon: '📄' },
    { key: 'projects', label: 'Projects', icon: '📁' },
    { key: 'wallet', label: 'Wallet', icon: '💰' },
    { key: 'system', label: 'System', icon: '⚙️' },
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextPage, setNextPage] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications(url?: string) {
        if (url) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        try {
            const fetchUrl = url || `${API_URL}/notifications/notifications/?page_size=20`;
            const response = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            if (response.ok) {
                const data = await response.json();
                if (url) {
                    setNotifications(prev => [...prev, ...(data.results || [])]);
                } else {
                    setNotifications(data.results || data);
                }
                setNextPage(data.next || null);
                setTotalCount(data.count || 0);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(id: string) {
        try {
            await fetch(`${API_URL}/notifications/notifications/${id}/mark_read/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }

    async function markAllAsRead() {
        try {
            await fetch(`${API_URL}/notifications/notifications/mark_all_read/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }

    function selectAll() {
        if (selectedIds.size === filteredNotifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
        }
    }

    async function markSelectedAsRead() {
        try {
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    fetch(`${API_URL}/notifications/notifications/${id}/mark_read/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                    })
                )
            );
            setNotifications(prev => prev.map(n =>
                selectedIds.has(n.id) ? { ...n, is_read: true } : n
            ));
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to mark selected as read:', err);
        }
    }

    async function deleteSelected() {
        if (!confirm(`Delete ${selectedIds.size} notification(s)?`)) return;
        try {
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    fetch(`${API_URL}/notifications/notifications/${id}/`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                    })
                )
            );
            setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Failed to delete notifications:', err);
        }
    }

    const filteredNotifications = notifications.filter(n => {
        const matchesRead = readFilter === 'all' || !n.is_read;
        const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
        return matchesRead && matchesCategory;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    function formatTime(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    function getConfig(type: string) {
        return typeConfig[type] || typeConfig.system;
    }

    // Stats
    const stats = {
        total: notifications.length,
        unread: unreadCount,
        read: notifications.length - unreadCount,
    };

    return (
        <DashboardLayout>
            <div style={{ padding: '0 0 32px 0' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '32px',
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                            Notifications
                        </h1>
                        <p style={{ fontSize: '15px', color: '#6B7280', marginTop: '6px' }}>
                            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => loadNotifications()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                backgroundColor: 'white',
                                color: '#6B7280',
                                border: '1px solid #E5E7EB',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 20px',
                                    backgroundColor: '#3B82F6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                }}
                            >
                                <CheckCheck size={18} />
                                Mark All Read
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    marginBottom: '32px',
                }}>
                    <StatCard label="Total" value={stats.total} icon={Bell} color="#6366F1" />
                    <StatCard label="Unread" value={stats.unread} icon={AlertCircle} color="#F59E0B" />
                    <StatCard label="Read" value={stats.read} icon={Check} color="#10B981" />
                </div>

                {/* Category Tabs */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    padding: '20px 24px',
                    marginBottom: '24px',
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                        {categoryTabs.map(tab => {
                            const count = tab.key === 'all'
                                ? notifications.length
                                : notifications.filter(n => n.category === tab.key).length;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setCategoryFilter(tab.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 16px',
                                        backgroundColor: categoryFilter === tab.key ? '#1E3A5F' : '#F3F4F6',
                                        color: categoryFilter === tab.key ? 'white' : '#4B5563',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                    {count > 0 && (
                                        <span style={{
                                            padding: '2px 8px',
                                            backgroundColor: categoryFilter === tab.key ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                        }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Read/Unread Filter */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
                        <button
                            onClick={() => setReadFilter('all')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: readFilter === 'all' ? '#DBEAFE' : 'transparent',
                                color: readFilter === 'all' ? '#1D4ED8' : '#6B7280',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setReadFilter('unread')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: readFilter === 'unread' ? '#DBEAFE' : 'transparent',
                                color: readFilter === 'unread' ? '#1D4ED8' : '#6B7280',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                }}>
                    {/* Bulk Action Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 24px',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB',
                    }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                            onChange={selectAll}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#6B7280' }}>
                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                        </span>
                        {selectedIds.size > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                <button
                                    onClick={markSelectedAsRead}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        backgroundColor: '#DBEAFE',
                                        color: '#1D4ED8',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Check size={14} />
                                    Mark Read
                                </button>
                                <button
                                    onClick={deleteSelected}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        backgroundColor: '#FEE2E2',
                                        color: '#DC2626',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* List */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid #E5E7EB',
                                borderTopColor: '#3B82F6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                backgroundColor: '#F3F4F6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                            }}>
                                <Bell size={36} color="#D1D5DB" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>
                                {readFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                                When you receive notifications, they will appear here
                            </p>
                        </div>
                    ) : (
                        <div>
                            {filteredNotifications.map((notification) => {
                                const config = getConfig(notification.notification_type);
                                const IconComponent = config.icon;
                                const priority = priorityConfig[notification.priority];

                                return (
                                    <div
                                        key={notification.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '20px 24px',
                                            borderBottom: '1px solid #F3F4F6',
                                            backgroundColor: selectedIds.has(notification.id)
                                                ? '#EFF6FF'
                                                : !notification.is_read
                                                    ? '#FAFBFF'
                                                    : 'white',
                                            transition: 'background-color 0.15s ease',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(notification.id)}
                                            onChange={() => toggleSelect(notification.id)}
                                            style={{ width: '18px', height: '18px', marginTop: '4px', cursor: 'pointer' }}
                                        />

                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            backgroundColor: config.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <IconComponent size={22} color={config.color} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                {notification.priority && notification.priority !== 'normal' && priority && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        color: priority.color,
                                                        backgroundColor: priority.bg,
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {priority.label}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 style={{
                                                fontSize: '15px',
                                                fontWeight: notification.is_read ? 500 : 600,
                                                color: '#1F2937',
                                                margin: '0 0 4px',
                                            }}>
                                                {notification.title}
                                            </h4>
                                            <p style={{
                                                fontSize: '14px',
                                                color: '#6B7280',
                                                margin: 0,
                                                lineHeight: '1.5',
                                            }}>
                                                {notification.message}
                                            </p>
                                            {notification.action_url && (
                                                <a
                                                    href={notification.action_url}
                                                    style={{
                                                        display: 'inline-block',
                                                        marginTop: '10px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#3B82F6',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    View Details →
                                                </a>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                                {formatTime(notification.created_at)}
                                            </span>
                                            {!notification.is_read && (
                                                <>
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#3B82F6',
                                                    }} />
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        style={{
                                                            padding: '8px',
                                                            backgroundColor: '#F3F4F6',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                        }}
                                                        title="Mark as read"
                                                    >
                                                        <Check size={14} color="#6B7280" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Load More Button */}
                            {nextPage && (
                                <div style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid #E5E7EB' }}>
                                    <button
                                        onClick={() => loadNotifications(nextPage)}
                                        disabled={loadingMore}
                                        style={{
                                            padding: '12px 32px',
                                            backgroundColor: loadingMore ? '#E5E7EB' : '#F3F4F6',
                                            color: '#4B5563',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: loadingMore ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {loadingMore ? 'Loading...' : `Load More (${notifications.length} of ${totalCount})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </DashboardLayout>
    );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        }}>
            <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Icon size={26} color={color} />
            </div>
            <div>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 4px' }}>{label}</p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', margin: 0 }}>{value}</p>
            </div>
        </div>
    );
}
