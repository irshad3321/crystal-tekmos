import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { LocaleProvider, useLocale } from '@/hooks/useLocale';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { mode, colors, ready } = useTheme();
  const { ready: localeReady } = useLocale();

  useEffect(() => {
    if (ready && localeReady) SplashScreen.hideAsync();
  }, [ready, localeReady]);

  if (!ready || !localeReady) return null;

  return <>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.backgroundDeep } }} />
  </>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit: require('../../assets/fonts/Outfit-Regular.ttf'),
    OutfitSemiBold: require('../../assets/fonts/Outfit-SemiBold.ttf'),
    OutfitBold: require('../../assets/fonts/Outfit-Bold.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return <ThemeProvider><LocaleProvider><Navigation /></LocaleProvider></ThemeProvider>;
}
