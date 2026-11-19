import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, SectionTitle } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SpotRate } from '@/components/SpotRateCard';
import type { Currency } from '@/constants/currencies';
import { normalizeNumericInput } from '@/constants/numberFormat';
import { calculateBullionTotal, weightUnits, type WeightUnit } from './calculation';

function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={styles.selectContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.selectButton}
      >
        <Text style={styles.selectValue} numberOfLines={1}>{selectedLabel}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open && <View style={styles.options}>
        {options.map(option => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === option.value }}
            onPress={() => { onChange(option.value); setOpen(false); }}
            style={[styles.option, value === option.value && styles.optionSelected]}
          >
            <Text style={[styles.optionText, value === option.value && styles.optionTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>}
    </View>
  );
}

const unitOptions = weightUnits.map(unit => ({ value: unit, label: unit === 'TTB' ? 'TTB (Ten Tola Bar)' : unit }));

export function BullionCalculator({ rates, currency }: { rates: SpotRate[]; currency: Currency }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [weight, setWeight] = useState('10');
  const [unit, setUnit] = useState<WeightUnit>('Gram');
  const [metalId, setMetalId] = useState('gold-24k');
  const [includeVat, setIncludeVat] = useState(true);
  const rate = rates.find(item => item.id === metalId) ?? rates[0];
  const metalOptions = rates.map(item => ({ value: item.id, label: `${locale.t(item.title)} (${item.purity})` }));
  const result = rate ? calculateBullionTotal(normalizeNumericInput(weight), unit, rate, includeVat) : null;
  const formattedTotal = result?.total == null ? '—' : locale.money(result.total, currency);

  if (!rate) return <View style={styles.section}><SectionTitle title="Bullion Calculator" /><Card><Text style={styles.subtitle}>Prices unavailable for calculation.</Text></Card></View>;

  return (
    <View style={styles.section}>
      <SectionTitle title="Bullion Calculator" />
      <Card style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>ESTIMATE YOUR BULLION COST</Text>
            <Text style={styles.subtitle}>Based on the selected mock ASK rate.</Text>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>INSTANT</Text></View>
        </View>

        <View style={styles.weightRow}>
          <View style={styles.weightField}>
            <Text style={styles.fieldLabel}>WEIGHT</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder={locale.t('Enter weight')}
              placeholderTextColor={colors.textFaint}
              style={[styles.input, result?.error && styles.inputError]}
              accessibilityLabel={locale.isRTL ? 'وزن السبائك' : 'Bullion weight'}
            />
          </View>
          <View style={styles.unitField}>
            <SelectField label="UNIT" value={unit} options={unitOptions} onChange={setUnit} />
          </View>
        </View>
        {result?.error && <Text style={styles.error} accessibilityRole="alert">{result.error}</Text>}

        <SelectField label="METAL / PURITY" value={metalId} options={metalOptions} onChange={setMetalId} />
        <Text style={styles.rateText}>ASK RATE  {locale.money(rate.ask, currency)} / GRAM</Text>

        <View style={styles.vatRow}>
          <View style={styles.vatCopy}>
            <Text style={styles.vatLabel}>Apply UAE Standard 5% VAT</Text>
            <Text style={styles.vatHint}>{includeVat ? 'Included in estimate' : 'Excluded from estimate'}</Text>
          </View>
          <Switch
            value={includeVat}
            onValueChange={setIncludeVat}
            trackColor={{ false: colors.textFaint, true: colors.gold }}
            thumbColor={colors.switchThumb}
            accessibilityLabel="Apply UAE Standard 5% VAT"
          />
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>ESTIMATED TOTAL COST</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue} adjustsFontSizeToFit numberOfLines={1}>{formattedTotal}</Text>
            <Text style={styles.currency}>{currency}</Text>
          </View>
          <Text style={styles.totalNote}>Indicative estimate using mock prices. No live market connection.</Text>
        </View>
      </Card>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  section: { marginTop: 26 },
  card: { gap: 15, borderLeftColor: colors.gold, borderLeftWidth: isRTL ? 0 : 2, borderRightColor: colors.gold, borderRightWidth: isRTL ? 2 : 0 },
  heading: { flexDirection: rowDirection(isRTL), alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headingCopy: { flex: 1 },
  title: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 15, letterSpacing: 0.4 },
  subtitle: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 11, marginTop: 4 },
  badge: { borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 7 },
  badgeText: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 0.6 },
  weightRow: { flexDirection: rowDirection(isRTL), alignItems: 'flex-start', gap: 9 },
  weightField: { flex: 1 },
  unitField: { flex: 1 },
  fieldLabel: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.7, marginBottom: 7 },
  input: { minHeight: 44, color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 15, textAlign: isRTL ? 'right' : 'left', backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  inputError: { borderColor: colors.red },
  error: { color: colors.red, fontFamily: typefaces.regular, fontSize: 11, marginTop: -10 },
  selectContainer: { width: '100%' },
  selectButton: { minHeight: 44, flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 5, backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11 },
  selectValue: { flex: 1, color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 12 },
  chevron: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 19 },
  options: { backgroundColor: colors.cardStrong, borderColor: colors.border, borderWidth: 1, borderRadius: 10, marginTop: 5, overflow: 'hidden' },
  option: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  optionSelected: { backgroundColor: colors.selectedOption },
  optionText: { color: colors.textPrimary, fontFamily: typefaces.regular, fontSize: 12 },
  optionTextSelected: { color: colors.goldBright, fontFamily: typefaces.bold },
  rateText: { color: colors.gold, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.6, marginTop: -7 },
  vatRow: { flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 12 },
  vatCopy: { flex: 1 },
  vatLabel: { color: colors.textPrimary, fontFamily: typefaces.semibold, fontSize: 12 },
  vatHint: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, marginTop: 3 },
  totalBox: { backgroundColor: colors.totalBox, borderColor: colors.goldBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  totalLabel: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.9 },
  totalRow: { flexDirection: rowDirection(isRTL), alignItems: 'baseline', gap: 7, marginTop: 5 },
  totalValue: { flex: 1, color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 30, fontVariant: ['tabular-nums'] },
  currency: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 13 },
  totalNote: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 14, marginTop: 5 },
});
