import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  return <View style={styles.sectionTitle}>
    <Text style={styles.sectionSymbol}>⌁</Text>
    <Text style={styles.sectionText}>{title}</Text>
  </View>;
}

export function SegmentedControl<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  return <View style={styles.segmented}>
    {items.map(item => <Pressable
      key={item}
      onPress={() => onChange(item)}
      accessibilityRole="button"
      accessibilityState={{ selected: value === item }}
      style={[styles.segment, value === item && styles.segmentSelected]}
    >
      <Text style={[styles.segmentText, value === item && styles.segmentTextSelected]}>{item}</Text>
    </Pressable>)}
  </View>;
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  card: { backgroundColor: colors.glassCard, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, shadowColor: colors.cardShadow, shadowOpacity: colors.cardShadowOpacity, shadowRadius: 16, elevation: 5 },
  sectionTitle: { flexDirection: rowDirection(isRTL), alignItems: 'center', flex: 1, marginBottom: 14, gap: 7 },
  sectionSymbol: { color: colors.goldBright, fontSize: 19, lineHeight: 20 },
  sectionText: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 12, lineHeight: 17, letterSpacing: 1.8, textTransform: 'uppercase', flexShrink: 1 },
  segmented: { flexDirection: rowDirection(isRTL), backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 3 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7, minHeight: 32, paddingHorizontal: 5 },
  segmentSelected: { backgroundColor: colors.goldBright },
  segmentText: { color: colors.textSecondary, fontFamily: typefaces.semibold, fontSize: 11 },
  segmentTextSelected: { color: colors.onGold, fontFamily: typefaces.bold },
});
