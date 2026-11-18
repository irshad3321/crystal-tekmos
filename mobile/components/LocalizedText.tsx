import { Children } from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { fonts } from '@/constants/brand';
import { useLocale } from '@/hooks/useLocale';

export function LocalizedText({ children, style, translateContent = true, ...props }: TextProps & { translateContent?: boolean }) {
  const { isRTL, t, typefaces } = useLocale();
  const flattened = StyleSheet.flatten(style);
  const alignment = flattened?.textAlign;
  const weight = flattened?.fontFamily === fonts.bold ? '700' : flattened?.fontFamily === fonts.semibold ? '600' : '400';
  const localized = Children.map(children, child => {
    if (!translateContent || typeof child !== 'string') return child;
    const match = child.match(/^(\s*)(.*?)(\s*)$/s);
    return match ? `${match[1]}${t(match[2])}${match[3]}` : child;
  });

  return <NativeText
    {...props}
    style={[style, {
      ...(isRTL ? {
        fontFamily: typefaces.regular,
        fontWeight: weight,
        fontSize: flattened?.fontSize && flattened.fontSize < 15 ? flattened.fontSize + 1 : flattened?.fontSize,
        lineHeight: flattened?.lineHeight ? flattened.lineHeight + 2 : undefined,
      } : {}),
      textAlign: alignment === 'center' ? 'center' : isRTL ? 'right' : alignment ?? 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    }]}
  >{localized}</NativeText>;
}
