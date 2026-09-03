/**
 * Employee shared helper components — Card, Field, TimelineRow, DocSlot.
 * These are used across multiple tabs in the employee detail page.
 */
'use client';

import React, { useRef } from 'react';
import { FileText, Eye, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

// ─── Constants ──────────────────────────────────────────────

export const LICENSE_CATEGORIES = [
  { code: 'AM', icon: '🛵' }, { code: 'A1', icon: '🏍️' }, { code: 'A2', icon: '🏍️' }, { code: 'A', icon: '🏍️' },
  { code: 'B1', icon: '🚗' }, { code: 'B', icon: '🚗' }, { code: 'C1', icon: '🚛' }, { code: 'C', icon: '🚛' },
  { code: 'D1', icon: '🚌' }, { code: 'D', icon: '🚌' }, { code: 'BE', icon: '🚗' }, { code: 'C1E', icon: '🚛' },
  { code: 'CE', icon: '🚛' }, { code: 'D1E', icon: '🚌' }, { code: 'DE', icon: '🚌' }, { code: 'T', icon: '🚜' },
];

export const COUNTRIES = ['Netherlands', 'Germany', 'Belgium', 'France', 'United Kingdom', 'Spain', 'Italy', 'Poland', 'Turkey', 'Morocco', 'Syria', 'Iraq', 'Other'];

export const NATIONALITIES = [
  { name: 'Netherlands', flag: '🇳🇱' }, { name: 'Germany', flag: '🇩🇪' }, { name: 'Belgium', flag: '🇧🇪' },
  { name: 'France', flag: '🇫🇷' }, { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'Spain', flag: '🇪🇸' },
  { name: 'Italy', flag: '🇮🇹' }, { name: 'Poland', flag: '🇵🇱' }, { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Greece', flag: '🇬🇷' }, { name: 'Romania', flag: '🇷🇴' }, { name: 'Bulgaria', flag: '🇧🇬' },
  { name: 'Hungary', flag: '🇭🇺' }, { name: 'Czech Republic', flag: '🇨🇿' }, { name: 'Austria', flag: '🇦🇹' },
  { name: 'Sweden', flag: '🇸🇪' }, { name: 'Denmark', flag: '🇩🇰' }, { name: 'Finland', flag: '🇫🇮' },
  { name: 'Norway', flag: '🇳🇴' }, { name: 'Ireland', flag: '🇮🇪' }, { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Turkey', flag: '🇹🇷' }, { name: 'Morocco', flag: '🇲🇦' }, { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Tunisia', flag: '🇹🇳' }, { name: 'Egypt', flag: '🇪🇬' }, { name: 'Libya', flag: '🇱🇾' },
  { name: 'Syria', flag: '🇸🇾' }, { name: 'Iraq', flag: '🇮🇶' }, { name: 'Iran', flag: '🇮🇷' },
  { name: 'Lebanon', flag: '🇱🇧' }, { name: 'Jordan', flag: '🇯🇴' }, { name: 'Palestine', flag: '🇵🇸' },
  { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Kuwait', flag: '🇰🇼' }, { name: 'Qatar', flag: '🇶🇦' }, { name: 'Oman', flag: '🇴🇲' },
  { name: 'Bahrain', flag: '🇧🇭' }, { name: 'Yemen', flag: '🇾🇪' }, { name: 'Afghanistan', flag: '🇦🇫' },
  { name: 'Pakistan', flag: '🇵🇰' }, { name: 'India', flag: '🇮🇳' }, { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Sri Lanka', flag: '🇱🇰' }, { name: 'Nepal', flag: '🇳🇵' }, { name: 'China', flag: '🇨🇳' },
  { name: 'Japan', flag: '🇯🇵' }, { name: 'South Korea', flag: '🇰🇷' }, { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Thailand', flag: '🇹🇭' }, { name: 'Philippines', flag: '🇵🇭' }, { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Malaysia', flag: '🇲🇾' }, { name: 'Singapore', flag: '🇸🇬' }, { name: 'Russia', flag: '🇷🇺' },
  { name: 'Ukraine', flag: '🇺🇦' }, { name: 'Belarus', flag: '🇧🇾' }, { name: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Uzbekistan', flag: '🇺🇿' }, { name: 'Azerbaijan', flag: '🇦🇿' }, { name: 'Georgia', flag: '🇬🇪' },
  { name: 'Armenia', flag: '🇦🇲' }, { name: 'United States', flag: '🇺🇸' }, { name: 'Canada', flag: '🇨🇦' },
  { name: 'Mexico', flag: '🇲🇽' }, { name: 'Brazil', flag: '🇧🇷' }, { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Colombia', flag: '🇨🇴' }, { name: 'Peru', flag: '🇵🇪' }, { name: 'Chile', flag: '🇨🇱' },
  { name: 'Venezuela', flag: '🇻🇪' }, { name: 'Ecuador', flag: '🇪🇨' }, { name: 'Cuba', flag: '🇨🇺' },
  { name: 'South Africa', flag: '🇿🇦' }, { name: 'Nigeria', flag: '🇳🇬' }, { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Kenya', flag: '🇰🇪' }, { name: 'Ethiopia', flag: '🇪🇹' }, { name: 'Somalia', flag: '🇸🇴' },
  { name: 'Eritrea', flag: '🇪🇷' }, { name: 'Sudan', flag: '🇸🇩' }, { name: 'Cameroon', flag: '🇨🇲' },
  { name: 'Congo', flag: '🇨🇬' }, { name: 'Senegal', flag: '🇸🇳' }, { name: 'Australia', flag: '🇦🇺' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Stateless', flag: '🏳️' }, { name: 'Other', flag: '🌍' },
];

export const DOCUMENT_TYPES = [
  { id: 1, name: 'Passport' }, { id: 2, name: 'ID Card' }, { id: 3, name: 'Residence Permit' },
];

// ─── Card Component ─────────────────────────────────────────

const ICON_BG_COLORS: Record<string, string> = {
  'bg-blue-50': '#EFF6FF', 'bg-green-50': '#F0FDF4', 'bg-amber-50': '#FFFBEB',
  'bg-purple-50': '#FAF5FF', 'bg-indigo-50': '#EEF2FF', 'bg-orange-50': '#FFF7ED',
  'bg-teal-50': '#F0FDFA'
};
const ICON_TEXT_COLORS: Record<string, string> = {
  'text-blue-600': '#2563EB', 'text-green-600': '#16A34A', 'text-amber-600': '#D97706',
  'text-purple-600': '#9333EA', 'text-indigo-600': '#4F46E5', 'text-orange-600': '#EA580C',
  'text-teal-600': '#0D9488'
};

interface CardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, icon: Icon, iconColor, iconBg, badge, children }: CardProps) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '10px', backgroundColor: ICON_BG_COLORS[iconBg] || '#EFF6FF',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon style={{ width: '20px', height: '20px', color: ICON_TEXT_COLORS[iconColor] || '#2563EB' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h3>
        </div>
        {badge}
      </div>
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

// ─── Field Component ────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string | undefined | null;
  editing: boolean;
  onChange?: (v: string) => void;
  type?: 'text' | 'date' | 'number' | 'select';
  options?: string[];
  optionLabels?: Record<string, string>;
  optionObjects?: { name: string; flag?: string }[];
}

const fieldLabelStyle = {
  display: 'block' as const, fontSize: '12px', fontWeight: 600,
  color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' as const
};
const fieldInputStyle = {
  width: '100%', padding: '12px 16px', backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', outline: 'none'
};

export function Field({ label, value, editing, onChange, type = 'text', options = [], optionLabels = {}, optionObjects = [] }: FieldProps) {
    const { t } = useLanguage();
  if (editing && onChange) {
    if (type === 'select') {
      if (optionObjects.length > 0) {
        return (
          <div>
            <label style={fieldLabelStyle}>{label}</label>
            <select value={value || ''} onChange={e => onChange(e.target.value)} style={fieldInputStyle}>
              <option value="">{t('Select...')}</option>
              {optionObjects.map(o => <option key={o.name} value={o.name}>{o.flag ? `${o.flag} ${o.name}` : o.name}</option>)}
            </select>
          </div>
        );
      }
      return (
        <div>
          <label style={fieldLabelStyle}>{label}</label>
          <select value={value || ''} onChange={e => onChange(e.target.value)} style={fieldInputStyle}>
            <option value="">{t('Select...')}</option>
            {options.map(o => <option key={o} value={o}>{optionLabels[o] || o}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div>
        <label style={fieldLabelStyle}>{label}</label>
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={fieldInputStyle} />
      </div>
    );
  }

  let displayValue = value || '—';
  if (type === 'date' && value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      displayValue = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
  const flagObj = optionObjects.find(o => o.name === value);
  const displayWithFlag = flagObj?.flag ? `${flagObj.flag} ${displayValue}` : displayValue;

  return (
    <div style={{ padding: '4px 0' }}>
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '4px', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{optionObjects.length > 0 ? displayWithFlag : displayValue}</p>
    </div>
  );
}

// ─── TimelineRow ────────────────────────────────────────────

export function TimelineRow({ label, date }: { label: string; date: string | null | undefined }) {
  const fmt = date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '14px', color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{fmt}</span>
    </div>
  );
}

// ─── DocSlot ────────────────────────────────────────────────

interface DocSlotProps {
  title: string;
  url: string | null;
  field: string;
  accept: string;
  type?: 'image' | 'pdf';
  editing: boolean;
  uploading: boolean;
  onUpload: (field: string, file: File) => void;
  onDelete: (field: string) => void;
}

export function DocSlot({ title, url, field, accept, type = 'image', editing, uploading, onUpload, onDelete }: DocSlotProps) {
    const { t } = useLanguage();
  const ref = useRef<HTMLInputElement>(null);

  if (url) {
    return (
      <div className="relative group">
        <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1E3A5F]" />{title}
        </div>
        <div className="relative rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
          {type === 'image' ? (
            <div className="aspect-[3/2]"><img src={url} alt={title} className="w-full h-full object-cover" /></div>
          ) : (
            <div className="aspect-[3/2] flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-sm text-gray-500">{t('PDF Document')}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <a href={url} target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-gray-700" />
            </a>
            {editing && (
              <button onClick={() => onDelete(field)} className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#1E3A5F]" />{title}
      </div>
      <div
        onClick={() => editing && ref.current?.click()}
        className={`aspect-[4/3] rounded-2xl flex flex-col items-center justify-center p-6 transition-all ${editing
          ? 'bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 cursor-pointer shadow-sm'
          : 'bg-gray-50'}`}
      >
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(field, f); }} />
        {uploading ? (
          <div className="w-10 h-10 border-3 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${editing ? 'bg-[#1E3A5F]' : 'bg-gray-200'}`}>
              <Upload className={`w-7 h-7 ${editing ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <p className={`text-sm font-semibold mb-1 ${editing ? 'text-gray-800' : 'text-gray-400'}`}>{t('Tap to upload')}</p>
            <p className="text-xs text-gray-400">{type === 'pdf' ? 'PDF or Image' : 'Camera or Gallery'}</p>
          </>
        )}
      </div>
    </div>
  );
}
