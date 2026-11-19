import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, SectionTitle, SegmentedControl } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MetalRate } from '@/constants/mockRates';
import { getMockHistory, graphPeriods, type GraphPeriod } from './mockHistory';

const chartHeight = 194;

function formatPrice(value: number) {
  return value.toFixed(2);
}

function Chart({ values, color }: { values: number[]; color: string }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [width, setWidth] = useState(0);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.14, maximum * 0.002);
  const axisMin = minimum - padding;
  const axisMax = maximum + padding;
  const plotWidth = Math.max(width - 48, 0);
  const x = (index: number) => 5 + index * (plotWidth - 10) / (values.length - 1);
  const y = (value: number) => 12 + (axisMax - value) / (axisMax - axisMin) * (chartHeight - 24);
  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - width) > 1) setWidth(nextWidth);
  };

  return (
    <View style={styles.chart} onLayout={onLayout} accessibilityLabel={`Illustrative chart from ${formatPrice(values[0])} to ${formatPrice(values[values.length - 1])} AED per gram`}>
      {[0, 0.5, 1].map(fraction => (
        <View key={fraction} style={[styles.gridLine, { top: 12 + fraction * (chartHeight - 24) }]} />
      ))}
      {width > 48 && values.slice(1).map((value, index) => {
        const x1 = x(index);
        const x2 = x(index + 1);
        const y1 = y(values[index]);
        const y2 = y(value);
        const length = Math.hypot(x2 - x1, y2 - y1);
        return <View key={index} style={[styles.line, {
          left: (x1 + x2 - length) / 2,
          top: (y1 + y2) / 2 - 1,
          width: length,
          backgroundColor: color,
          transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
        }]} />;
      })}
      {width > 48 && <View style={[styles.endPoint, { left: x(values.length - 1) - 4, top: y(values[values.length - 1]) - 4, backgroundColor: color }]} />}
      <View style={styles.axisLabels}>
        <Text style={styles.axisText}>{locale.number(axisMax)}</Text>
        <Text style={styles.axisText}>{locale.number((axisMax + axisMin) / 2)}</Text>
        <Text style={styles.axisText}>{locale.number(axisMin)}</Text>
      </View>
    </View>
  );
}

export function PriceGraph({ rate }: { rate: MetalRate }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [period, setPeriod] = useState<GraphPeriod>('1D');
  const values = getMockHistory(rate, period);
  const dayValues = getMockHistory(rate, '1D');
  const dayChange = Number(rate.ask) - dayValues[0];
  const dayChangePercent = dayChange / dayValues[0] * 100;
  const volatility = (Number(rate.high) - Number(rate.low)) / Number(rate.ask) * 100;
  const color = rate.metal === 'silver' ? colors.silverChart : colors.goldBright;

  return (
    <View style={styles.section}>
      <SectionTitle title="Spot Price Analytics" />
      <Card style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{rate.title} PRICE GRAPH</Text>
            <Text style={styles.subtitle}>Indicative movement · AED per gram</Text>
          </View>
          <View style={styles.mockBadge}><Text style={styles.mockBadgeText}>MOCK HISTORY</Text></View>
        </View>
        <SegmentedControl items={graphPeriods} value={period} onChange={setPeriod} />
        <Chart values={values} color={color} />
        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>PAST {period}</Text>
          <Text style={styles.chartFooterText}>CURRENT {locale.number(rate.ask)} AED</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>24H CHANGE</Text>
            <Text style={[styles.statValue, { color: dayChange >= 0 ? colors.green : colors.red }]}>
              {locale.number(dayChange, 2, true)} ({locale.percent(dayChangePercent, true)})
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>24H RANGE</Text>
            <View style={styles.rangeValues}>
              <Text style={styles.statValue}>LOW {locale.number(rate.low)}</Text>
              <Text style={styles.statValue}>HIGH {locale.number(rate.high)}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>VOLATILITY</Text>
            <Text style={styles.statValue}>{locale.percent(volatility)} {locale.t('of current rate')}</Text>
          </View>
        </View>
        <Text style={styles.note}>Illustrative historical data and statistics. No live market connection.</Text>
      </Card>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  section: { marginTop: 26 },
  card: { gap: 12 },
  heading: { flexDirection: rowDirection(isRTL), justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  headingCopy: { flex: 1 },
  title: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 15, letterSpacing: 0.4 },
  subtitle: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 11, marginTop: 3 },
  mockBadge: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 7 },
  mockBadgeText: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 8, letterSpacing: 0.5 },
  chart: { width: '100%', height: chartHeight, position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 48, height: 1, backgroundColor: colors.border },
  line: { position: 'absolute', height: 2, borderRadius: 2 },
  endPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  axisLabels: { position: 'absolute', top: 4, bottom: 4, right: 0, justifyContent: 'space-between', alignItems: 'flex-end' },
  axisText: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 9, fontVariant: ['tabular-nums'] },
  chartFooter: { flexDirection: rowDirection(isRTL), justifyContent: 'space-between' },
  chartFooterText: { color: colors.textFaint, fontFamily: typefaces.semibold, fontSize: 9, letterSpacing: 0.7 },
  stats: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 4, gap: 0 },
  statRow: { minHeight: 39, flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomColor: colors.border, borderBottomWidth: 1 },
  statLabel: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 10, letterSpacing: 0.7 },
  statValue: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 11, fontVariant: ['tabular-nums'], textAlign: 'right' },
  rangeValues: { flexDirection: rowDirection(isRTL), flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 8 },
  note: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 14 },
});
