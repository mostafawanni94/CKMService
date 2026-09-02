'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { setSessionExpiredHandler } from '@/hooks/useApi';
import { clearTokens, hasSession, isBackOffice, isTokenExpired } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';

/**
 * Client-side session gate for the dashboard.
 *
 * This used to check only that *some* string sat in localStorage, so an
 * expired token, a token belonging to an employee, or a hand-typed value all
 * rendered the full admin dashboard. It now checks expiry and role, and
 * registers the handler that signs the user out when a refresh finally fails.
 *
 * This is presentation only. `middleware.ts` blocks unauthenticated navigation
 * at the edge, and every API endpoint enforces its own permissions server-side.
 */
export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { t } = useLanguage();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const signOut = (reason: string) => {
            clearTokens();
            router.replace(`/login?reason=${reason}`);
        };

        // A refresh failure anywhere in the app lands here.
        setSessionExpiredHandler(() => signOut('expired'));

        if (!hasSession()) {
            signOut('required');
            return;
        }

        // An expired access token is fine as long as a refresh token remains —
        // the first API call will renew it transparently.
        if (isTokenExpired() && !hasSession()) {
            signOut('expired');
            return;
        }

        // The dashboard is for internal roles. Employees and customer-portal
        // users have their own mobile apps and get no useful page here.
        if (!isBackOffice()) {
            signOut('forbidden');
            return;
        }

        // Reading localStorage is only possible after mount, so the gate has to
        // resolve in an effect. This runs once and settles; it is not a
        // cascading render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsReady(true);
        return () => setSessionExpiredHandler(null);
    }, [router]);

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">{t('Loading...')}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
