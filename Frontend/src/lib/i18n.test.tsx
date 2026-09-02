import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './i18n';
import { phrases } from './phrases';

function Probe({ keys }: { keys: string[] }) {
    const { t, setLanguage, language } = useLanguage();
    return (
        <div>
            <span data-testid="lang">{language}</span>
            <span data-testid="out">{keys.map(k => t(k)).join('|')}</span>
            {['nl', 'en', 'ar', 'ru', 'uk'].map(l => (
                <button key={l} data-testid={`to-${l}`} onClick={() => setLanguage(l)}>{l}</button>
            ))}
        </div>
    );
}

function switchTo(lang: string) {
    act(() => { screen.getByTestId(`to-${lang}`).click(); });
}

describe('t()', () => {
    beforeEach(() => localStorage.clear());

    it('translates phrase keys per language', () => {
        render(<LanguageProvider><Probe keys={['Cancel', 'Employees']} /></LanguageProvider>);
        switchTo('nl');
        expect(screen.getByTestId('out').textContent).toBe('Annuleren|Medewerkers');
        switchTo('ru');
        expect(screen.getByTestId('out').textContent).toBe('Отмена|Сотрудники');
        switchTo('uk');
        expect(screen.getByTestId('out').textContent).toBe('Скасувати|Працівники');
    });

    it('returns the English phrase itself under English', () => {
        render(<LanguageProvider><Probe keys={['Cancel', 'Approve']} /></LanguageProvider>);
        switchTo('en');
        expect(screen.getByTestId('out').textContent).toBe('Cancel|Approve');
    });

    it('still resolves the original camelCase keys', () => {
        render(<LanguageProvider><Probe keys={['pendingApprovals']} /></LanguageProvider>);
        switchTo('en');
        expect(screen.getByTestId('out').textContent).toBe('Pending Approvals');
        switchTo('nl');
        expect(screen.getByTestId('out').textContent).not.toBe('pendingApprovals');
    });

    it('falls back to the phrase for anything untranslated', () => {
        render(<LanguageProvider><Probe keys={['Some Untranslated Heading']} /></LanguageProvider>);
        switchTo('nl');
        expect(screen.getByTestId('out').textContent).toBe('Some Untranslated Heading');
    });

    it('gives every non-English table the same keys, so no language lags behind', () => {
        const reference = Object.keys(phrases.nl).sort();
        for (const lang of ['ar', 'ru', 'uk']) {
            expect(Object.keys(phrases[lang]).sort(), `${lang} phrase coverage`).toEqual(reference);
        }
    });

    it('leaves no phrase untranslated in any table', () => {
        for (const [lang, table] of Object.entries(phrases)) {
            for (const [key, value] of Object.entries(table)) {
                expect(value.trim(), `${lang}: ${key}`).not.toBe('');
            }
        }
    });
});
