import { useState } from 'react';
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, SectionTitle } from '@/components/DashboardUI';
import type { SpotRate } from '@/components/SpotRateCard';
import type { Currency } from '@/constants/currencies';
import { formatCurrency } from '@/constants/currencies';
import { normalizeNumericInput } from '@/constants/numberFormat';
import type { ThemeColors } from '@/constants/theme';
import { calculateBullionTotal } from '@/features/calculator/calculation';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';
import { buildTradeLockUrl, goldPurityOptions, openTradeLockLink } from './tradeLock';

export function WhatsAppTradeLock({ rates, currency, priceError, onRetry }: {
  rates: SpotRate[];
  currency: Currency;
  priceError: boolean;
  onRetry: () => void;
}) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [quantity, setQuantity] = useState('100');
  const [purityId, setPurityId] = useState('gold-24k');
  const [linkError, setLinkError] = useState('');
  const [opening, setOpening] = useState(false);
  const selectedPurity = goldPurityOptions.find(option => option.id === purityId) ?? goldPurityOptions[0];
  const rate = rates.find(item => item.id === purityId && item.metal === 'gold');
  const hasPrice = !priceError && rate && (rate.source === 'LIVE_SPOT' || rate.source === 'CACHED_LIVE_SPOT')
    && Number.isFinite(Number(rate.ask)) && Number(rate.ask) > 0;
  const normalizedQuantity = normalizeNumericInput(quantity).trim().replace(',', '.');
  const quantityGrams = Number(normalizedQuantity);
  const quantityError = !/^\d+(\.\d*)?$/.test(normalizedQuantity) || !Number.isFinite(quantityGrams) || quantityGrams <= 0
    ? 'Enter a valid positive quantity in grams.' : '';
  const calculation = hasPrice && !quantityError
    ? calculateBullionTotal(normalizedQuantity, 'Gram', rate, false) : null;
  const tooLarge = calculation?.error === 'Enter a smaller weight.'
    || (calculation?.total != null && calculation.total > Number.MAX_SAFE_INTEGER);
  const estimate = calculation?.total != null && Number.isFinite(calculation.total)
    && calculation.total <= Number.MAX_SAFE_INTEGER ? calculation.total : null;
  const sourceLabel = rate?.source === 'LIVE_SPOT' ? 'LIVE SPOT' : 'CACHED SPOT';

  const openWhatsApp = async () => {
    if (estimate === null || !hasPrice || opening) return;
    setLinkError('');
    setOpening(true);
    const url = buildTradeLockUrl({
      purity: selectedPurity.purity,
      quantityGrams,
      currency,
      formattedEstimatedPrice: formatCurrency(estimate, currency),
    });
    try {
      const opened = await openTradeLockLink(url, Linking);
      if (!opened) {
        setLinkError('The WhatsApp link cannot be opened on this device.');
        return;
      }
    } catch {
      setLinkError('Could not open the WhatsApp link. Please try again.');
    } finally {
      setOpening(false);
    }
  };

  return <View style={styles.section}>
    <SectionTitle title="B2B Wholesale WhatsApp Trade Lock" />
    <Card style={styles.card}>
      <Text style={styles.intro}>Request a wholesale quote using the latest available gold selling rate.</Text>

      <View>
        <Text style={styles.label}>QUANTITY (GRAMS)</Text>
        <TextInput
          value={quantity}
          onChangeText={value => { setQuantity(value); setLinkError(''); }}
          keyboardType="decimal-pad"
          placeholder={locale.t('Enter quantity in grams')}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, quantityError && styles.inputError]}
          accessibilityLabel={locale.t('Quantity in grams')}
        />
        {!!quantityError && <Text style={styles.error} accessibilityRole="alert">{quantityError}</Text>}
      </View>

      <View>
        <Text style={styles.label}>GOLD PURITY</Text>
        <View style={styles.purityGrid}>
          {goldPurityOptions.map(option => <Pressable
            key={option.id}
            onPress={() => { setPurityId(option.id); setLinkError(''); }}
            accessibilityRole="button"
            accessibilityState={{ selected: purityId === option.id }}
            style={[styles.purityOption, purityId === option.id && styles.puritySelected]}
          >
            <Text style={[styles.purityText, purityId === option.id && styles.purityTextSelected]}>{option.label}</Text>
          </Pressable>)}
        </View>
      </View>

      <View style={styles.estimateBox}>
        <Text style={styles.label}>ESTIMATED WHOLESALE PRICE</Text>
        {estimate !== null && rate ? <>
          <Text style={styles.estimate} adjustsFontSizeToFit numberOfLines={1}>{locale.money(estimate, currency)}</Text>
          <Text style={styles.rate}><Text>ASK RATE</Text>: {locale.money(rate.ask, currency)} / <Text>Gram</Text> · {locale.t(sourceLabel)}</Text>
        </> : <>
          <Text style={styles.unavailable}>{!hasPrice
            ? 'Live gold price unavailable. Retry spot prices to calculate an estimate.'
            : tooLarge ? 'Enter a smaller quantity.' : 'Enter a valid quantity to see an estimate.'}</Text>
          {!hasPrice && <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retryButton}>
            <Text style={styles.retryText}>RETRY PRICES</Text>
          </Pressable>}
        </>}
        <Text style={styles.disclaimer}>Estimate only. Currency conversion and buy/sell spread are simulated. No order or price is locked; the business must confirm the final quote.</Text>
      </View>

      <Pressable
        onPress={() => { void openWhatsApp(); }}
        disabled={estimate === null || opening}
        accessibilityRole="button"
        accessibilityState={{ disabled: estimate === null || opening }}
        style={[styles.whatsAppButton, (estimate === null || opening) && styles.disabled]}
      >
        <Text style={styles.whatsAppButtonText}>Lock Order via WhatsApp</Text>
      </Pressable>
      {!!linkError && <Text style={styles.error} accessibilityRole="alert">{linkError}</Text>}
      <Text style={styles.hint}>WhatsApp opens with a draft message. You choose whether to send it.</Text>
    </Card>
  </View>;
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  section: { marginTop: 26 },
  card: { gap: 15, borderLeftColor: colors.gold, borderLeftWidth: isRTL ? 0 : 2, borderRightColor: colors.gold, borderRightWidth: isRTL ? 2 : 0 },
  intro: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 11, lineHeight: 16 },
  label: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.7, marginBottom: 7 },
  input: { minHeight: 44, color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 15, textAlign: isRTL ? 'right' : 'left', backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  inputError: { borderColor: colors.red },
  purityGrid: { flexDirection: rowDirection(isRTL), flexWrap: 'wrap', gap: 8 },
  purityOption: { width: '48%', minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  puritySelected: { borderColor: colors.gold, backgroundColor: colors.selectedOption },
  purityText: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 11, textAlign: 'center' },
  purityTextSelected: { color: colors.goldBright, fontFamily: typefaces.bold },
  estimateBox: { backgroundColor: colors.totalBox, borderColor: colors.goldBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  estimate: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 28, fontVariant: ['tabular-nums'], marginTop: 4 },
  rate: { color: colors.gold, fontFamily: typefaces.semibold, fontSize: 10, marginTop: 7 },
  unavailable: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 11, lineHeight: 16 },
  disclaimer: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 15, marginTop: 8 },
  retryButton: { alignSelf: isRTL ? 'flex-end' : 'flex-start', backgroundColor: colors.primaryButton, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10 },
  retryText: { color: colors.onPrimaryButton, fontFamily: typefaces.bold, fontSize: 10 },
  whatsAppButton: { minHeight: 46, borderRadius: 10, backgroundColor: colors.primaryButton, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  whatsAppButtonText: { color: colors.onPrimaryButton, fontFamily: typefaces.bold, fontSize: 12 },
  disabled: { opacity: 0.5 },
  error: { color: colors.red, fontFamily: typefaces.regular, fontSize: 11, marginTop: 6 },
  hint: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 15 },
});
