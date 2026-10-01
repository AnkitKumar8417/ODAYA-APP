import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { ScreenHeader } from "@/src/components/screen-header";
import { useTheme, spacing, radius } from "@/src/theme";

export default function FareCalculator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [fare, setFare] = useState("");
  const [people, setPeople] = useState("");

  const parsedFare = useMemo(() => parseFloat(fare || "0") || 0, [fare]);
  const parsedPeople = useMemo(() => Math.max(0, Math.floor(parseInt(people || "0", 10)) || 0), [people]);
  const perPerson = parsedPeople > 0 ? parsedFare / parsedPeople : 0;

  const canCompute = parsedFare > 0 && parsedPeople > 0;

  function setQuickPeople(n: number) {
    setPeople(String(n));
  }

  function reset() {
    setFare("");
    setPeople("");
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="fare-calculator-screen">
      <ScreenHeader title="Fare Calculator" subtitle="Split the ticket cost" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, marginTop: spacing.md }]}>
            <Text style={[styles.inputLabel, { color: colors.muted }]}>TOTAL FARE (₹)</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currency, { color: colors.brandPrimary }]}>₹</Text>
              <TextInput
                testID="fare-input"
                value={fare}
                onChangeText={(v) => setFare(v.replace(/[^0-9.]/g, "").slice(0, 10))}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[styles.amountInput, { color: colors.onSurface }]}
              />
            </View>

            <View style={[styles.sep, { backgroundColor: colors.divider }]} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>NUMBER OF PEOPLE</Text>
            <TextInput
              testID="people-input"
              value={people}
              onChangeText={(v) => setPeople(v.replace(/[^0-9]/g, "").slice(0, 3))}
              placeholder="e.g. 4"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              style={[styles.peopleInput, { color: colors.onSurface }]}
            />

            <View style={styles.quickRow}>
              {[2, 3, 4, 6].map((n) => (
                <Pressable
                  key={n}
                  testID={`quick-people-${n}`}
                  onPress={() => setQuickPeople(n)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      backgroundColor: parsedPeople === n ? colors.brandPrimary : colors.surfaceTertiary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickText,
                      { color: parsedPeople === n ? colors.onBrandPrimary : colors.onSurfaceTertiary },
                    ]}
                  >
                    {n} people
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Result receipt */}
          <View style={[styles.receipt, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} testID="fare-result-card">
            <View style={styles.receiptHeader}>
              <MaterialDesignIcons name="receipt-text-outline" size={20} color={colors.brandPrimary} />
              <Text style={[styles.receiptTitle, { color: colors.onSurface }]}>Split Breakdown</Text>
            </View>
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <Row label="Total fare" value={canCompute ? `₹${parsedFare.toFixed(2)}` : "—"} />
            <Row label="People" value={canCompute ? `${parsedPeople}` : "—"} />
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.muted }]}>PER PERSON</Text>
              <Text style={[styles.totalValue, { color: colors.brandPrimary }]} testID="per-person-value">
                {canCompute ? `₹${perPerson.toFixed(2)}` : "₹0.00"}
              </Text>
            </View>
          </View>

          <Pressable
            testID="fare-reset-button"
            onPress={reset}
            style={({ pressed }) => [
              styles.resetBtn,
              { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialDesignIcons name="restart" size={18} color={colors.onSurface} />
            <Text style={[styles.resetText, { color: colors.onSurface }]}>Reset</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  inputLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 6 },
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  currency: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    padding: 0,
  },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  peopleInput: {
    fontSize: 24,
    fontWeight: "800",
    padding: 0,
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  quickText: { fontSize: 12, fontWeight: "700" },
  receipt: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  receiptHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  receiptTitle: { fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 14, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  totalValue: { fontSize: 28, fontWeight: "900" },
  resetBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  resetText: { fontSize: 14, fontWeight: "700" },
});
