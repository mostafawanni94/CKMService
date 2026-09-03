'use client';

import { useLanguage } from '@/lib/i18n';

interface ListPagerProps {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    /** Page sizes offered; the first is the default elsewhere. */
    sizes?: number[];
}

/**
 * The pager for a server-paged list.
 *
 * It states the range and the total, because "1 / 8" alone does not tell the
 * reader how many records they are looking through — and on pages that also
 * show totals, that total covers every page, not the rows on screen.
 */
export function ListPager({
    page, totalPages, totalCount, pageSize,
    onPageChange, onPageSizeChange, sizes = [25, 50, 100, 200],
}: ListPagerProps) {
    const { t } = useLanguage();
    if (totalCount === 0) return null;

    const rangeStart = (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, totalCount);

    const button = (disabled: boolean) => ({
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 500,
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        background: '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
    });

    return (
        <nav
            aria-label={t('Paginering')}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '16px',
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
            }}
        >
            <span style={{ fontSize: '13px', color: '#6B7280' }} aria-live="polite">
                {rangeStart}–{rangeEnd} {t('of')} {totalCount}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    aria-label={t('Rows per page')}
                    style={{
                        padding: '6px 10px', fontSize: '13px',
                        border: '1px solid #E5E7EB', borderRadius: '8px',
                    }}
                >
                    {sizes.map(size => (
                        <option key={size} value={size}>{size} {t('per page')}</option>
                    ))}
                </select>

                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    style={button(page <= 1)}
                >
                    {t('Prev')}
                </button>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    style={button(page >= totalPages)}
                >
                    {t('Next')}
                </button>
            </div>
        </nav>
    );
}
