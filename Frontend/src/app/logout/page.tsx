'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        // Clears both tokens, the legacy key names, and the session cookie.
        clearTokens();
        router.replace('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Signing out...</p>
            </div>
        </div>
    );
}
