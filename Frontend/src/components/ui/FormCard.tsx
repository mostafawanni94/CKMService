'use client';

import { ReactNode } from 'react';

interface FormCardProps {
    title: string;
    icon: ReactNode;
    iconBgColor?: string;
    subtitle?: string;
    headerRight?: ReactNode;
    children: ReactNode;
}

/**
 * Reusable card component for form sections.
 * Provides consistent styling across Create and Edit pages.
 */
export function FormCard({
    title,
    icon,
    iconBgColor = '#EFF6FF',
    subtitle,
    headerRight,
    children
}: FormCardProps) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #E5E7EB',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '10px',
                        backgroundColor: iconBgColor,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {icon}
                    </div>
                    <div>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: '#111827',
                            margin: 0
                        }}>
                            {title}
                        </h2>
                        {subtitle && (
                            <p style={{
                                fontSize: '13px',
                                color: '#6B7280',
                                margin: 0
                            }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                {headerRight}
            </div>
            {children}
        </div>
    );
}

// Common input style
export const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    outline: 'none',
    backgroundColor: '#FAFAFA',
    boxSizing: 'border-box',
};

// Common label style
export const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
};
