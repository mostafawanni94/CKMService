'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { Card, Button } from '@/components/ui';
import { api, Advance } from '@/lib/api';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface WalletEmployee {
    id: string;
    name: string;
    balance: number;
}

export default function WalletPage() {
    const [pendingAdvances, setPendingAdvances] = useState<Advance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const advances = await api.getPendingAdvances();
            setPendingAdvances(advances || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    }

    async function handleApproveAdvance(id: string) {
        try {
            await api.approveAdvance(id);
            await loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to approve advance');
        }
    }

    async function handleRejectAdvance(id: string) {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            await api.rejectAdvance(id, reason);
            await loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to reject advance');
        }
    }

    const totalPending = pendingAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
                    <p className="text-gray-500">Manage employee balances and advance requests</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Advances</p>
                                <p className="text-xl font-bold">{pendingAdvances.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Amount</p>
                                <p className="text-xl font-bold">€{totalPending.toFixed(2)}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">View All</p>
                                <p className="text-sm text-blue-600 font-medium">See employee wallets in admin panel</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Pending Advance Requests */}
                {error ? (
                    <Card className="p-8 text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={loadData}>Retry</Button>
                    </Card>
                ) : pendingAdvances.length === 0 ? (
                    <Card className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                        <p className="text-gray-500">No pending advance requests. All caught up!</p>
                    </Card>
                ) : (
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-600" />
                            Pending Advance Requests
                        </h2>
                        <div className="space-y-3">
                            {pendingAdvances.map((advance) => (
                                <div key={advance.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div>
                                        <p className="font-medium">{advance.employee_name}</p>
                                        <p className="text-sm text-gray-500">{advance.created_at} · {advance.reason}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-bold">€{(advance.amount || 0).toFixed(2)}</span>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleApproveAdvance(advance.id)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleRejectAdvance(advance.id)}
                                                className="border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
