import { Image, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: Date;
};

export function ChatBubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.userRow]}>
      {!isUser && <View style={styles.avatar}>
        <Image source={require('../../assets/images/crystal_icon_gold.png')} style={styles.avatarImage} resizeMode="contain" />
      </View>}
      <View style={styles.content}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userText]} translateContent={message.id === 'welcome'}>{message.text}</Text>
        </View>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>{message.timestamp.toLocaleTimeString(locale.language === 'ar' ? 'ar-AE-u-nu-arab' : 'en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
      </View>
    </View>
  );
}

export function TypingIndicator() {
  const { colors } = useTheme();
  const locale = useLocale();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  return <View style={styles.row} accessibilityLabel="Goldyy is typing">
    <View style={styles.avatar}>
      <Image source={require('../../assets/images/crystal_icon_gold.png')} style={styles.avatarImage} resizeMode="contain" />
    </View>
    <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
      <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} />
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  row: { flexDirection: rowDirection(isRTL), alignItems: 'flex-end', gap: 8, marginBottom: 16 },
  userRow: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.emblemBackground, borderColor: colors.chatAvatarBorder, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 19, height: 19 },
  content: { maxWidth: '84%', minWidth: 72 },
  bubble: { borderRadius: 17, paddingHorizontal: 15, paddingVertical: 12 },
  assistantBubble: { backgroundColor: colors.chatBubble, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: colors.goldBright, borderBottomRightRadius: 5 },
  messageText: { color: colors.textPrimary, fontFamily: typefaces.regular, fontSize: 14, lineHeight: 21 },
  userText: { color: colors.onGold, fontFamily: typefaces.semibold },
  timestamp: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10, marginTop: 5, marginLeft: 5 },
  userTimestamp: { textAlign: 'right', marginLeft: 0, marginRight: 5 },
  typingBubble: { minWidth: 69, minHeight: 39, flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
});
