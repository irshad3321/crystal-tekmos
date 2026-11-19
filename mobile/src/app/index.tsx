import { useCallback, useRef, useState } from 'react';
import { AppState, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SectionTitle, SegmentedControl } from '@/components/DashboardUI';
import { SpotRateCard, type SpotRate } from '@/components/SpotRateCard';
import { PriceGraph } from '@/features/prices/PriceGraph';
import { BullionCalculator } from '@/features/calculator/BullionCalculator';
import { WhatsAppTradeLock } from '@/features/wholesale/WhatsAppTradeLock';
import { PriceAlerts } from '@/features/prices/PriceAlerts';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fetchPrices, type Currency, type PricesResponse } from '@/api/prices';
import { mapPriceRates } from '@/features/prices/mapPriceRates';
import { spotPriceUnits, type SpotPriceUnit } from '@/features/prices/spotPriceUnit';
import { currencies, currencyCodes } from '@/constants/currencies';
import { useCurrency } from '@/hooks/useCurrency';

const PRICE_REFRESH_INTERVAL_MS = 5_000;

export default function DashboardScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [selectedRate, setSelectedRate] = useState('gold-24k');
  const [priceUnit, setPriceUnit] = useState<SpotPriceUnit>('Per Gram');
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
            setError(cause instanceof Error ? cause.message : 'Unable to load Crystal prices.');
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

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <View style={styles.shell}>
      <LinearGradient colors={colors.pageGradient} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={colors.glowGradient} style={styles.topGlow} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={mode === 'dark' ? require('../../assets/images/crystal_logo_white.png') : require('../../assets/images/crystal_logo_dark.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <Pressable style={styles.utilityButton} accessibilityLabel="TV mode preview"><Text style={styles.utilityIcon}>▣</Text></Pressable>
            <Pressable style={styles.utilityButton} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={locale.isRTL ? (mode === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن') : `Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}><Text style={styles.utilityIcon}>{mode === 'dark' ? '\u2600' : '\u263E'}</Text></Pressable>
            <Pressable style={styles.languageButton} onPress={locale.toggleLanguage} accessibilityRole="button" accessibilityLabel={locale.isRTL ? 'Switch to English' : 'التبديل إلى العربية'}><Text style={styles.languageText}>{locale.isRTL ? 'EN' : 'عربي'}</Text></Pressable>
          </View>
        </View>
        <SegmentedControl items={currencyCodes} value={currency} onChange={changeCurrency} labelForItem={code => `${code} / ${currencies[code].symbol}`} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHeading}>
          <SectionTitle title="Spot Rates" />
          <View style={styles.previewBadge}><View style={styles.previewDot} /><Text style={styles.previewText}>{loading && rates.length === 0 ? 'LOADING' : error ? rates.length > 0 ? 'UPDATE FAILED' : 'PRICE UNAVAILABLE' : priceSource === 'LIVE_SPOT' ? 'LIVE SPOT' : priceSource === 'CACHED_LIVE_SPOT' ? 'CACHED SPOT' : priceSource === 'MIXED' ? 'MIXED SOURCES' : 'MOCK PRICES'}</Text></View>
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.currencyLabel}>RATES IN {rateCurrency}</Text>
          <View style={styles.unitControl}><SegmentedControl items={spotPriceUnits} value={priceUnit} onChange={setPriceUnit} /></View>
        </View>

        <View style={styles.cards}>
          {loading && rates.length === 0 && <Text style={styles.statusText}>Loading simulated prices…</Text>}
          {!loading && error && rates.length === 0 && <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retryPrices} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>}
          {rates.map(rate => (
            <SpotRateCard
              key={rate.id}
              rate={rate}
              selected={selectedRate === rate.id}
              onPress={() => setSelectedRate(rate.id)}
              currency={rateCurrency}
              unit={priceUnit}
            />
          ))}
          {rates.length > 0 && <Text style={styles.unavailableText}>Spot-based estimates · Simulated exchange rates and buy/sell spreads. 24H low and high are unavailable.</Text>}
          {rates.length > 0 && priceSource !== 'SIMULATED_DEMO' && <Pressable onPress={() => { void Linking.openURL('https://goldapi.dev'); }} accessibilityRole="link"><Text style={styles.unavailableText}>Spot data: GoldAPI.dev</Text></Pressable>}
        </View>

        <PriceGraph key={`${selectedRate}-${rateCurrency}`} rate={rates.find(rate => rate.id === selectedRate) ?? rates[0]} currency={rateCurrency} />

        <BullionCalculator rates={rates} currency={rateCurrency} />

        <WhatsAppTradeLock rates={rates} currency={rateCurrency} priceError={error !== null} onRetry={retryPrices} />

        <PriceAlerts rates={rates} currency={rateCurrency} />

        <View style={styles.footer}>
          <Image source={require('../../assets/images/crystal_icon_gold.png')} style={styles.footerIcon} resizeMode="contain" />
          <Text style={styles.footerBrand}>CRYSTAL BULLION</Text>
          <Text style={styles.footerText}>Dubai & Muscat Desk</Text>
          <Text style={styles.footerNote}>Indicative spot estimates. Exchange rates and chart history are simulated.</Text>
        </View>
      </ScrollView>
      <Pressable style={styles.aiLaunch} onPress={() => router.push('/ai-assistant')} accessibilityRole="button" accessibilityLabel={locale.isRTL ? 'افتح مساعد غولدي' : 'Open Goldyy assistant'}>
        <Image source={require('../../assets/images/crystal_icon_gold.png')} style={styles.aiLaunchIcon} resizeMode="contain" />
        <Text style={styles.aiLaunchText}>AI</Text>
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: colors.backgroundDeep },
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.backgroundDeep },
  topGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 450 },
  header: { width: '100%', backgroundColor: colors.header, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 9 },
  headerTop: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', minHeight: 46 },
  logo: { width: 110, height: 43 },
  headerActions: { flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 6 },
  utilityButton: { width: 36, height: 36, borderRadius: 9, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  utilityIcon: { color: colors.goldBright, fontSize: 18 },
  languageButton: { height: 36, borderRadius: 9, backgroundColor: colors.goldBright, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  languageText: { color: colors.onGold, fontSize: 12, fontWeight: '700' },
  scrollView: { flex: 1, width: '100%' },
  content: { width: '100%', flexGrow: 1, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 28 },
  sectionHeading: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewBadge: { flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 5, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 14 },
  previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.goldBright },
  previewText: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 0.6 },
  controlRow: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  currencyLabel: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 10, letterSpacing: 1.1 },
  unitControl: { width: 196 },
  cards: { gap: 13 },
  statusText: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 12, paddingVertical: 18, textAlign: 'center' },
  errorCard: { backgroundColor: colors.glassCard, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, alignItems: 'center' },
  errorText: { color: colors.red, fontFamily: typefaces.regular, fontSize: 12, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primaryButton, borderRadius: 9, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.onPrimaryButton, fontFamily: typefaces.bold, fontSize: 11 },
  unavailableText: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 11, textAlign: 'center' },
  footer: { borderTopColor: colors.border, borderTopWidth: 1, alignItems: 'center', marginTop: 32, paddingTop: 23 },
  footerIcon: { width: 38, height: 27 },
  footerBrand: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 12, letterSpacing: 2, marginTop: 9 },
  footerText: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 12, marginTop: 6 },
  footerNote: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 11, textAlign: 'center', marginTop: 12 },
  aiLaunch: { position: 'absolute', right: isRTL ? undefined : 16, left: isRTL ? 16 : undefined, bottom: 18, width: 56, height: 56, borderRadius: 19, borderColor: colors.goldBright, borderWidth: 1, backgroundColor: colors.aiButton, alignItems: 'center', justifyContent: 'center', shadowColor: colors.floatingShadow, shadowOpacity: colors.floatingShadowOpacity, shadowRadius: 12, elevation: 8 },
  aiLaunchIcon: { width: 27, height: 24 },
  aiLaunchText: { color: colors.aiButtonText, fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 1 },
});
