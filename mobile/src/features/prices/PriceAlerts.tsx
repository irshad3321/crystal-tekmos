import { COPY } from '@/constants/copy';
import { ACCESSIBILITY_LABELS } from '@/constants/accessibility';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, SectionTitle } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { mockRates } from '@/constants/mockRates';
import { normalizeNumericInput } from '@/utils/numberFormat';
import { currencies, type Currency } from '@/constants/currencies';
import type { SpotRate } from '@/components/SpotRateCard';
import { fetchPrices } from '@/api/prices';
import { mapPriceRates } from './mapPriceRates';

type PriceAlert = { id: string; metalId: string; targetPrice: number; currency?: Currency };
const storageKey = STORAGE_KEYS.PRICE_ALERTS;

function isPriceAlert(value: unknown): value is PriceAlert {
  if (typeof value !== 'object' || value === null) return false;
  const alert = value as Partial<PriceAlert>;
  return typeof alert.id === 'string'
    && typeof alert.metalId === 'string'
    && mockRates.some(rate => rate.id === alert.metalId)
    && typeof alert.targetPrice === 'number'
    && Number.isFinite(alert.targetPrice)
    && alert.targetPrice > 0
    && (alert.currency === undefined || (typeof alert.currency === 'string' && Object.hasOwn(currencies, alert.currency)));
}

export function PriceAlerts({ rates, currency }: { rates: SpotRate[]; currency: Currency }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [metalId, setMetalId] = useState(mockRates[0].id);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [targetInput, setTargetInput] = useState<{ currency: Currency; value: string }>({ currency, value: '' });
  const targetText = targetInput.currency === currency ? targetInput.value : '';
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [savedRates, setSavedRates] = useState<Partial<Record<Currency, SpotRate[]>>>({});
  const selectedRate = rates.find(rate => rate.id === metalId) ?? rates[0] ?? mockRates[0];

  useEffect(() => {
    let active = true;
    const otherCurrencies = [...new Set(alerts.map(alert => alert.currency ?? 'AED'))]
      .filter(code => code !== currency) as Currency[];
    for (const code of otherCurrencies) {
      fetchPrices(code)
        .then(response => { if (active) setSavedRates(current => ({ ...current, [code]: mapPriceRates(response.data) })); })
        .catch(() => { if (active) setSavedRates(current => ({ ...current, [code]: undefined })); });
    }
    return () => { active = false; };
  }, [alerts, currency]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setAlerts(parsed.filter(isPriceAlert));
      })
      .catch(() => { if (active) setStorageError(true); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(alerts))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }, [alerts, loaded]);

  const addAlert = () => {
    if (!loaded || rates.length === 0) return;
    const normalized = normalizeNumericInput(targetText).trim().replace(',', '.');
    const targetPrice = Number(normalized);
    if (!/^\d+(\.\d*)?$/.test(normalized) || !Number.isFinite(targetPrice) || targetPrice <= 0) {
      setError(COPY.ENTER_A_TARGET_PRICE_GREATER_THAN_ZERO);
      return;
    }
    setAlerts(current => [...current, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      metalId,
      targetPrice,
      currency,
    }]);
    setTargetInput({ currency, value: '' });
    setError('');
  };

  return (
    <View style={styles.section}>
      <SectionTitle title={COPY.PRICE_TARGET_ALARMS} />
      <Card style={styles.card}>
        <Text style={styles.subtitle}>{COPY.ALERT_INTRO}</Text>

        <View>
          <Text style={styles.fieldLabel}>{COPY.METAL_PURITY}</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setSelectorOpen(!selectorOpen)}
            accessibilityRole="button"
            accessibilityLabel={ACCESSIBILITY_LABELS.ALERT_METAL(locale.t(selectedRate.title), locale.isRTL)}
            accessibilityState={{ expanded: selectorOpen }}
          >
            <Text style={styles.selectorText}>{selectedRate.title} ({selectedRate.purity})</Text>
            <Text style={styles.chevron}>{selectorOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
          {selectorOpen && <View style={styles.options}>
            {(rates.length ? rates : mockRates).map(rate => (
              <Pressable
                key={rate.id}
                style={[styles.option, metalId === rate.id && styles.selectedOption]}
                onPress={() => { setMetalId(rate.id); setSelectorOpen(false); }}
                accessibilityRole="button"
                accessibilityState={{ selected: metalId === rate.id }}
              >
                <Text style={[styles.optionText, metalId === rate.id && styles.selectedOptionText]}>{rate.title} ({rate.purity})</Text>
              </Pressable>
            ))}
          </View>}
        </View>

        <View>
          <Text style={styles.fieldLabel}>{locale.t(COPY.TARGET_ASK_PRICE)} ({currency} / {locale.t(COPY.GRAM_2)})</Text>
          <TextInput
            value={targetText}
            onChangeText={text => { setTargetInput({ currency, value: text }); if (error) setError(''); }}
            keyboardType="decimal-pad"
            placeholder={locale.t(COPY.ENTER_TARGET_PRICE)}
            placeholderTextColor={colors.textFaint}
            style={[styles.input, !!error && styles.inputError]}
            accessibilityLabel={ACCESSIBILITY_LABELS.ALERT_TARGET(currency, locale.isRTL)}
          />
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Text style={styles.currentRate}>{COPY.CURRENT_ASK}  {rates.length ? locale.money(selectedRate.ask, currency) : COPY.PRICE_UNAVAILABLE_2} {COPY.PER_GRAM_SUFFIX}</Text>
        </View>

        <Pressable style={[styles.addButton, (!loaded || !rates.length) && styles.addButtonDisabled]} onPress={addAlert} disabled={!loaded || !rates.length} accessibilityRole="button">
          <Text style={styles.addButtonText}>{COPY.SET_ALERT}</Text>
        </Pressable>

        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>{locale.t(COPY.SAVED_ALERTS)} ({locale.number(alerts.length, 0)})</Text>
          {!loaded && <Text style={styles.emptyText}>{COPY.LOADING_SAVED_ALERTS}</Text>}
          {loaded && alerts.length === 0 && <Text style={styles.emptyText}>{COPY.NO_PRICE_ALERTS_SET_YET}</Text>}
          {alerts.map(alert => {
            const alertCurrency = alert.currency ?? 'AED';
            const rate = (alertCurrency === currency ? rates : savedRates[alertCurrency])?.find(item => item.id === alert.metalId);
            const title = mockRates.find(item => item.id === alert.metalId)?.title ?? alert.metalId;
            const reached = rate ? Number(rate.ask) <= alert.targetPrice : false;
            return <View key={alert.id} style={styles.alertRow}>
              <View style={styles.alertCopy}>
                <Text style={styles.alertMetal}>{title} <Text style={styles.targetText}>≤ {locale.money(alert.targetPrice, alertCurrency)}</Text></Text>
                <Text style={styles.alertCurrent}>{rate ? `${locale.t(COPY.CURRENT_INDICATIVE_ASK)} ${locale.money(rate.ask, alertCurrency)}` : COPY.PRICE_UNAVAILABLE_2}</Text>
                {rate && <Text style={[styles.status, reached ? styles.reached : styles.waiting]}>{reached ? COPY.TARGET_REACHED : COPY.WAITING_FOR_TARGET}</Text>}
              </View>
              <Pressable
                onPress={() => setAlerts(current => current.filter(item => item.id !== alert.id))}
                accessibilityRole="button"
                accessibilityLabel={ACCESSIBILITY_LABELS.REMOVE_ALERT(locale.t(title), locale.money(alert.targetPrice, alertCurrency), locale.isRTL)}
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>{COPY.REMOVE}</Text>
              </Pressable>
            </View>;
          })}
        </View>
        {storageError && <Text style={styles.error}>{COPY.ALERT_STORAGE_UNAVAILABLE}</Text>}
        <Text style={styles.note}>{COPY.ALERT_STATUS_DISCLAIMER}</Text>
      </Card>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  section: { marginTop: 26 },
  card: { gap: 14 },
  subtitle: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 11, lineHeight: 16 },
  fieldLabel: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.7, marginBottom: 7 },
  selector: { minHeight: 44, flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  selectorText: { color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 12 },
  chevron: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 19 },
  options: { backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, marginTop: 5, overflow: 'hidden' },
  option: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  selectedOption: { backgroundColor: colors.selectedOption },
  optionText: { color: colors.textPrimary, fontFamily: typefaces.regular, fontSize: 12 },
  selectedOptionText: { color: colors.goldBright, fontFamily: typefaces.bold },
  input: { minHeight: 44, color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 15, textAlign: isRTL ? 'right' : 'left', backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  inputError: { borderColor: colors.red },
  error: { color: colors.red, fontFamily: typefaces.regular, fontSize: 11, marginTop: 5 },
  currentRate: { color: colors.gold, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.5, marginTop: 8 },
  addButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryButton, borderRadius: 10 },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: colors.onPrimaryButton, fontFamily: typefaces.bold, fontSize: 12, letterSpacing: 0.8 },
  savedSection: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12, gap: 9 },
  savedTitle: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 10, letterSpacing: 1 },
  emptyText: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 11, textAlign: 'center', paddingVertical: 10 },
  alertRow: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 11 },
  alertCopy: { flex: 1, gap: 3 },
  alertMetal: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 12 },
  targetText: { color: colors.goldBright },
  alertCurrent: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10 },
  status: { fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 0.5 },
  reached: { color: colors.green },
  waiting: { color: colors.gold },
  removeButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { color: colors.red, fontFamily: typefaces.bold, fontSize: 10 },
  note: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 14 },
});
