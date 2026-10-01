import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { LiveBadge } from "@/src/components/demo-badge";
import { PnrData, pnrStatus } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

export default function PnrStatusScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pnr, setPnr] = useState("");
  const [result, setResult] = useState<PnrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = pnr.replace(/\D/g, "").length === 10;

  async function doCheck() {
    if (!canSearch) {
      setError("Enter a valid 10-digit PNR");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    const res = await pnrStatus(pnr);
    setLoading(false);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="pnr-status-screen">
      <ScreenHeader title="PNR Status" subtitle="Live from Indian Railways" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: spacing.md }}>
            <LiveBadge />
          </View>
          <View style={[styles.inputCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.muted }]}>PNR NUMBER</Text>
            <TextInput
              testID="pnr-input"
              value={pnr}
              onChangeText={(v) => setPnr(v.replace(/\s/g, "").slice(0, 10))}
              placeholder="1234567890"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={10}
              style={[styles.pnrInput, { color: colors.onSurface }]}
            />
            <Text style={[styles.helper, { color: colors.muted }]}>{pnr.length}/10 digits</Text>
          </View>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.error }]}>
              <MaterialDesignIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            testID="pnr-check-button"
            disabled={!canSearch || loading}
            onPress={doCheck}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: canSearch ? colors.brandPrimary : colors.surfaceTertiary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <MaterialDesignIcons
                  name="ticket-confirmation"
                  size={20}
                  color={canSearch ? colors.onBrandPrimary : colors.muted}
                />
                <Text style={[styles.submitText, { color: canSearch ? colors.onBrandPrimary : colors.muted }]}>
                  Check status
                </Text>
              </>
            )}
          </Pressable>

          {result ? <PnrCard result={result} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PnrCard({ result }: { result: PnrData }) {
  const { colors } = useTheme();
  const firstPassenger = result.passengers?.[0];
  const current = firstPassenger?.current;
  const confirmed = current?.status === "CNF";
  const racOrWl = current?.status === "RAC" || current?.status?.startsWith("WL");

  return (
    <View
      style={[styles.resultCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
      testID="pnr-result-card"
    >
      <View style={styles.resultHeader}>
        <View>
          <Text style={[styles.resultPnrLabel, { color: colors.muted }]}>PNR</Text>
          <Text style={[styles.resultPnr, { color: colors.onSurface }]}>{result.pnr}</Text>
        </View>
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: confirmed
                ? colors.brandTertiary
                : racOrWl
                ? "rgba(255, 183, 77, 0.15)"
                : "rgba(239, 83, 80, 0.15)",
              borderColor: confirmed ? colors.brandPrimary : racOrWl ? colors.warning : colors.error,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: confirmed ? colors.success : racOrWl ? colors.warning : colors.error },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: confirmed ? colors.success : racOrWl ? colors.warning : colors.error },
            ]}
          >
            {confirmed ? "CONFIRMED" : racOrWl ? current?.status || "WAITING" : current?.status || "UNKNOWN"}
          </Text>
        </View>
      </View>

      <View style={[styles.rowSep, { backgroundColor: colors.divider }]} />

      <Text style={[styles.trainName, { color: colors.onSurface }]} numberOfLines={1}>
        {result.train.name}
      </Text>
      <Text style={[styles.trainNumber, { color: colors.brandPrimary }]}>
        {result.train.number} · {result.journey.dateOfJourney}
      </Text>

      <View style={styles.journeyRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.journeyCode, { color: colors.onSurface }]}>{result.journey.source.code}</Text>
          <Text style={[styles.journeyStation, { color: colors.muted }]} numberOfLines={1}>
            {result.journey.source.name}
          </Text>
        </View>
        <MaterialDesignIcons name="arrow-right" size={18} color={colors.brandPrimary} />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.journeyCode, { color: colors.onSurface }]}>{result.journey.destination.code}</Text>
          <Text style={[styles.journeyStation, { color: colors.muted }]} numberOfLines={1}>
            {result.journey.destination.name}
          </Text>
        </View>
      </View>

      <View style={[styles.rowSep, { backgroundColor: colors.divider }]} />

      <View style={styles.detailGrid}>
        <DetailCell label="Class" value={result.journey.class} />
        <DetailCell label="Quota" value={result.journey.quota} />
        <DetailCell label="Distance" value={`${result.journey.distance} km`} />
        <DetailCell label="Chart" value={result.chart.status} />
      </View>

      <View style={[styles.rowSep, { backgroundColor: colors.divider }]} />

      <View style={styles.fareRow}>
        <View>
          <Text style={[styles.fareLabel, { color: colors.muted }]}>TOTAL FARE</Text>
          <Text style={[styles.fareValue, { color: colors.brandPrimary }]}>₹{result.booking.fare}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.fareLabel, { color: colors.muted }]}>BOOKED</Text>
          <Text style={[styles.bookedText, { color: colors.onSurface }]}>{result.booking.bookingDate}</Text>
        </View>
      </View>

      <View style={[styles.rowSep, { backgroundColor: colors.divider }]} />

      <Text style={[styles.paxTitle, { color: colors.muted }]}>PASSENGERS ({result.passengers?.length ?? 0})</Text>
      <View style={{ gap: spacing.sm }}>
        {result.passengers?.map((p, idx) => {
          const isCnf = p.current.status === "CNF";
          return (
            <View
              key={idx}
              style={[styles.paxRow, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
              testID={`pnr-passenger-${idx}`}
            >
              <View style={styles.paxNum}>
                <Text style={[styles.paxNumText, { color: colors.brandPrimary }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paxLabel, { color: colors.muted }]}>{p.serialNumber}</Text>
                <Text style={[styles.paxCurrent, { color: colors.onSurface }]} numberOfLines={1}>
                  {p.current.details || "—"}
                </Text>
                <Text style={[styles.paxBooking, { color: colors.muted }]} numberOfLines={1}>
                  Booked: {p.booking.details || "—"}
                </Text>
              </View>
              <View
                style={[
                  styles.paxStatus,
                  {
                    backgroundColor: isCnf ? colors.brandTertiary : "rgba(255, 183, 77, 0.15)",
                    borderColor: isCnf ? colors.brandPrimary : colors.warning,
                  },
                ]}
              >
                <Text
                  style={[styles.paxStatusText, { color: isCnf ? colors.success : colors.warning }]}
                >
                  {p.current.status}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailCell}>
      <Text style={[styles.detailLabel, { color: colors.muted }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.detailValue, { color: colors.onSurface }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inputCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  inputLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  pnrInput: { fontSize: 28, fontWeight: "800", letterSpacing: 4, padding: 0 },
  helper: { fontSize: 11, marginTop: 6 },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  submit: {
    marginTop: spacing.md,
    paddingVertical: 16,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitText: { fontSize: 15, fontWeight: "800" },
  resultCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultPnrLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  resultPnr: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  rowSep: { height: StyleSheet.hairlineWidth },
  trainName: { fontSize: 16, fontWeight: "700" },
  trainNumber: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, marginTop: 2 },
  journeyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 4 },
  journeyCode: { fontSize: 16, fontWeight: "800" },
  journeyStation: { fontSize: 11, marginTop: 2 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap" },
  detailCell: { width: "50%", paddingVertical: 6 },
  detailLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  detailValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  fareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fareLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  fareValue: { fontSize: 24, fontWeight: "900", marginTop: 2 },
  bookedText: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  paxTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  paxRow: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  paxNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 230, 118, 0.12)",
  },
  paxNumText: { fontSize: 13, fontWeight: "800" },
  paxLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  paxCurrent: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  paxBooking: { fontSize: 11, marginTop: 2 },
  paxStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  paxStatusText: { fontSize: 11, fontWeight: "800" },
});
