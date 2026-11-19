import { COPY } from '@/constants/copy';
import { ACCESSIBILITY_LABELS } from '@/constants/accessibility';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, SectionTitle, SegmentedControl } from '@/components/DashboardUI';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SpotRate } from '@/components/SpotRateCard';
import type { Currency } from '@/constants/currencies';
import { fetchPriceHistory, type HistoryPoint, type HistoryRange } from '@/api/priceHistory';

const graphPeriods: readonly HistoryRange[] = ['1D', '1W', '1M', '3M', '1Y'];

const chartHeight = 194;

function Chart({ values, color, currency }: { values: number[]; color: string; currency: Currency }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [width, setWidth] = useState(0);
  const axisWidth = currency === 'INR' ? 90 : 48;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.14, maximum * 0.002);
  const axisMin = minimum - padding;
  const axisMax = maximum + padding;
  const plotWidth = Math.max(width - axisWidth, 0);
  const x = (index: number) => 5 + index * (plotWidth - 10) / (values.length - 1);
  const y = (value: number) => 12 + (axisMax - value) / (axisMax - axisMin) * (chartHeight - 24);
  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - width) > 1) setWidth(nextWidth);
  };

  return (
    <View style={styles.chart} onLayout={onLayout} accessibilityLabel={ACCESSIBILITY_LABELS.PRICE_GRAPH(locale.money(values[0], currency), locale.money(values[values.length - 1], currency), locale.isRTL)}>
      {[0, 0.5, 1].map(fraction => (
        <View key={fraction} style={[styles.gridLine, { right: axisWidth, top: 12 + fraction * (chartHeight - 24) }]} />
      ))}
      {width > axisWidth && values.slice(1).map((value, index) => {
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
      {width > axisWidth && <View style={[styles.endPoint, { left: x(values.length - 1) - 4, top: y(values[values.length - 1]) - 4, backgroundColor: color }]} />}
      <View style={[styles.axisLabels, { width: axisWidth }]}>
        <Text style={styles.axisText}>{locale.money(axisMax, currency)}</Text>
        <Text style={styles.axisText}>{locale.money((axisMax + axisMin) / 2, currency)}</Text>
        <Text style={styles.axisText}>{locale.money(axisMin, currency)}</Text>
      </View>
    </View>
  );
}

export function PriceGraph({ rate, currency }: { rate?: SpotRate; currency: Currency }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [period, setPeriod] = useState<HistoryRange>('1D');
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [dayHistory, setDayHistory] = useState<HistoryPoint[] | null>(null);
  const [historyKey, setHistoryKey] = useState('');
  const [error, setError] = useState('');
  const [errorKey, setErrorKey] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const metal = rate?.metal;
  const purity = rate ? Number(rate.purity) : undefined;
  const ask = rate?.ask;
  const queryKey = `${metal}:${purity}:${currency}:${period}:${ask}`;

  useEffect(() => {
    if (!metal || purity === undefined) return;
    const controller = new AbortController();
    const previous = inFlight.current;
    const run = async () => {
      // Finish cancellation of an older selection before starting its replacement.
      if (previous) await previous;
      // Let an immediate cleanup (including React development effect replay) cancel before fetch starts.
      await Promise.resolve();
      if (controller.signal.aborted) return;
      try {
        const request = fetchPriceHistory(metal, purity, currency, period, controller.signal);
        const dayRequest = period === '1D' ? request : fetchPriceHistory(metal, purity, currency, '1D', controller.signal);
        const responses = await Promise.allSettled([request, dayRequest]);
        if (controller.signal.aborted) return;
        const failed = responses.find(result => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
        const [rangeData, dayData] = responses.map(result => result.status === 'fulfilled' ? result.value : []);
        if (rangeData.at(-1)?.price !== Number(ask) || dayData.at(-1)?.price !== Number(ask)) {
          setError(COPY.SPOT_RATE_CHANGED_WHILE_GRAPH_LOADED);
          setErrorKey(queryKey);
          return;
        }
        setHistory(rangeData);
        setDayHistory(dayData);
        setHistoryKey(queryKey);
        setError('');
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : COPY.UNABLE_TO_LOAD_PRICE_HISTORY);
        setErrorKey(queryKey);
      }
    };
    inFlight.current = run();
    return () => { controller.abort(); };
  }, [metal, purity, currency, period, ask, queryKey, retryCount]);

  const current = Number(ask);
  const visibleHistory = historyKey === queryKey ? history : null;
  const visibleDayHistory = historyKey === queryKey ? dayHistory : null;
  const values = visibleHistory?.map(point => point.price);
  const dayValues = visibleDayHistory?.map(point => point.price);
  const visibleError = errorKey === queryKey ? error : '';
  const dayChange = dayValues ? current - dayValues[0] : 0;
  const dayChangePercent = dayValues ? dayChange / dayValues[0] * 100 : 0;
  const low = dayValues ? Math.min(...dayValues) : 0;
  const high = dayValues ? Math.max(...dayValues) : 0;
  const volatility = dayValues ? (high - low) / current * 100 : 0;
  const color = rate?.metal === 'silver' ? colors.silverChart : colors.goldBright;

  if (!rate) return <View style={styles.section}><SectionTitle title={COPY.SPOT_PRICE_ANALYTICS} /><Card><Text style={styles.note}>{COPY.PRICES_UNAVAILABLE_FOR_HISTORY}</Text></Card></View>;

  return (
    <View style={styles.section}>
      <SectionTitle title={COPY.SPOT_PRICE_ANALYTICS} />
      <Card style={styles.card}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{rate.title} {COPY.PRICE_GRAPH}</Text>
            <Text style={styles.subtitle}>{COPY.INDICATIVE_MOVEMENT} {currency} {COPY.PER_GRAM_LOWER}</Text>
          </View>
          <View style={styles.mockBadge}><Text style={styles.mockBadgeText}>{COPY.MOCK_HISTORY}</Text></View>
        </View>
        <SegmentedControl items={graphPeriods} value={period} onChange={next => { setHistory(null); setDayHistory(null); setError(''); setPeriod(next); }} />
        {visibleError ? <Text style={styles.note}>{visibleError} <Text onPress={() => { setError(''); setRetryCount(count => count + 1); }}>{COPY.RETRY}</Text></Text>
          : values && dayValues ? <Chart values={values} color={color} currency={currency} />
            : <Text style={styles.note}>{COPY.LOADING_SIMULATED_HISTORY}</Text>}
        {values && dayValues && <>
        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>{COPY.PAST} {period}</Text>
          <Text style={styles.chartFooterText}>{COPY.CURRENT} {locale.money(current, currency)}</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{COPY.TEXT_24H_CHANGE}</Text>
            <Text style={[styles.statValue, { color: dayChange >= 0 ? colors.green : colors.red }]}>
              {dayChange > 0 ? '+' : ''}{locale.money(dayChange, currency)} ({locale.percent(dayChangePercent, true)})
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{COPY.TEXT_24H_RANGE}</Text>
            <View style={styles.rangeValues}>
              <Text style={styles.statValue}>{COPY.LOW} {locale.money(low, currency)}</Text>
              <Text style={styles.statValue}>{COPY.HIGH} {locale.money(high, currency)}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{COPY.VOLATILITY}</Text>
            <Text style={styles.statValue}>{locale.percent(volatility)} {locale.t(COPY.OF_CURRENT_RATE)}</Text>
          </View>
        </View>
        </>}
        <Text style={styles.note}>{COPY.HISTORY_DISCLAIMER}</Text>
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
  gridLine: { position: 'absolute', left: 0, height: 1, backgroundColor: colors.border },
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
