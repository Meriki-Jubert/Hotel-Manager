import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translate, Language } from './translate';
import { TranslationKey } from './en';
import { useHMS } from '../context/HMSContext';

export interface LanguageContextType {
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
  lang: Language;
  setLang: (lang: Language) => void;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hotelConfig } = useHMS();
  const defaultFromConfig: Language = hotelConfig?.defaultLanguage === 'fr' ? 'fr' : 'en';

  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('hms_lang');
      if (saved === 'en' || saved === 'fr') {
        return saved;
      }
    } catch {
      // ignore
    }
    return defaultFromConfig;
  });

  // Sync with hotelConfig.defaultLanguage if user has not explicitly set a preference in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hms_lang');
      if (!saved && hotelConfig?.defaultLanguage) {
        setLangState(hotelConfig.defaultLanguage);
      }
    } catch {
      // ignore
    }
  }, [hotelConfig?.defaultLanguage]);

  // Set html document lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('hms_lang', newLang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, vars?: Record<string, string | number>) => {
      return translate(lang, key, vars);
    },
    [lang]
  );

  // Active locale for Intl (fr-CM or en-GB)
  const locale = lang === 'fr' ? 'fr-CM' : 'en-GB';

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return String(date);
        return new Intl.DateTimeFormat(locale, options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(d);
      } catch {
        return String(date);
      }
    },
    [locale]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(locale, options).format(num);
      } catch {
        return String(num);
      }
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({
      t,
      lang,
      setLang,
      formatDate,
      formatNumber,
      locale
    }),
    [t, lang, setLang, formatDate, formatNumber, locale]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useT = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useT must be used within a LanguageProvider');
  }
  return ctx;
};
