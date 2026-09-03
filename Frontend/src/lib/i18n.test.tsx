import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { availableLanguages, LanguageProvider, useLanguage } from './i18n';
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

    it('covers every phrase in every language, so no language lags behind', () => {
        // Screens were authored in English or in Dutch, so both are key spaces.
        // A key never needs a translation into the language it is written in.
        // phrases.nl is keyed by the English source strings, phrases.en by the
        // Dutch ones. Dutch and English each already read correctly in their own
        // key space, so only the other languages must cover both.
        const all = [...new Set([...Object.keys(phrases.nl), ...Object.keys(phrases.en)])];
        for (const lang of ['ar', 'ru', 'uk']) {
            const missing = all.filter(k => !(k in phrases[lang]));
            expect(missing, `${lang} is missing translations`).toEqual([]);
        }
    });

    it('offers every supported language, Dutch included', () => {
        // The header used to hardcode four languages and omit Dutch — the
        // default and the company's own — so leaving it was a one-way trip.
        const codes = availableLanguages.map(l => l.code);
        expect(codes).toContain('nl');
        expect(new Set(codes)).toEqual(new Set(['nl', 'en', 'ar', 'ru', 'uk']));
        for (const language of availableLanguages) {
            expect(language.label.trim(), `${language.code} label`).not.toBe('');
            expect(language.flag.trim(), `${language.code} flag`).not.toBe('');
        }
    });

    it('keeps each table in its own script', () => {
        const SCRIPTS: Record<string, RegExp> = {
            nl: /[\u0600-\u06FF\u0400-\u04FF]/,
            en: /[\u0600-\u06FF\u0400-\u04FF]/,
            ar: /[\u0400-\u04FF]/,
            ru: /[\u0600-\u06FF]/,
            uk: /[\u0600-\u06FF]/,
        };
        for (const [lang, forbidden] of Object.entries(SCRIPTS)) {
            for (const [key, value] of Object.entries(phrases[lang])) {
                expect(forbidden.test(value), `${lang}: ${key} -> ${value}`).toBe(false);
            }
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
