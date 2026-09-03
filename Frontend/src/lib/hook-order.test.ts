import { describe, it, expect } from 'vitest';

/**
 * `const { t } = useLanguage()` is a block-scoped binding, so any use of `t`
 * above it throws "Cannot access 't' before initialization" the moment the
 * component renders.
 *
 * TypeScript does not catch it when the use sits inside a callback — a
 * `.map(o => t(o.label))` looks deferred to the compiler even though `.map`
 * runs immediately — and a route smoke test does not catch it either, because
 * a client component that throws in the browser still serves a 200 shell.
 * That combination let twelve broken pages through, so this checks the order
 * directly.
 */
describe('hook ordering', () => {
    const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
        eager: true, query: '?raw', import: 'default',
    }) as Record<string, string>;

    it('never uses t() above the useLanguage() that defines it', () => {
        const binding = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\s*\(\s*\)/;
        const offenders: string[] = [];

        for (const [file, source] of Object.entries(sources)) {
            if (file.includes('.test.') || file.endsWith('i18n.tsx')) continue;
            const bound = source.match(binding);
            if (!bound) continue;

            // Strip comments so a mention of t( in prose does not count.
            const code = source
                .replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length))
                .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length));

            // Not just t('literal') — the bug that shipped passed a variable,
            // t(o.label), which a quote-anchored search walks straight past.
            const firstUse = code.search(/\bt\s*\(/);
            if (firstUse !== -1 && firstUse < bound.index!) {
                const line = source.slice(0, firstUse).split('\n').length;
                offenders.push(`${file}:${line}`);
            }
        }

        expect(offenders, 't() used before useLanguage()').toEqual([]);
    });
});
