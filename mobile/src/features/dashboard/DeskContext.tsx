import { createContext, useContext, useCallback, useState, useRef, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COPY } from '@/constants/copy';
import { useCurrency } from '@/hooks/useCurrency';
import { fetchPrices, type Currency, type PricesResponse } from '@/api/prices';
import { mapPriceRates } from '@/features/prices/mapPriceRates';
import type { SpotRate } from '@/types/prices';
import type { SpotPriceUnit } from '@/features/prices/spotPriceUnit';

const PRICE_REFRESH_INTERVAL_MS = 5_000;
function useDeskData() {
  const [selectedRate, setSelectedRate] = useState('gold-24k');
  const [priceUnit, setPriceUnit] = useState<SpotPriceUnit>(COPY.PER_GRAM);
  const { currency, setCurrency, ready: currencyReady } = useCurrency();
  const [rates, setRates] = useState<SpotRate[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(currency);
  const [priceSource, setPriceSource] = useState<PricesResponse['source']>('SIMULATED_DEMO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const activePriceRequest = useRef<Promise<PricesResponse> | null>(null);
  const queuedRefresh = useRef<(() => void) | null>(null);
  const refreshNow = useRef<() => void>(() => {});
  const rateCurrency = rates.length > 0 ? displayCurrency : currency;

  useFocusEffect(useCallback(() => {
    if (!currencyReady) return;

    let active = true;
    let appState = AppState.currentState === 'background' || AppState.currentState === 'inactive'
      ? AppState.currentState : 'active';
    let timer: ReturnType<typeof setInterval> | undefined;
    const version = requestVersion.current;

    const refresh = () => {
      if (!active || appState !== 'active') return;
      if (activePriceRequest.current) {
        queuedRefresh.current = refresh;
        return;
      }
      const request = fetchPrices(currency);
      activePriceRequest.current = request;
      void request
        .then(response => {
          const mapped = mapPriceRates(response.data);
          if (active && version === requestVersion.current) {
            setRates(mapped);
            setDisplayCurrency(response.currency);
            setPriceSource(response.source);
            setError(null);
          }
        })
        .catch(cause => {
          if (active && version === requestVersion.current) {
            setError(cause instanceof Error ? cause.message : COPY.UNABLE_TO_LOAD_PRICES);
          }
        })
        .finally(() => {
          if (active && version === requestVersion.current) setLoading(false);
          if (activePriceRequest.current === request) {
            activePriceRequest.current = null;
            const queued = queuedRefresh.current;
            queuedRefresh.current = null;
            queued?.();
          }
        });
    };
    refreshNow.current = refresh;

    const stopTimer = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const startTimer = () => {
      stopTimer();
      timer = setInterval(refresh, PRICE_REFRESH_INTERVAL_MS);
    };

    const subscription = AppState.addEventListener('change', nextState => {
      const wasActive = appState === 'active';
      appState = nextState;
      if (nextState !== 'active') {
        stopTimer();
      } else if (!wasActive) {
        refresh();
        startTimer();
      }
    });

    if (appState === 'active') {
      refresh();
      startTimer();
    }

    return () => {
      active = false;
      stopTimer();
      subscription.remove();
      if (queuedRefresh.current === refresh) queuedRefresh.current = null;
      if (refreshNow.current === refresh) refreshNow.current = () => {};
    };
  }, [currency, currencyReady]));

  const changeCurrency = (next: Currency) => {
    if (next === currency) return;
    requestVersion.current += 1;
    setLoading(true);
    setError(null);
    setCurrency(next);
  };

  const retryPrices = () => {
    setLoading(true);
    setError(null);
    refreshNow.current();
  };

  return { selectedRate, setSelectedRate, priceUnit, setPriceUnit, currency, changeCurrency, rates, rateCurrency, priceSource, loading, error, retryPrices };
}
const DeskContext = createContext<ReturnType<typeof useDeskData> | null>(null);
export function DeskProvider({ children }: PropsWithChildren) {
  const data = useDeskData();
  return <DeskContext.Provider value={data}>{children}</DeskContext.Provider>;
}
export function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error('DeskProvider is required');
  return value;
}
