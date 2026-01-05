'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Check if logged in
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
        } else {
            api.setToken(token);
            setIsReady(true);
        }
    }, [router]);

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
