import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { currencies, type Currency } from '@/constants/currencies';

const storageKey = 'crystal.currency.v1';
const CurrencyContext = createContext<{ currency: Currency; setCurrency: (value: Currency) => void; ready: boolean } | null>(null);

export function CurrencyProvider({ children }: PropsWithChildren) {
  const [currency, setCurrencyState] = useState<Currency>('AED');
  const [ready, setReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(saved => {
        if (active && saved && Object.hasOwn(currencies, saved)) setCurrencyState(saved as Currency);
      })
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const setCurrency = (next: Currency) => {
    if (next === currency) return;
    setCurrencyState(next);
    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(storageKey, next))
      .catch(() => {});
  };

  return <CurrencyContext.Provider value={{ currency, setCurrency, ready }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
