'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================================
   BUTTON COMPONENT - Professional Style
   ============================================================================ */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 500,
            borderRadius: '10px',
            border: '1px solid transparent',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            opacity: disabled || loading ? 0.6 : 1,
            transition: 'all 0.15s ease',
            ...style
        };

        const variantStyles: Record<string, React.CSSProperties> = {
            primary: { backgroundColor: '#1E3A5F', color: '#ffffff', borderColor: 'transparent' },
            secondary: { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' },
            outline: { backgroundColor: '#ffffff', color: '#374151', borderColor: '#d1d5db' },
            ghost: { backgroundColor: 'transparent', color: '#374151', borderColor: 'transparent' },
            danger: { backgroundColor: '#dc2626', color: '#ffffff', borderColor: 'transparent' },
        };

        const sizeStyles: Record<string, React.CSSProperties> = {
            sm: { height: '36px', padding: '0 14px', fontSize: '13px' },
            md: { height: '44px', padding: '0 18px', fontSize: '14px' },
            lg: { height: '52px', padding: '0 24px', fontSize: '15px' },
        };

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                style={{ ...baseStyle, ...variantStyles[variant], ...sizeStyles[size] }}
                className={className}
                {...props}
            >
                {loading && (
                    <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                )}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

/* ============================================================================
   CARD COMPONENTS - Solid White Background
   ============================================================================ */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                ...style
            }}
            className={className}
            {...props}
        />
    )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', ...style }}
            className={className}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, style, ...props }, ref) => (
        <h3
            ref={ref}
            style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0, ...style }}
            className={className}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, style, ...props }, ref) => (
        <p
            ref={ref}
            style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', ...style }}
            className={className}
            {...props}
        />
    )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{ padding: '24px', ...style }}
            className={className}
            {...props}
        />
    )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{
                padding: '16px 24px',
                backgroundColor: '#f9fafb',
                borderTop: '1px solid #f3f4f6',
                borderRadius: '0 0 12px 12px',
                ...style
            }}
            className={className}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';

/* ============================================================================
   INPUT COMPONENT
   ============================================================================ */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = 'text', style, ...props }, ref) => (
        <input
            type={type}
            ref={ref}
            style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                ...style
            }}
            className={className}
            {...props}
        />
    )
);
Input.displayName = 'Input';

/* ============================================================================
   TEXTAREA COMPONENT
   ============================================================================ */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, style, ...props }, ref) => (
        <textarea
            ref={ref}
            style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px 14px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                outline: 'none',
                resize: 'vertical',
                ...style
            }}
            className={className}
            {...props}
        />
    )
);
Textarea.displayName = 'Textarea';

/* ============================================================================
   SELECT COMPONENT
   ============================================================================ */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, style, ...props }, ref) => (
        <select
            ref={ref}
            style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                fontSize: '14px',
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                outline: 'none',
                ...style
            }}
            className={className}
            {...props}
        >
            {children}
        </select>
    )
);
Select.displayName = 'Select';

/* ============================================================================
   BADGE COMPONENT
   ============================================================================ */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
}

export const Badge = ({ className, variant = 'default', style, ...props }: BadgeProps) => {
    const variants: Record<string, React.CSSProperties> = {
        default: { backgroundColor: 'rgba(30, 58, 95, 0.1)', color: '#1E3A5F' },
        success: { backgroundColor: '#dcfce7', color: '#166534' },
        warning: { backgroundColor: '#fef3c7', color: '#92400e' },
        danger: { backgroundColor: '#fee2e2', color: '#991b1b' },
        secondary: { backgroundColor: '#f3f4f6', color: '#4b5563' },
    };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '6px',
                ...variants[variant],
                ...style
            }}
            className={className}
            {...props}
        />
    );
};

/* ============================================================================
   AVATAR COMPONENT
   ============================================================================ */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, size = 'md', style, ...props }, ref) => {
        const sizes = { sm: 32, md: 40, lg: 48 };
        const fontSizes = { sm: 12, md: 14, lg: 16 };

        return (
            <div
                ref={ref}
                style={{
                    width: sizes[size],
                    height: sizes[size],
                    backgroundColor: '#1E3A5F',
                    color: '#ffffff',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: fontSizes[size],
                    ...style
                }}
                className={className}
                {...props}
            />
        );
    }
);
Avatar.displayName = 'Avatar';

export const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={className} {...props} />
    )
);
AvatarFallback.displayName = 'AvatarFallback';

/* ============================================================================
   SKELETON COMPONENT
   ============================================================================ */
export const Skeleton = ({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        style={{ backgroundColor: '#e5e7eb', borderRadius: '8px', animation: 'pulse 2s ease-in-out infinite', ...style }}
        className={className}
        {...props}
    />
);

/* ============================================================================
   LOADING COMPONENT
   ============================================================================ */
export const Loading = ({ className }: { className?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }} className={className}>
        <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#1E3A5F',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
    </div>
);

/* ============================================================================
   EMPTY STATE COMPONENT
   ============================================================================ */
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        {icon && <div style={{ marginBottom: '16px', color: '#9ca3af' }}>{icon}</div>}
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{title}</h3>
        {description && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{description}</p>}
        {action}
    </div>
);

/* ============================================================================
   ALERT COMPONENT
   ============================================================================ */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'danger';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant = 'info', children, style, ...props }, ref) => {
        const variants: Record<string, React.CSSProperties> = {
            info: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' },
            success: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' },
            warning: { backgroundColor: '#fefce8', borderColor: '#fef08a', color: '#854d0e' },
            danger: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' },
        };

        return (
            <div
                ref={ref}
                style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    fontSize: '14px',
                    ...variants[variant],
                    ...style
                }}
                className={className}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Alert.displayName = 'Alert';

/* ============================================================================
   STAT CARD COMPONENT
   ============================================================================ */
interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    iconBg?: string;
    iconColor?: string;
    action?: React.ReactNode;
}

export const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    iconBg = '#eff6ff',
    iconColor = '#1E3A5F',
    action
}: StatCardProps) => (
    <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>{title}</p>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '8px 0 0 0' }}>{value}</p>
                {subtitle && <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>{subtitle}</p>}
            </div>
            {icon && (
                <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: iconBg,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconColor
                }}>
                    {icon}
                </div>
            )}
        </div>
        {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
);

/* ============================================================================
   PAGE HEADER COMPONENT
   ============================================================================ */
interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
    <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
    }}>
        <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h1>
            {description && <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>{description}</p>}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{actions}</div>}
    </div>
);
