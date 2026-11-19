import { Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MetalRate } from '@/constants/mockRates';
import type { Currency } from '@/constants/currencies';
import type { PriceSource } from '@/api/prices';
import { spotPriceForUnit, type SpotPriceUnit } from '@/features/prices/spotPriceUnit';

export type SpotRate = Pick<MetalRate, 'id' | 'title' | 'subtitle' | 'purity' | 'ask' | 'bid' | 'metal'>
  & Partial<Pick<MetalRate, 'low' | 'high'>> & { source?: PriceSource };

export function SpotRateCard({ rate, selected, onPress, currency = 'AED', unit }: { rate: SpotRate; selected: boolean; onPress: () => void; currency?: Currency; unit: SpotPriceUnit }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const ask = locale.money(spotPriceForUnit(rate.ask, unit), currency);
  const bid = locale.money(spotPriceForUnit(rate.bid, unit), currency);
  return (
    <Pressable onPress={onPress} style={styles.pressable} accessibilityRole="button" accessibilityLabel={locale.isRTL ? `${locale.t(rate.title)}، سعر البيع ${ask}، سعر الشراء ${bid}، ${locale.t(unit)}` : `${rate.title}, ask ${ask}, bid ${bid}, ${unit}`}>
      <Card style={[styles.card, selected && styles.selected, rate.metal === 'silver' && selected && styles.selectedSilver]}>
        <View style={styles.topLine}>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{rate.title}</Text>
            <Text style={styles.subtitle}>{rate.subtitle}  •  {rate.purity}  •  {locale.t(unit)}{rate.source ? `  •  ${locale.t(rate.source === 'LIVE_SPOT' ? 'LIVE SPOT' : rate.source === 'CACHED_LIVE_SPOT' ? 'CACHED SPOT' : 'MOCK PRICES')}` : ''}</Text>
          </View>
          {rate.id === 'gold-24k' && <View style={styles.spotBadge}><Text style={styles.spotText}>SPOT</Text></View>}
        </View>

        <View style={styles.askBlock}>
          <Text style={styles.askLabel}>ASK (SELLING RATE)</Text>
          <Text style={styles.askValue} adjustsFontSizeToFit numberOfLines={1}>{ask}</Text>
        </View>

        <View style={styles.footer}>
            <Text style={styles.bidText}><Text style={styles.bidLabel}>BID: </Text>{bid}</Text>
          <View style={styles.rangeRow}>
              <Text style={styles.low}>↘  {locale.t('L:')} {rate.low ? locale.number(spotPriceForUnit(rate.low, unit)) : '—'}</Text>
              <Text style={styles.high}>↗  {locale.t('H:')} {rate.high ? locale.number(spotPriceForUnit(rate.high, unit)) : '—'}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  pressable: { width: '100%' },
  card: { width: '100%', padding: 16, borderRadius: 16 },
  selected: { borderColor: colors.gold, borderWidth: 2, backgroundColor: colors.selectedCard },
  selectedSilver: { borderColor: colors.silverSelected },
  topLine: { flexDirection: rowDirection(isRTL), justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  nameBlock: { flex: 1 },
  name: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 17 },
  subtitle: { color: colors.gold, fontFamily: typefaces.semibold, fontSize: 12, lineHeight: 17, marginTop: 3 },
  spotBadge: { borderColor: colors.spotBadgeBorder, borderWidth: 1, backgroundColor: colors.spotBadge, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  spotText: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 10 },
  askBlock: { marginVertical: 14 },
  askLabel: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 1.1 },
  askValue: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 36, lineHeight: 42, letterSpacing: -1, fontVariant: ['tabular-nums'], marginTop: 3 },
  footer: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 11, gap: 7 },
  bidText: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
  bidLabel: { color: colors.textSecondary, fontFamily: typefaces.regular },
  rangeRow: { flexDirection: rowDirection(isRTL), alignItems: 'center', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  low: { color: colors.red, fontFamily: typefaces.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  high: { color: colors.green, fontFamily: typefaces.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
});
