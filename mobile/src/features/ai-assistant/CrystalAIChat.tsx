import { COPY } from '@/constants/copy';
import { SCREEN_ROUTES } from '@/constants/navigation';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rowDirection, useLocale } from '@/hooks/useLocale';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ChatBubble, TypingIndicator, type ChatMessage } from './ChatBubble';
import { quickActions, welcomeMessage } from './chatContent';
import { askGoldyy, checkBackendConnection, getGoldyyErrorMessage } from '@/api/ai';
import { ApiError } from '@/api/client';
import { useCurrency } from '@/hooks/useCurrency';

function initialMessages(): ChatMessage[] {
  return [{ id: 'welcome', role: 'assistant', text: welcomeMessage, timestamp: new Date() }];
}

export function CrystalAIChat() {
  const { colors } = useTheme();
  const locale = useLocale();
  const { currency } = useCurrency();
  const styles = createStyles(colors, locale.typefaces, locale.isRTL);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputError, setInputError] = useState('');
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const requestController = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const pending = useRef(false);
  const nextId = useRef(0);

  useEffect(() => () => {
    requestVersion.current += 1;
    requestController.current?.abort();
  }, []);

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      const connected = await checkBackendConnection();
      if (active) setConnectionStatus(connected ? 'connected' : 'unavailable');
    };
    void checkConnection();
    const interval = setInterval(() => { void checkConnection(); }, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const clearConversation = () => {
    requestVersion.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    pending.current = false;
    setMessages(initialMessages());
    setInput('');
    setTyping(false);
    setInputError('');
    setFailedPrompt(null);
    inputRef.current?.blur();
  };

  const sendPrompt = async (prompt: string, retry = false) => {
    if (pending.current) return;
    pending.current = true;
    const version = ++requestVersion.current;
    const controller = new AbortController();
    requestController.current = controller;
    setInputError('');
    setFailedPrompt(null);
    if (!retry) {
      setInput('');
      inputRef.current?.blur();
      setMessages(current => [...current, {
        id: `user-${++nextId.current}`,
        role: 'user',
        text: prompt,
        timestamp: new Date(),
      }]);
    }
    setTyping(true);

    try {
      const previousMessages = retry ? messages.slice(0, -1) : messages;
      const history = previousMessages.filter(message => message.id !== 'welcome')
        .slice(-8)
        .map(message => ({ role: message.role, text: message.text }));
      const reply = await askGoldyy(prompt, history, controller.signal, currency);
      if (version !== requestVersion.current) return;
      setConnectionStatus('connected');
      setMessages(current => [...current, {
        id: `assistant-${++nextId.current}`,
        role: 'assistant',
        text: reply,
        timestamp: new Date(),
      }]);
    } catch (error) {
      if (version !== requestVersion.current) return;
      if (error instanceof ApiError && error.kind === 'cancelled') return;
      if (error instanceof ApiError) {
        if (error.kind === 'network' || error.kind === 'configuration') setConnectionStatus('unavailable');
        else if (error.status !== undefined) setConnectionStatus('connected');
        else if (error.kind === 'timeout') {
          setConnectionStatus('checking');
          void checkBackendConnection().then(connected => {
            if (version === requestVersion.current) setConnectionStatus(connected ? 'connected' : 'unavailable');
          });
        }
      }
      setFailedPrompt(prompt);
      setInputError(locale.t(getGoldyyErrorMessage(error)));
    } finally {
      if (version !== requestVersion.current) return;
      setTyping(false);
      pending.current = false;
      requestController.current = null;
    }
  };

  const sendMessage = () => {
    const prompt = input.trim();
    if (!prompt) {
      setInputError(locale.t(COPY.TYPE_A_MESSAGE_BEFORE_SENDING));
      return;
    }
    void sendPrompt(prompt);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(SCREEN_ROUTES.DASHBOARD);
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.shell}>
          <LinearGradient colors={colors.pageGradient} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={colors.glowGradient} style={styles.topGlow} />

          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={goBack} accessibilityRole="button" accessibilityLabel={locale.t(COPY.BACK_TO_DASHBOARD)}>
              <Text style={styles.backIcon}>{locale.isRTL ? '→' : '←'}</Text>
            </Pressable>
            <View style={styles.identity}>
              <View style={styles.iconFrame}>
                <Image source={require('../../../assets/images/crystal_icon_gold.png')} style={styles.icon} resizeMode="contain" />
              </View>
              <View style={styles.identityText}>
                <Text style={styles.title}>{COPY.GOLDYY}</Text>
                <Text style={styles.subtitle}>{COPY.YOUR_PERSONAL_GOLD_ASSISTANT}</Text>
              </View>
            </View>
            <Pressable style={styles.clearButton} onPress={clearConversation} accessibilityRole="button" accessibilityLabel={locale.t(COPY.CLEAR_CONVERSATION)}>
              <Text style={styles.clearText}>{COPY.CLEAR}</Text>
            </Pressable>
          </View>

          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: connectionStatus === 'connected' ? colors.green : connectionStatus === 'checking' ? colors.gold : colors.red }]} />
            <Text style={styles.statusText}>{COPY.AI_ASSISTANT}</Text>
            <Text style={styles.statusDetail}>{connectionStatus === 'connected' ? COPY.BACKEND_CONNECTED : connectionStatus === 'checking' ? COPY.CHECKING_BACKEND : COPY.BACKEND_UNAVAILABLE}</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => { if (messages.length > 1 || typing) scrollRef.current?.scrollToEnd({ animated: true }); }}
          >
            <Text style={styles.conversationLabel}>{COPY.GOLDYY_CONVERSATION}</Text>
            {messages.map(message => <ChatBubble key={message.id} message={message} />)}

            {messages.length === 1 && <View style={styles.suggestions}>
              <Text style={styles.suggestionLabel}>{COPY.EXPLORE_A_TOPIC}</Text>
              <View style={styles.suggestionGrid}>
                {quickActions.map(action => (
                  <Pressable
                    key={action.label}
                    style={styles.suggestion}
                    accessibilityRole="button"
                    accessibilityLabel={locale.t(action.label)}
                    onPress={() => { setInput(locale.t(action.prompt)); setInputError(''); inputRef.current?.focus(); }}
                  >
                    <Text style={styles.suggestionText}>{action.label}</Text>
                    <Text style={styles.suggestionArrow}>{locale.isRTL ? '↖' : '↗'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>}
            {typing && <TypingIndicator />}
          </ScrollView>

          <View style={styles.composer}>
            {!!inputError && <Text style={styles.inputError} accessibilityRole="alert">{inputError}</Text>}
            {!!failedPrompt && <Pressable onPress={() => { void sendPrompt(failedPrompt, true); }} accessibilityRole="button"><Text style={styles.retryText}>{COPY.RETRY_MESSAGE}</Text></Pressable>}
            <View style={styles.composerRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={input}
                onChangeText={text => { setInput(text); if (inputError) setInputError(''); }}
                placeholder={locale.t(COPY.ASK_GOLDYY)}
                placeholderTextColor={colors.textFaint}
                multiline
                maxLength={1000}
                accessibilityLabel={locale.t(COPY.MESSAGE_GOLDYY)}
              />
              <Pressable
                style={[styles.sendButton, typing && styles.sendDisabled]}
                onPress={sendMessage}
                disabled={typing}
                accessibilityRole="button"
                accessibilityLabel={locale.t(COPY.SEND_MESSAGE)}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </Pressable>
            </View>
            <Text style={styles.composerNote}>{COPY.AI_GENERATED_REPLIES_SIMULATED_PRICES}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, typefaces: ReturnType<typeof useLocale>['typefaces'], isRTL: boolean) => StyleSheet.create({
  page: { flex: 1, width: '100%', backgroundColor: colors.backgroundDeep },
  keyboardView: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.backgroundDeep },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 450 },
  header: { minHeight: 71, flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 8, paddingHorizontal: 12, borderBottomColor: colors.border, borderBottomWidth: 1, backgroundColor: colors.header },
  backButton: { width: 34, height: 38, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: colors.goldBright, fontFamily: typefaces.semibold, fontSize: 26, lineHeight: 30 },
  identity: { flex: 1, minWidth: 0, flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 9 },
  iconFrame: { width: 39, height: 39, borderRadius: 13, borderColor: colors.chatIconBorder, borderWidth: 1, backgroundColor: colors.emblemBackground, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 26, height: 26 },
  identityText: { flex: 1, minWidth: 0 },
  title: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 18, lineHeight: 21 },
  subtitle: { color: colors.textSecondary, fontFamily: typefaces.regular, fontSize: 10, lineHeight: 14 },
  clearButton: { minWidth: 46, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card },
  clearText: { color: colors.gold, fontFamily: typefaces.semibold, fontSize: 11 },
  statusBar: { minHeight: 31, flexDirection: rowDirection(isRTL), alignItems: 'center', gap: 6, paddingHorizontal: 16, backgroundColor: colors.chatStatus, borderBottomColor: colors.border, borderBottomWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.green, fontFamily: typefaces.bold, fontSize: 9, letterSpacing: 0.7 },
  statusDetail: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 10 },
  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, flexGrow: 1 },
  conversationLabel: { color: colors.textFaint, fontFamily: typefaces.semibold, fontSize: 9, letterSpacing: 1.1, textAlign: 'center', marginBottom: 18 },
  suggestions: { marginLeft: isRTL ? 0 : 38, marginRight: isRTL ? 38 : 0, marginTop: 2, marginBottom: 8 },
  suggestionLabel: { color: colors.gold, fontFamily: typefaces.bold, fontSize: 10, letterSpacing: 1, marginBottom: 9 },
  suggestionGrid: { flexDirection: rowDirection(isRTL), flexWrap: 'wrap', gap: 8 },
  suggestion: { width: '47%', minHeight: 50, flexDirection: rowDirection(isRTL), alignItems: 'center', justifyContent: 'space-between', gap: 5, borderRadius: 12, borderColor: colors.chatSuggestionBorder, borderWidth: 1, backgroundColor: colors.chatSuggestion, paddingHorizontal: 10, paddingVertical: 9 },
  suggestionText: { flex: 1, color: colors.goldLight, fontFamily: typefaces.semibold, fontSize: 11, lineHeight: 15 },
  suggestionArrow: { color: colors.goldBright, fontFamily: typefaces.bold, fontSize: 15 },
  composer: { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.chatComposer, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  composerRow: { flexDirection: rowDirection(isRTL), alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 108, color: colors.textPrimary, fontFamily: typefaces.regular, fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left', backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 10 },
  sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryButton, borderRadius: 13 },
  sendDisabled: { opacity: 0.5 },
  sendIcon: { color: colors.onPrimaryButton, fontSize: 19, lineHeight: 23 },
  inputError: { color: colors.red, fontFamily: typefaces.regular, fontSize: 11, marginBottom: 5 },
  retryText: { color: colors.goldBright, fontFamily: typefaces.semibold, fontSize: 11, marginBottom: 7 },
  composerNote: { color: colors.textFaint, fontFamily: typefaces.regular, fontSize: 9, textAlign: 'center', marginTop: 7 },
});
