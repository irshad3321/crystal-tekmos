import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeskProvider } from '@/features/dashboard/DeskContext';
import { useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';

const pages = [
  ['market', 'Market', 'السوق', { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }],
  ['calculator', 'Calculator', 'الحاسبة', { ios: 'plus.forwardslash.minus', android: 'calculate', web: 'calculate' }],
  ['wholesale', 'Wholesale', 'الجملة', { ios: 'shippingbox', android: 'inventory_2', web: 'inventory_2' }],
  ['alerts', 'Alerts', 'التنبيهات', { ios: 'bell', android: 'notifications', web: 'notifications' }],
] as const;

export default function DeskLayout() {
  const { colors } = useTheme();
  const { isRTL, typefaces } = useLocale();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const sideMargin = Math.max(width < 360 ? 8 : 14, (width - 540) / 2, insets.left, insets.right);
  return <DeskProvider>
    <Tabs safeAreaInsets={{ bottom: 0, left: 0, right: 0 }} screenOptions={{
      headerShown: false, animation: 'fade', tabBarHideOnKeyboard: true,
      tabBarLabelPosition: 'below-icon',
      tabBarActiveTintColor: colors.onPrimaryButton, tabBarInactiveTintColor: colors.textSecondary,
      tabBarActiveBackgroundColor: colors.primaryButton,
      tabBarStyle: {
        marginHorizontal: sideMargin, marginBottom: insets.bottom + 8, marginTop: 4,
        height: 66 + Math.max(0, fontScale - 1) * 24, paddingVertical: 6, paddingHorizontal: 4,
        borderRadius: 26, borderWidth: 1, borderTopWidth: 1, borderColor: colors.goldBorder, borderTopColor: colors.goldBorder,
        backgroundColor: colors.card, elevation: 4,
        shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: colors.cardShadowOpacity, shadowRadius: 8,
      },
      tabBarItemStyle: { flex: 1, marginHorizontal: 2, borderRadius: 20, overflow: 'hidden' },
      tabBarLabelStyle: { fontFamily: typefaces.semibold, fontSize: width < 360 ? 11 : 12, marginBottom: 2 },
      sceneStyle: { backgroundColor: colors.backgroundDeep },
    }}>
      {pages.map(([name, en, ar, emblem]) => <Tabs.Screen key={name} name={name} options={{
        title: isRTL ? ar : en,
        tabBarIcon: ({ color }) => <SymbolView name={emblem} size={22} tintColor={color} />,
      }} />)}
    </Tabs>
  </DeskProvider>;
}
