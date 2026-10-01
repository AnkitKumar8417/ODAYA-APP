import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { ScreenHeader } from "@/src/components/screen-header";
import { useTheme, spacing, radius } from "@/src/theme";

type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  "How do I check PNR?",
  "How do I search trains?",
  "How do I check seat availability?",
  "How do I check live train status?",
  "How does the fare calculator work?",
];

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Assistant() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { reply: string } = await res.json();
      setMessages([...next, { id: `a-${Date.now()}`, role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I couldn't reach the assistant. Please check your connection and try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="assistant-screen">
      <ScreenHeader title="ODAYA Assistant" subtitle="Railway helper · AI" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.avatarRing, { borderColor: colors.brandPrimary }]}>
              <View style={[styles.avatar, { backgroundColor: colors.brandPrimary }]}>
                <MaterialDesignIcons name="robot-happy-outline" size={32} color={colors.onBrandPrimary} />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Hi, I&apos;m ODAYA</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Ask me anything about trains, PNR, routes or the ODAYA app.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((q, idx) => (
                <Pressable
                  key={idx}
                  testID={`suggestion-${idx}`}
                  onPress={() => send(q)}
                  style={({ pressed }) => [
                    styles.suggestChip,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialDesignIcons name="chat-question-outline" size={14} color={colors.brandPrimary} />
                  <Text style={[styles.suggestText, { color: colors.onSurface }]}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={busy ? [...messages, { id: "typing", role: "assistant", content: "…" } as Message] : messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg }]}
            renderItem={({ item }) => (
              <Bubble
                role={item.role}
                content={item.content}
                typing={item.id === "typing"}
              />
            )}
            testID="assistant-messages"
          />
        )}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.divider,
              paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.md,
            },
          ]}
        >
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <TextInput
              testID="assistant-input"
              value={input}
              onChangeText={setInput}
              placeholder="Ask about trains, PNR, routes..."
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.onSurface }]}
              multiline
              returnKeyType="send"
              editable={!busy}
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              testID="assistant-send-button"
              onPress={() => send(input)}
              disabled={busy || input.trim().length === 0}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: input.trim() && !busy ? colors.brandPrimary : colors.surfaceTertiary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <MaterialDesignIcons
                  name="send"
                  size={18}
                  color={input.trim() ? colors.onBrandPrimary : colors.muted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ role, content, typing }: { role: Role; content: string; typing?: boolean }) {
  const { colors } = useTheme();
  const isUser = role === "user";
  if (isUser) {
    return (
      <View style={[bubbleStyles.row, { justifyContent: "flex-end" }]}>
        <View style={[bubbleStyles.userBubble, { backgroundColor: colors.surfaceTertiary }]} testID="user-bubble">
          <Text style={[bubbleStyles.text, { color: colors.onSurface }]}>{content}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={bubbleStyles.row} testID="assistant-bubble">
      <View style={[bubbleStyles.avatar, { backgroundColor: colors.brandPrimary }]}>
        <MaterialDesignIcons name="robot-outline" size={16} color={colors.onBrandPrimary} />
      </View>
      <View
        style={[
          bubbleStyles.botBubble,
          { backgroundColor: colors.brandTertiary, borderLeftColor: colors.brandPrimary },
        ]}
      >
        {typing ? (
          <View style={bubbleStyles.typingRow}>
            <TypingDot />
            <TypingDot delay={120} />
            <TypingDot delay={240} />
          </View>
        ) : (
          <Text style={[bubbleStyles.text, { color: colors.onSurface }]}>{content}</Text>
        )}
      </View>
    </View>
  );
}

function TypingDot({ delay = 0 }: { delay?: number }) {
  const { colors } = useTheme();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const i = setInterval(() => setOn((v) => !v), 400);
      return () => clearInterval(i);
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 2,
        backgroundColor: on ? colors.brandPrimary : colors.borderStrong,
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  avatarRing: {
    padding: 6,
    borderRadius: 999,
    borderWidth: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", marginTop: spacing.lg },
  emptySub: { fontSize: 13, textAlign: "center", marginTop: spacing.sm, lineHeight: 18 },
  suggestions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    width: "100%",
  },
  suggestChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suggestText: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "flex-end", marginVertical: 4 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  botBubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderLeftWidth: 2,
  },
  userBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  text: { fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
});
