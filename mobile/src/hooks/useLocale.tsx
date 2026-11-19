import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { I18nManager, Platform } from 'react-native';
import { fonts } from '@/constants/brand';
import { ar } from '@/constants/translations';
import { formatCurrency, type Currency } from '@/constants/currencies';

export type Language = 'en' | 'ar';
const storageKey = STORAGE_KEYS.LANGUAGE;

type LocaleContextValue = {
  language: Language;
  isRTL: boolean;
  ready: boolean;
  toggleLanguage: () => void;
  t: (text: string) => string;
  number: (value: number | string, decimals?: number, signed?: boolean) => string;
  money: (value: number | string, currency: Currency, decimals?: number) => string;
  percent: (value: number, signed?: boolean) => string;
  typefaces: { regular?: string; semibold?: string; bold?: string };
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function rowDirection(isRTL: boolean): 'row' | 'row-reverse' {
  const platformRTL = Platform.OS === 'web' ? isRTL : I18nManager.isRTL;
  return isRTL === platformRTL ? 'row' : 'row-reverse';
}

function setWebDirection(language: Language) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>('en');
  const [ready, setReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(saved => {
        if (!active) return;
        const next = saved === 'ar' ? 'ar' : 'en';
        setLanguage(next);
        setWebDirection(next);
      })
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(storageKey, language))
      .catch(() => {});
  }, [language, ready]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    isRTL: language === 'ar',
    ready,
    toggleLanguage: () => {
      const next = language === 'en' ? 'ar' : 'en';
      setLanguage(next);
      setWebDirection(next);
    },
    t: text => language === 'ar' ? (ar[text] ?? text) : text,
    number: (value, decimals = 2, signed = false) => {
      const numeric = typeof value === 'string' ? Number(value) : value;
      if (!Number.isFinite(numeric)) return String(value);
      return new Intl.NumberFormat(language === 'ar' ? 'ar-AE-u-nu-arab' : 'en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay: signed ? 'always' : 'auto',
      }).format(numeric);
    },
    money: (amount, currency, decimals = 2) => formatCurrency(amount, currency, language, decimals),
    percent: (value, signed = false) => new Intl.NumberFormat(language === 'ar' ? 'ar-AE-u-nu-arab' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: signed ? 'always' : 'auto',
    }).format(value / 100),
    typefaces: language === 'ar'
      ? { regular: Platform.OS === 'ios' ? 'System' : Platform.OS === 'web' ? 'Arial' : 'sans-serif', semibold: Platform.OS === 'ios' ? 'System' : Platform.OS === 'web' ? 'Arial' : 'sans-serif-medium', bold: Platform.OS === 'ios' ? 'System' : Platform.OS === 'web' ? 'Arial' : 'sans-serif' }
      : fonts,
  }), [language, ready]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error(ERROR_MESSAGES.LOCALE_PROVIDER);
  return context;
}
