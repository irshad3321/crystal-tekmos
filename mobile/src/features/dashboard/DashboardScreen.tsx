import { COPY } from '@/constants/copy';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SCREEN_ROUTES } from '@/constants/navigation';
import { EXTERNAL_LINKS } from '@/constants/links';
import { SectionTitle, SegmentedControl } from '@/components/DashboardUI';
import { SpotRateCard } from '@/components/SpotRateCard';
import { PriceGraph } from '@/features/prices/PriceGraph';
import { BullionCalculator } from '@/features/calculator/BullionCalculator';
import { WhatsAppTradeLock } from '@/features/wholesale/WhatsAppTradeLock';
import { PriceAlerts } from '@/features/prices/PriceAlerts';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { spotPriceUnits } from '@/features/prices/spotPriceUnit';
import { currencies, currencyCodes } from '@/constants/currencies';

import { useDesk } from './DeskContext';

type Page = 'market' | 'calculator' | 'wholesale' | 'alerts';
export default function DashboardScreen({ page = 'market' }: { page?: Page }) {
  const { colors, mode, toggleTheme } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const { selectedRate, setSelectedRate, priceUnit, setPriceUnit, currency, changeCurrency, rates, rateCurrency, priceSource, loading, error, retryPrices } = useDesk();
  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <View style={styles.shell}>
      <LinearGradient colors={colors.pageGradient} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={colors.glowGradient} style={styles.topGlow} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Image source={mode === 'dark' ? require('../../../assets/images/crystal_logo_white.png') : require('../../../assets/images/crystal_logo_dark.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <Pressable style={styles.utilityButton} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={locale.t(mode === 'dark' ? COPY.SWITCH_TO_LIGHT_THEME : COPY.SWITCH_TO_DARK_THEME)}><Text style={styles.utilityIcon}>{mode === 'dark' ? '\u2600' : '\u263E'}</Text></Pressable>
            <Pressable style={styles.languageButton} onPress={locale.toggleLanguage} accessibilityRole="button" accessibilityLabel={locale.isRTL ? COPY.SWITCH_TO_ENGLISH : locale.t(COPY.SWITCH_TO_ARABIC)}><Text style={styles.languageText}>{locale.isRTL ? 'EN' : 'عربي'}</Text></Pressable>
          </View>
        </View>
        <SegmentedControl items={currencyCodes} value={currency} onChange={changeCurrency} labelForItem={code => `${code} / ${currencies[code].symbol}`} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag">
        {page === 'market' && <>
        <View style={styles.sectionHeading}>
          <SectionTitle title={COPY.SPOT_RATES} />
          <View style={styles.previewBadge}><View style={styles.previewDot} /><Text style={styles.previewText}>{loading && rates.length === 0 ? COPY.LOADING : error ? rates.length > 0 ? COPY.UPDATE_FAILED : COPY.PRICE_UNAVAILABLE : priceSource === 'LIVE_SPOT' ? COPY.LIVE_SPOT : priceSource === 'CACHED_LIVE_SPOT' ? COPY.CACHED_SPOT : priceSource === 'MIXED' ? COPY.MIXED_SOURCES : COPY.MOCK_PRICES}</Text></View>
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.currencyLabel}>{COPY.RATES_IN} {rateCurrency}</Text>
          <View style={styles.unitControl}><SegmentedControl items={spotPriceUnits} value={priceUnit} onChange={setPriceUnit} /></View>
        </View>

        <View style={styles.cards}>
          {loading && rates.length === 0 && <Text style={styles.statusText}>{COPY.LOADING_SIMULATED_PRICES}</Text>}
          {!loading && error && rates.length === 0 && <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={retryPrices} style={styles.retryButton} accessibilityRole="button">
              <Text style={styles.retryText}>{COPY.RETRY}</Text>
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
          {rates.length > 0 && <Text style={styles.unavailableText}>{COPY.SPOT_PRICE_DISCLAIMER}</Text>}
          {rates.length > 0 && priceSource !== 'SIMULATED_DEMO' && <Pressable onPress={() => { void Linking.openURL(EXTERNAL_LINKS.GOLD_API); }} accessibilityRole="link"><Text style={styles.unavailableText}>{COPY.SPOT_DATA_GOLDAPI_DEV}</Text></Pressable>}
        </View>

        <PriceGraph key={`${selectedRate}-${rateCurrency}`} rate={rates.find(rate => rate.id === selectedRate) ?? rates[0]} currency={rateCurrency} />
        </>}

        {page === 'calculator' && <BullionCalculator rates={rates} currency={rateCurrency} />}

        {page === 'wholesale' && <WhatsAppTradeLock rates={rates} currency={rateCurrency} priceError={error !== null} onRetry={retryPrices} />}

        {page === 'alerts' && <PriceAlerts rates={rates} currency={rateCurrency} />}

        <View style={styles.footer}>
          <Image source={require('../../../assets/images/crystal_icon_gold.png')} style={styles.footerIcon} resizeMode="contain" />
          <Text style={styles.footerBrand}>{COPY.BRAND_NAME}</Text>
          <Text style={styles.footerText}>{COPY.DUBAI_MUSCAT_DESK}</Text>
          <Text style={styles.footerNote}>{COPY.FOOTER_PRICE_DISCLAIMER}</Text>
        </View>
      </ScrollView>
      <Pressable style={styles.aiLaunch} onPress={() => router.push(SCREEN_ROUTES.AI_ASSISTANT)} accessibilityRole="button" accessibilityLabel={locale.t(COPY.OPEN_GOLDYY_ASSISTANT)}>
        <Image source={require('../../../assets/images/crystal_icon_gold.png')} style={styles.aiLaunchIcon} resizeMode="contain" />
        <Text style={styles.aiLaunchText}>{COPY.GOLDYY}</Text>
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: colors.backgroundDeep },
  shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', backgroundColor: colors.backgroundDeep },
  topGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 450 },
  header: { width: '100%', backgroundColor: colors.header, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 9 },
  headerTop: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', minHeight: 46 },
  logo: { width: 110, height: 43 },
  headerActions: { flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 6 },
  utilityButton: { width: 44, height: 44, borderRadius: 9, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  utilityIcon: { color: colors.goldBright, fontSize: 18 },
  languageButton: { minHeight: 44, borderRadius: 12, backgroundColor: colors.goldBright, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  languageText: { color: colors.onGold, fontSize: 12, fontWeight: '700' },
  scrollView: { flex: 1, width: '100%' },
  content: { width: '100%', flexGrow: 1, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 90 },
  sectionHeading: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewBadge: { flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 5, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 14 },
  previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.goldBright },
  previewText: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 0.6 },
  controlRow: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  currencyLabel: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 10, letterSpacing: 1.1 },
  unitControl: { width: 196, maxWidth: '65%' },
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
