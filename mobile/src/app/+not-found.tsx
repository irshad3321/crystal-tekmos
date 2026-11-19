import { COPY } from '@/constants/copy';
import { SCREEN_ROUTES } from '@/constants/navigation';
import { Link } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  return <View style={styles.page}>
    <Image source={require('../../assets/images/crystal_icon_gold.png')} style={styles.icon} resizeMode="contain" />
    <Text style={styles.title}>{COPY.PAGE_UNAVAILABLE}</Text>
    <Text style={styles.copy}>{COPY.RETURN_TO_THE_CRYSTAL_BULLION_DASHBOARD}</Text>
    <Link href={SCREEN_ROUTES.DASHBOARD} style={styles.link}>{COPY.BACK_TO_DASHBOARD}</Link>
  </View>;
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 80, height: 80 },
  title: { color: colors.textPrimary, fontFamily: typefaces.bold, fontSize: 24, marginTop: 18 },
  copy: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 14, textAlign: 'center', marginTop: 8 },
  link: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 14, marginTop: 25 },
});
