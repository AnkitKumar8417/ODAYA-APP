import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { Station, searchStations } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

interface StationPickerProps {
  icon: string;
  label: string;
  placeholder: string;
  value: Station | null;
  onChange: (station: Station | null) => void;
  testID?: string;
}

export function StationPicker({ icon, label, placeholder, value, onChange, testID }: StationPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState<string>(value ? `${value.name} (${value.code})` : "");
  const [results, setResults] = useState<Station[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) setQuery(`${value.name} (${value.code})`);
  }, [value]);

  function onTextChange(text: string) {
    setQuery(text);
    onChange(null); // typing invalidates selection
    if (timer.current) clearTimeout(timer.current);
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    timer.current = setTimeout(async () => {
      const res = await searchStations(trimmed);
      if (res.success) {
        setResults(res.data.stations ?? []);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 350);
  }

  function pick(st: Station) {
    onChange(st);
    setQuery(`${st.name} (${st.code})`);
    setResults([]);
    setOpen(false);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <View testID={testID}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: colors.brandTertiary }]}>
          <MaterialDesignIcons name={icon as any} size={18} color={colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
          <TextInput
            testID={testID ? `${testID}-input` : undefined}
            value={query}
            onChangeText={onTextChange}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.input, { color: colors.onSurface }]}
          />
        </View>
        {query.length > 0 ? (
          <Pressable onPress={clear} hitSlop={10} testID={testID ? `${testID}-clear` : undefined}>
            <MaterialDesignIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surfaceTertiary, borderColor: colors.border },
          ]}
          testID={testID ? `${testID}-dropdown` : undefined}
        >
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.brandPrimary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Searching stations...</Text>
            </View>
          ) : results.length === 0 ? (
            <Text style={[styles.empty, { color: colors.muted }]}>No stations found</Text>
          ) : (
            results.map((st, idx) => (
              <Pressable
                key={st.code + idx}
                testID={testID ? `${testID}-option-${st.code}` : undefined}
                onPress={() => pick(st)}
                style={({ pressed }) => [
                  styles.option,
                  { borderBottomColor: colors.divider, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionName, { color: colors.onSurface }]} numberOfLines={1}>
                    {st.name}
                  </Text>
                </View>
                <View style={[styles.codeChip, { backgroundColor: colors.brandTertiary }]}>
                  <Text style={[styles.codeText, { color: colors.brandPrimary }]}>{st.code}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  loading: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center" },
  loadingText: { fontSize: 12 },
  empty: { padding: 12, fontSize: 12 },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionName: { fontSize: 13, fontWeight: "600" },
  codeChip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.sm },
  codeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
});
