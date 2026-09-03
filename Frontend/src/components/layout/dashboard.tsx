'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { availableLanguages, useLanguage } from '@/lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { clearTokens, getRole, isAdmin, isFinance, isOperations } from '@/lib/auth';
import {
    LayoutDashboard,
    Users,
    Building2,
    FolderKanban,
    Clock,
    Calendar,
    CalendarDays,
    FileText,
    CreditCard,
    Settings,
    Bell,
    LogOut,
    Menu,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CircleDollarSign,
    Globe,
    Check,
    HelpCircle,
    Award,
    Gift,
    Briefcase,
    Receipt,
    BarChart3,
    Wallet
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================================
   FIGMA DESIGN SIDEBAR - Professional Spacing & Typography
   ============================================================================ */
function Sidebar({
    isOpen,
    onClose,
    isCollapsed,
    onToggleCollapse
}: {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, isRTL } = useLanguage();
    const navRef = useRef<HTMLElement>(null);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    // This layout is rendered *inside* each page rather than as a route layout,
    // so it unmounts on every navigation and all its state resets — which is why
    // an opened group snapped shut as soon as you clicked an item in it, and why
    // the scroll position needed saving too. Both are restored on mount.
    useEffect(() => {
        const savedScrollTop = sessionStorage.getItem('sidebarScrollTop');
        if (savedScrollTop && navRef.current) {
            navRef.current.scrollTop = parseInt(savedScrollTop, 10);
        }

        let restored: string[] = [];
        try {
            restored = JSON.parse(sessionStorage.getItem('sidebarExpandedMenus') || '[]');
        } catch {
            restored = [];
        }

        // The group that owns the current page is always open, so landing on a
        // sub-page by URL or refresh shows you where you are.
        const owningCurrentRoute = navGroups
            .filter(group => group.activePrefixes.some(prefix => pathname.startsWith(prefix)))
            .map(group => group.id);

        setExpandedMenus([...new Set([...restored, ...owningCurrentRoute])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Save sidebar scroll position before navigation
    const handleNavClick = () => {
        if (navRef.current) {
            sessionStorage.setItem('sidebarScrollTop', navRef.current.scrollTop.toString());
        }
        onClose();
    };

    // Navigation is filtered by role. This is presentation only — hiding a link
    // does not protect the route; the API enforces permissions on every call.
    const canSeeOperations = isAdmin() || isOperations();
    const canSeeFinance = isFinance();
    const canSeeAdminOnly = isAdmin();

    const mainNavItems = [
        { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, show: true },
        { name: t('employees'), href: '/dashboard/employees', icon: Users, show: canSeeOperations },
        { name: t('customers'), href: '/dashboard/customers', icon: Building2, show: canSeeOperations },
        { name: t('projects'), href: '/dashboard/projects', icon: FolderKanban, show: canSeeOperations },
        { name: t('Services'), href: '/dashboard/services', icon: CreditCard, show: canSeeOperations },
        { name: t('worklogs'), href: '/dashboard/worklogs', icon: Clock, show: canSeeOperations },
        { name: t('Weekly Board'), href: '/dashboard/weekly-board', icon: Calendar, show: canSeeOperations },
        { name: t('Certificates'), href: '/dashboard/certificates', icon: Award, show: canSeeOperations },
        { name: t('Allowances'), href: '/dashboard/allowances', icon: Gift, show: canSeeAdminOnly },
        { name: t('Contract Types'), href: '/dashboard/contract-types', icon: FileText, show: canSeeAdminOnly },
        { name: t('Agencies'), href: '/dashboard/agencies', icon: Building2, show: canSeeAdminOnly },
        { name: t('Day Payment Types'), href: '/dashboard/surcharge-types', icon: Clock, show: canSeeAdminOnly },
    ].filter(item => item.show);

    // HR submenu — backed by /api/hr/.
    const hrItems = [
        { name: t('Leave Requests'), href: '/dashboard/hr/leave-requests', icon: CalendarDays, show: canSeeOperations },
        { name: t('Attendance'), href: '/dashboard/hr/attendance', icon: Clock, show: canSeeOperations },
        { name: t('Payroll'), href: '/dashboard/hr/payroll', icon: CreditCard, show: canSeeFinance },
        { name: t('Contracts'), href: '/dashboard/hr/contracts', icon: FileText, show: canSeeOperations },
    ].filter(item => item.show);

    // Collapsible groups, declared as data so the sidebar can both render them
    // and work out which one owns the current route.
    const navGroups = [
        {
            id: 'backoffice',
            label: t('invoices'),
            icon: FileText,
            get items() { return invoiceItems; },
            activePrefixes: ['/dashboard/invoices', '/dashboard/incoming-invoices',
                             '/dashboard/agency-invoices'],
        },
        {
            id: 'hr',
            label: t('HR'),
            icon: CalendarDays,
            get items() { return hrItems; },
            activePrefixes: ['/dashboard/hr'],
        },
        {
            id: 'finance',
            label: t('Finance'),
            icon: Wallet,
            get items() { return financeItems; },
            activePrefixes: ['/dashboard/expenses', '/dashboard/finance', '/dashboard/reports'],
        },
    ];

    // Backoffice submenu items
    const invoiceItems = [
        { name: t('Outgoing Invoices'), href: '/dashboard/invoices', icon: FileText, show: canSeeFinance },
        { name: t('Incoming Invoices'), href: '/dashboard/incoming-invoices', icon: FileText, show: canSeeFinance },
        { name: t('Agency Invoices'), href: '/dashboard/agency-invoices', icon: Building2, show: canSeeFinance },
    ].filter(item => item.show);

    // Finance submenu items
    const financeItems = [
        { name: t('Expenses'), href: '/dashboard/expenses', icon: Receipt, show: canSeeFinance },
        { name: t('Financial Overview'), href: '/dashboard/finance/overview', icon: BarChart3, show: canSeeFinance },
        { name: t('BTW Aangifte'), href: '/dashboard/finance/vat', icon: FileText, show: canSeeFinance },
        { name: t('Expenses Summary'), href: '/dashboard/finance', icon: Receipt, show: canSeeFinance },
        { name: t('Reports'), href: '/dashboard/reports', icon: BarChart3, show: canSeeFinance },
    ].filter(item => item.show);

    const toggleSubmenu = (menuName: string) => {
        setExpandedMenus(prev => {
            const next = prev.includes(menuName)
                ? prev.filter(m => m !== menuName)
                : [...prev, menuName];
            sessionStorage.setItem('sidebarExpandedMenus', JSON.stringify(next));
            return next;
        });
    };

    // Settings section items
    const settingsNavItems = [
        { name: t('Notifications'), href: '/dashboard/notifications', icon: Bell },
        { name: t('wallet'), href: '/dashboard/wallet', icon: CircleDollarSign },
        { name: t('settings'), href: '/dashboard/settings', icon: Settings },
    ];

    const handleLogout = () => {
        clearTokens();
        router.replace('/login');
    };

    const sidebarWidth = isCollapsed ? 88 : 300;

    interface NavEntry {
        name: string;
        href: string;
        icon: LucideIcon;
    }

    /**
     * A collapsible group of nav links.
     *
     * The Backoffice and Finance groups were ~85 lines of identical inline-styled
     * markup each; adding HR would have made a third copy. Renders nothing when
     * `items` is empty, so a role with no entries in a group never sees it.
     */
    const SubMenu = ({
        id,
        label,
        icon: Icon,
        items,
        activePrefixes,
    }: {
        id: string;
        label: string;
        icon: LucideIcon;
        items: NavEntry[];
        activePrefixes: string[];
    }) => {
        if (items.length === 0) return null;

        const isExpanded = expandedMenus.includes(id);
        const isSectionActive = activePrefixes.some(prefix => pathname.startsWith(prefix));
        const highlighted = isExpanded || isSectionActive;

        return (
            <div>
                <button
                    onClick={() => toggleSubmenu(id)}
                    title={isCollapsed ? label : undefined}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCollapsed ? '0' : '14px',
                        width: isCollapsed ? '56px' : '100%',
                        margin: isCollapsed ? '0 auto' : '0',
                        padding: isCollapsed ? '12px' : '12px 20px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        borderRadius: '12px',
                        transition: 'all 0.15s ease',
                        backgroundColor: highlighted ? '#F3F4F6' : 'transparent',
                        color: highlighted ? '#1F2937' : '#6B7280',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none'
                    }}
                    className="hover:bg-gray-100"
                >
                    <Icon size={20} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    {!isCollapsed && (
                        <>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: isExpanded ? 600 : 500,
                                flex: 1,
                                textAlign: 'left'
                            }}>
                                {label}
                            </span>
                            <ChevronDown size={14} style={{
                                transition: 'transform 0.2s',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)'
                            }} />
                        </>
                    )}
                </button>

                {!isCollapsed && isExpanded && (
                    <div style={{
                        marginLeft: '20px',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}>
                        {items.map((subItem) => {
                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href);
                            return (
                                <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={handleNavClick}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        transition: 'all 0.15s ease',
                                        backgroundColor: isSubActive ? '#E5E7EB' : 'transparent',
                                        color: isSubActive ? '#1F2937' : '#6B7280',
                                        textDecoration: 'none',
                                        fontSize: '13px',
                                        fontWeight: isSubActive ? 600 : 500
                                    }}
                                    className="hover:bg-gray-100"
                                >
                                    <subItem.icon size={16} strokeWidth={1.5} />
                                    {subItem.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const NavItem = ({ item }: { item: { name: string; href: string; icon: LucideIcon } }) => {
        const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
            <Link
                href={item.href}
                onClick={handleNavClick}
                scroll={false}
                title={isCollapsed ? item.name : undefined}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '16px',
                    padding: isCollapsed ? '14px' : '14px 20px',
                    borderRadius: '14px',
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive ? '#F3F4F6' : 'transparent',
                    color: isActive ? '#1F2937' : '#6B7280',
                    textDecoration: 'none',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    width: isCollapsed ? '56px' : '100%',
                    margin: isCollapsed ? '0 auto' : '0'
                }}
                className="hover:bg-gray-100"
            >
                <item.icon
                    size={24}
                    strokeWidth={1.5}
                    style={{ flexShrink: 0 }}
                />
                {!isCollapsed && (
                    <span style={{
                        fontSize: '15px',
                        fontWeight: isActive ? 600 : 500,
                        letterSpacing: '-0.01em'
                    }}>
                        {item.name}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        zIndex: 40
                    }}
                    className="lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Wrapper */}
            <div
                className={cn(
                    "fixed z-50 transition-all duration-300",
                    isRTL ? "right-0 top-0 bottom-0" : "left-0 top-0 bottom-0",
                    isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full"),
                    "lg:translate-x-0"
                )}
                style={{ width: `${sidebarWidth}px` }}
            >
                {/* Sidebar Panel */}
                <aside style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    position: 'relative'
                }}>

                    {/* User Profile Section */}
                    <div style={{
                        flexShrink: 0,
                        padding: isCollapsed ? '32px 16px' : '28px 24px',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCollapsed ? '0' : '16px',
                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}>
                        {/* Avatar */}
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FB7185 0%, #EC4899 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '18px',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                        }}>
                            AD
                        </div>
                        {!isCollapsed && (
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginBottom: '4px'
                                }}>
                                    {t('Administrator')}
                                </p>
                                <h3 style={{
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: '#1F2937',
                                    margin: 0
                                }}>
                                    {t('Admin User')}
                                </h3>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav ref={navRef} style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: isCollapsed ? '24px 16px' : '24px 20px'
                    }}>
                        {/* MAIN Section */}
                        <p style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#9CA3AF',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            marginBottom: '16px',
                            paddingLeft: isCollapsed ? '0' : '20px',
                            textAlign: isCollapsed ? 'center' : 'left'
                        }}>
                            {t('Main')}
                        </p>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            {mainNavItems.map((item) => (
                                <NavItem key={item.href} item={item} />
                            ))}

                            {navGroups.map(group => (
                                <SubMenu
                                    key={group.id}
                                    id={group.id}
                                    label={group.label}
                                    icon={group.icon}
                                    items={group.items}
                                    activePrefixes={group.activePrefixes}
                                />
                            ))}
                        </div>
                        <div style={{ marginTop: '32px' }}>
                            <p style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#9CA3AF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                marginBottom: '16px',
                                paddingLeft: isCollapsed ? '0' : '20px',
                                textAlign: isCollapsed ? 'center' : 'left'
                            }}>
                                {t('Settings')}
                            </p>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                {settingsNavItems.map((item) => (
                                    <NavItem key={item.href} item={item} />
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Bottom Section */}
                    <div style={{
                        flexShrink: 0,
                        borderTop: '1px solid #F3F4F6',
                        padding: isCollapsed ? '20px 16px' : '20px 20px'
                    }}>
                        {/* Help */}
                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCollapsed ? '0' : '16px',
                                padding: isCollapsed ? '14px' : '14px 20px',
                                borderRadius: '14px',
                                transition: 'all 0.15s ease',
                                backgroundColor: 'transparent',
                                color: '#6B7280',
                                border: 'none',
                                cursor: 'pointer',
                                width: isCollapsed ? '56px' : '100%',
                                margin: isCollapsed ? '0 auto 8px' : '0 0 8px 0',
                                justifyContent: isCollapsed ? 'center' : 'flex-start'
                            }}
                            className="hover:bg-gray-100"
                            title={isCollapsed ? "Help" : undefined}
                        >
                            <HelpCircle size={24} strokeWidth={1.5} />
                            {!isCollapsed && (
                                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('Help')}</span>
                            )}
                        </button>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCollapsed ? '0' : '16px',
                                padding: isCollapsed ? '14px' : '14px 20px',
                                borderRadius: '14px',
                                transition: 'all 0.15s ease',
                                backgroundColor: 'transparent',
                                color: '#EF4444',
                                border: 'none',
                                cursor: 'pointer',
                                width: isCollapsed ? '56px' : '100%',
                                margin: isCollapsed ? '0 auto' : '0',
                                justifyContent: isCollapsed ? 'center' : 'flex-start'
                            }}
                            className="hover:bg-red-50"
                            title={isCollapsed ? "Logout Account" : undefined}
                        >
                            <LogOut size={24} strokeWidth={1.5} />
                            {!isCollapsed && (
                                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('Logout Account')}</span>
                            )}
                        </button>
                    </div>

                    {/* Toggle Button - On the edge */}
                    <button
                        onClick={onToggleCollapse}
                        style={{
                            position: 'absolute',
                            top: '32px',
                            [isRTL ? 'left' : 'right']: '-14px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '50%',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            transition: 'all 0.15s ease'
                        }}
                        className="hidden lg:flex hover:border-gray-300 hover:text-gray-600"
                    >
                        {isCollapsed ? (
                            <ChevronRight size={16} />
                        ) : (
                            <ChevronLeft size={16} />
                        )}
                    </button>
                </aside>
            </div>
        </>
    );
}

/* ============================================================================
   HEADER COMPONENT
   ============================================================================ */
function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { t, language, setLanguage, isRTL } = useLanguage();
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    // This list used to be hardcoded here without Dutch — the default language
    // and the company's own. Switching away from it was a one-way trip, and the
    // badge fell back to "EN" while the app was actually rendering Dutch.
    const languages = availableLanguages;

    const currentLang = languages.find(l => l.code === language) ?? languages[0];

    useEffect(() => {
        const handleClickOutside = () => setLangMenuOpen(false);
        if (langMenuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [langMenuOpen]);

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: '72px',
            backgroundColor: 'white',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            flexShrink: 0
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                    onClick={onMenuClick}
                    className="lg:hidden"
                    style={{
                        padding: '8px',
                        color: '#6B7280',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '8px'
                    }}
                >
                    <Menu size={24} />
                </button>
                <h1 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1F2937',
                    margin: 0
                }}>
                    {t('adminDashboard')}
                </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Language */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setLangMenuOpen(!langMenuOpen); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            color: '#6B7280',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '8px'
                        }}
                        className="hover:bg-gray-100"
                    >
                        <Globe size={18} />
                        <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
                        <ChevronDown
                            size={14}
                            style={{
                                transition: 'transform 0.15s ease',
                                transform: langMenuOpen ? 'rotate(180deg)' : 'rotate(0)'
                            }}
                        />
                    </button>

                    {langMenuOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                [isRTL ? 'left' : 'right']: 0,
                                marginTop: '8px',
                                width: '192px',
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                                border: '1px solid #F3F4F6',
                                padding: '8px 0',
                                zIndex: 50
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        fontSize: '14px',
                                        color: '#374151',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    className="hover:bg-gray-50"
                                >
                                    <span>{lang.flag}</span>
                                    <span style={{ flex: 1 }}>{lang.label}</span>
                                    {lang.code === language && <Check size={16} style={{ color: '#1F2937' }} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <Link
                    href="/dashboard/notifications"
                    style={{
                        position: 'relative',
                        padding: '8px',
                        color: '#6B7280',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    className="hover:bg-gray-100"
                >
                    <Bell size={20} />
                    <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#EF4444',
                        borderRadius: '50%'
                    }} />
                </Link>

                {/* User */}
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FB7185 0%, #EC4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                }}>
                    AD
                </div>
            </div>
        </header>
    );
}

/* ============================================================================
   DASHBOARD LAYOUT
   ============================================================================ */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { isRTL } = useLanguage();

    const sidebarWidth = sidebarCollapsed ? 88 : 300;
    const gapBetweenSidebarAndContent = 40;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content */}
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    [isRTL ? 'marginRight' : 'marginLeft']: `${sidebarWidth + gapBetweenSidebarAndContent}px`,
                    [isRTL ? 'marginLeft' : 'marginRight']: '32px'
                }}
            >
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main id="main-content" style={{
                    flex: 1,
                    padding: '32px 0'
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
