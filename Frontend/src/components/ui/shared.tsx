/**
 * Shared UI Components — Reusable building blocks for all pages.
 * 
 * Each component is a small, focused, pure function that accepts props.
 * No data fetching or business logic here.
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { colors, spacing, radius, fontSize, fontWeight, presets, shadows } from '@/styles/tokens';

// ═══════════════════════════════════════════════════════════════
// BUTTON
// ═══════════════════════════════════════════════════════════════

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

const BUTTON_VARIANTS: Record<string, React.CSSProperties> = {
  primary: { background: colors.primary, color: colors.white, border: 'none' },
  secondary: { background: colors.white, color: colors.textPrimary, border: `1.5px solid ${colors.border}` },
  danger: { background: colors.danger, color: colors.white, border: 'none' },
  ghost: { background: 'transparent', color: colors.textMuted, border: 'none' },
  success: { background: colors.success, color: colors.white, border: 'none' }
};

const BUTTON_SIZES: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: fontSize.sm },
  md: { padding: '10px 16px', fontSize: fontSize.md },
  lg: { padding: '12px 20px', fontSize: fontSize.base }
};

export function Button({
  children, onClick, variant = 'primary', size = 'md',
  icon, loading, disabled, type = 'button', style
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        borderRadius: radius.md, cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: fontWeight.semibold, transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        ...BUTTON_VARIANTS[variant],
        ...BUTTON_SIZES[size],
        ...style
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════

interface InputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function Input({
  label, value, onChange, type = 'text', placeholder,
  required, disabled, style, min, max, step
}: InputProps) {
  return (
    <div>
      {label && <label style={presets.label}>{label}{required && ' *'}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        style={{ ...presets.input, ...(disabled ? { opacity: 0.6 } : {}), ...style }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SELECT
// ═══════════════════════════════════════════════════════════════

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Select({
  label, value, onChange, options, placeholder,
  required, disabled, style
}: SelectProps) {
  return (
    <div>
      {label && <label style={presets.label}>{label}{required && ' *'}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={{ ...presets.input, cursor: 'pointer', ...style }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEXTAREA
// ═══════════════════════════════════════════════════════════════

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, required }: TextAreaProps) {
  return (
    <div>
      {label && <label style={presets.label}>{label}{required && ' *'}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        style={{ ...presets.input, resize: 'vertical' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════════════════

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  style?: React.CSSProperties;
}

export function Badge({ children, color = colors.textSecondary, bg = colors.bgAlt, style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderRadius: '20px',
      fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
      color, backgroundColor: bg, ...style
    }}>
      {children}
    </span>
  );
}

// Status badge preset map
export const STATUS_BADGE: Record<string, { color: string; bg: string }> = {
  draft: { color: '#6B7280', bg: '#F3F4F6' },
  pending: { color: '#D97706', bg: '#FEF3C7' },
  approved: { color: colors.success, bg: colors.successBg },
  rejected: { color: colors.danger, bg: colors.dangerBg },
  sent: { color: colors.info, bg: colors.infoBg },
  paid: { color: colors.success, bg: colors.successBg },
  partially_paid: { color: '#B45309', bg: '#FDE68A' },
  overdue: { color: colors.danger, bg: colors.dangerBg },
  cancelled: { color: '#9CA3AF', bg: '#F3F4F6' },
  active: { color: colors.success, bg: colors.successBg },
  inactive: { color: '#9CA3AF', bg: '#F3F4F6' },
  incomplete: { color: '#D97706', bg: '#FEF3C7' },
  complete: { color: colors.success, bg: colors.successBg },
  // Attendance states (HR)
  present: { color: colors.success, bg: colors.successBg },
  late: { color: '#D97706', bg: '#FEF3C7' },
  absent: { color: colors.danger, bg: colors.dangerBg },
  leave: { color: colors.info, bg: colors.infoBg },
  // Payroll / leave lifecycle
  expiring: { color: '#D97706', bg: '#FEF3C7' },
  expired: { color: colors.danger, bg: colors.dangerBg },
  disputed: { color: '#B45309', bg: '#FDE68A' }
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const preset = STATUS_BADGE[status] || STATUS_BADGE.draft;
  return <Badge color={preset.color} bg={preset.bg}>{label || status}</Badge>;
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  bgGradient?: string;
  borderColor?: string;
  subtitle?: string;
}

export function StatCard({
  label, value, icon, color = colors.primary,
  bgGradient, borderColor = colors.border, subtitle
}: StatCardProps) {
  return (
    <div style={{
      ...presets.card,
      background: bgGradient || colors.white,
      borderColor
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md }}>
        <span style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: fontSize.heading, fontWeight: fontWeight.extrabold, color, letterSpacing: '-1px' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: fontSize.sm, color, marginTop: spacing.xs, opacity: 0.8 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = '560px' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.white, borderRadius: radius.xxl,
          width, maxWidth: '95vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: shadows.xl
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: `${spacing.xl} ${spacing.xxl}`,
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h2 style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, margin: 0 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: spacing.sm, borderRadius: radius.md,
            color: colors.textMuted
          }}>
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: spacing.xxl, overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: spacing.md,
            padding: `${spacing.lg} ${spacing.xxl}`,
            borderTop: `1px solid ${colors.border}`
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE HEADER
// ═══════════════════════════════════════════════════════════════

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl }}>
      <div>
        <h1 style={presets.pageTitle}>{title}</h1>
        {subtitle && <p style={presets.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION CARD
// ═══════════════════════════════════════════════════════════════

interface SectionCardProps {
  title?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionCard({ title, icon, subtitle, children, actions, style }: SectionCardProps) {
  return (
    <div style={{ ...presets.card, ...style }}>
      {title && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: spacing.xl
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {icon}
            <div>
              <h3 style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, margin: 0 }}>{title}</h3>
              {subtitle && <p style={{ fontSize: fontSize.md, color: colors.textMuted, margin: 0 }}>{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB BAR
// ═══════════════════════════════════════════════════════════════

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{
      display: 'flex', gap: '2px',
      borderBottom: `2px solid ${colors.border}`,
      marginBottom: spacing.xxl
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 20px', fontSize: fontSize.base,
            fontWeight: active === tab.key ? fontWeight.bold : fontWeight.medium,
            color: active === tab.key ? colors.primary : colors.textMuted,
            background: 'transparent', border: 'none',
            borderBottom: active === tab.key ? `3px solid ${colors.primary}` : '3px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {tab.icon}{tab.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEARCH BAR
// ═══════════════════════════════════════════════════════════════

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function SearchBar({ value, onChange, placeholder = 'Search...', style }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={18} style={{
        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
        color: colors.textLight
      }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...presets.input,
          paddingLeft: '38px',
          width: '100%'
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════════════════════════════

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  onRowClick?: (item: T) => void;
  rowKey: (item: T) => string | number;
}

export function DataTable<T>({
  columns, data, loading, emptyIcon, emptyTitle = 'No data',
  emptySubtitle, onRowClick, rowKey
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: colors.textLight }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p>Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: colors.textLight }}>
        {emptyIcon}
        <p style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, marginTop: '12px' }}>{emptyTitle}</p>
        {emptySubtitle && <p style={{ fontSize: fontSize.md }}>{emptySubtitle}</p>}
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
          {columns.map(col => (
            <th key={col.key} style={{ ...presets.tableHeader, width: col.width, textAlign: col.align || 'left' }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr
            key={rowKey(item)}
            onClick={() => onRowClick?.(item)}
            style={{
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => { if (onRowClick) (e.currentTarget.style.background = colors.bgAlt); }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {columns.map(col => (
              <td key={col.key} style={{ ...presets.tableCell, textAlign: col.align || 'left' }}>
                {col.render(item)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl }}>
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<ChevronLeft size={16} />}>
        Prev
      </Button>
      <span style={{ fontSize: fontSize.md, color: colors.textMuted, padding: '0 12px' }}>
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next <ChevronRight size={16} />
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOADING SPINNER
// ═══════════════════════════════════════════════════════════════

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '100px', color: colors.textLight }}>
      <div style={{
        width: '40px', height: '40px',
        border: `3px solid ${colors.border}`, borderTopColor: colors.primary,
        borderRadius: '50%', animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: colors.textLight }}>
      {icon && <div style={{ marginBottom: '12px', opacity: 0.4 }}>{icon}</div>}
      <p style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.textMuted }}>{title}</p>
      {subtitle && <p style={{ fontSize: fontSize.md, marginTop: '4px' }}>{subtitle}</p>}
      {action && <div style={{ marginTop: spacing.xl }}>{action}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════════════════

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel, loading
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="420px" footer={
      <>
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>
    }>
      <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-start' }}>
        <AlertCircle size={24} color={variant === 'danger' ? colors.danger : colors.primary} />
        <p style={{ fontSize: fontSize.base, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM GRID
// ═══════════════════════════════════════════════════════════════

interface FormGridProps {
  columns?: number;
  children: React.ReactNode;
  gap?: string;
}

export function FormGrid({ columns = 2, children, gap = spacing.xl }: FormGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
      {children}
    </div>
  );
}
