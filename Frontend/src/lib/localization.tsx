'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import translations
import en from '../locales/en.json';
import ar from '../locales/ar.json';
import uk from '../locales/uk.json';

type Language = 'en' | 'ar' | 'uk';

interface LanguageOption {
    code: Language;
    nativeName: string;
    englishName: string;
    isRTL: boolean;
}

export const languages: LanguageOption[] = [
    { code: 'en', nativeName: 'English', englishName: 'English', isRTL: false },
    { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', isRTL: true },
    { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', isRTL: false },
];

const translations: Record<Language, typeof en> = { en, ar, uk };

interface LocalizationContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof en) => string;
    isRTL: boolean;
    dir: 'ltr' | 'rtl';
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        // Load saved language from localStorage
        const saved = localStorage.getItem('language') as Language | null;
        if (saved && translations[saved]) {
            setLanguageState(saved);
        }
    }, []);

    useEffect(() => {
        // Update document direction for RTL languages
        const langConfig = languages.find(l => l.code === language);
        document.documentElement.dir = langConfig?.isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: keyof typeof en): string => {
        return translations[language]?.[key] || translations.en[key] || key;
    };

    const langConfig = languages.find(l => l.code === language);
    const isRTL = langConfig?.isRTL || false;
    const dir = isRTL ? 'rtl' : 'ltr';

    return (
        <LocalizationContext.Provider value={{ language, setLanguage, t, isRTL, dir }}>
            {children}
        </LocalizationContext.Provider>
    );
}

export function useLocalization() {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error('useLocalization must be used within LocalizationProvider');
    }
    return context;
}

// Language Selector Component
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
    const { language, setLanguage } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);

    const currentLang = languages.find(l => l.code === language);

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="text-sm font-medium">{language.toUpperCase()}</span>
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg ${lang.code === language ? 'bg-blue-50 text-blue-600' : ''
                                        }`}
                                >
                                    {lang.code === language && (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <div>
                                        <div className="font-medium">{lang.nativeName}</div>
                                        <div className="text-xs text-gray-500">{lang.englishName}</div>
                                    </div>
                                    {lang.isRTL && (
                                        <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">RTL</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="font-semibold">Language</span>
            </div>
            <div className="space-y-2">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full px-4 py-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${lang.code === language
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <div className="text-left flex-1">
                            <div className={`font-medium ${lang.code === language ? 'text-blue-600' : ''}`}>
                                {lang.nativeName}
                            </div>
                            <div className="text-sm text-gray-500">{lang.englishName}</div>
                        </div>
                        {lang.isRTL && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">RTL</span>
                        )}
                        {lang.code === language && (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
