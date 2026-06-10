'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            api.setToken(token);
            router.push('/dashboard');
        }
    }, [router]);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { access, refresh } = await api.login(email, password);
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#1E3A5F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            {/* Login Card - SOLID WHITE */}
            <div style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                padding: '40px'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#1E3A5F',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>CKM</span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        CKM Services
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        Admin Dashboard Login
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '16px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '14px', color: '#991b1b' }}>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    {/* Email Field */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@ckmservices.nl"
                            required
                            autoFocus
                            style={{
                                width: '100%',
                                height: '48px',
                                padding: '0 16px',
                                fontSize: '14px',
                                color: '#111827',
                                backgroundColor: '#ffffff',
                                border: '1px solid #d1d5db',
                                borderRadius: '10px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    padding: '0 48px 0 16px',
                                    fontSize: '14px',
                                    color: '#111827',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '10px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '4px',
                                    color: '#6b7280',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '15px',
                            fontWeight: '500',
                            color: '#ffffff',
                            backgroundColor: '#1E3A5F',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Help Text */}
                <div style={{
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        Use your admin account to sign in.
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        Need help?{' '}
                        <a href="mailto:info@ckmservices.nl" style={{ color: '#1E3A5F', fontWeight: '500' }}>
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>

            {/* CSS for spinner animation */}
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
