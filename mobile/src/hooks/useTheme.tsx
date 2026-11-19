import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Platform } from 'react-native';
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from '@/constants/theme';

const themeStorageKey = STORAGE_KEYS.THEME;

function applyPlatformScheme(mode: ThemeMode) {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = mode === 'dark' ? darkColors.background : lightColors.backgroundDeep;
    }
  } else if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(mode);
  }
}

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  ready: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(themeStorageKey)
      .then(saved => {
        if (!active) return;
        const restored = saved === 'light' ? 'light' : 'dark';
        applyPlatformScheme(restored);
        setMode(restored);
      })
      .catch(() => { if (active) applyPlatformScheme('dark'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(themeStorageKey, mode))
      .catch(() => {});
  }, [mode, ready]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    ready,
    toggleTheme: () => {
      const next = mode === 'dark' ? 'light' : 'dark';
      applyPlatformScheme(next);
      setMode(next);
    },
  }), [mode, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error(ERROR_MESSAGES.THEME_PROVIDER);
  return context;
}
