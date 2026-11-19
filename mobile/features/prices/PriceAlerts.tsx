import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, SectionTitle } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { mockRates } from '@/constants/mockRates';
import { normalizeNumericInput } from '@/constants/numberFormat';
import { currencies, type Currency } from '@/constants/currencies';
import type { SpotRate } from '@/components/SpotRateCard';
import { fetchPrices } from '@/api/prices';
import { mapPriceRates } from './mapPriceRates';

type PriceAlert = { id: string; metalId: string; targetPrice: number; currency?: Currency };
const storageKey = 'crystal.priceAlerts.v1';

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
      setError('Enter a target price greater than zero.');
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
      <SectionTitle title="Price Target Alarms" />
      <Card style={styles.card}>
        <Text style={styles.subtitle}>Set a target against the mock ASK price. Saved on this device.</Text>

        <View>
          <Text style={styles.fieldLabel}>METAL / PURITY</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setSelectorOpen(!selectorOpen)}
            accessibilityRole="button"
            accessibilityLabel={locale.isRTL ? `المعدن: ${locale.t(selectedRate.title)}` : `Metal: ${selectedRate.title}`}
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
          <Text style={styles.fieldLabel}>{locale.t('TARGET ASK PRICE')} ({currency} / {locale.t('GRAM')})</Text>
          <TextInput
            value={targetText}
            onChangeText={text => { setTargetInput({ currency, value: text }); if (error) setError(''); }}
            keyboardType="decimal-pad"
            placeholder={locale.t('Enter target price')}
            placeholderTextColor={colors.textFaint}
            style={[styles.input, !!error && styles.inputError]}
            accessibilityLabel={locale.isRTL ? `سعر البيع المستهدف بعملة ${currency} لكل غرام` : `Target ask price in ${currency} per gram`}
          />
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <Text style={styles.currentRate}>CURRENT MOCK ASK  {rates.length ? locale.money(selectedRate.ask, currency) : 'Price unavailable'} / GRAM</Text>
        </View>

        <Pressable style={[styles.addButton, (!loaded || !rates.length) && styles.addButtonDisabled]} onPress={addAlert} disabled={!loaded || !rates.length} accessibilityRole="button">
          <Text style={styles.addButtonText}>SET ALERT</Text>
        </Pressable>

        <View style={styles.savedSection}>
          <Text style={styles.savedTitle}>{locale.t('SAVED ALERTS')} ({locale.number(alerts.length, 0)})</Text>
          {!loaded && <Text style={styles.emptyText}>Loading saved alerts…</Text>}
          {loaded && alerts.length === 0 && <Text style={styles.emptyText}>No price alerts set yet.</Text>}
          {alerts.map(alert => {
            const alertCurrency = alert.currency ?? 'AED';
            const rate = (alertCurrency === currency ? rates : savedRates[alertCurrency])?.find(item => item.id === alert.metalId);
            const title = mockRates.find(item => item.id === alert.metalId)?.title ?? alert.metalId;
            const reached = rate ? Number(rate.ask) <= alert.targetPrice : false;
            return <View key={alert.id} style={styles.alertRow}>
              <View style={styles.alertCopy}>
                <Text style={styles.alertMetal}>{title} <Text style={styles.targetText}>≤ {locale.money(alert.targetPrice, alertCurrency)}</Text></Text>
                <Text style={styles.alertCurrent}>{rate ? `Current mock ASK ${locale.money(rate.ask, alertCurrency)}` : 'Price unavailable'}</Text>
                {rate && <Text style={[styles.status, reached ? styles.reached : styles.waiting]}>{reached ? 'TARGET REACHED' : 'WAITING FOR TARGET'}</Text>}
              </View>
              <Pressable
                onPress={() => setAlerts(current => current.filter(item => item.id !== alert.id))}
                accessibilityRole="button"
                accessibilityLabel={locale.isRTL ? `حذف تنبيه ${locale.t(title)} عند ${locale.money(alert.targetPrice, alertCurrency)}` : `Remove ${title} alert at ${locale.money(alert.targetPrice, alertCurrency)}`}
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>REMOVE</Text>
              </Pressable>
            </View>;
          })}
        </View>
        {storageError && <Text style={styles.error}>Device storage is unavailable; alerts may not be saved.</Text>}
        <Text style={styles.note}>Status uses mock prices while the app is open. No live or background notifications.</Text>
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
