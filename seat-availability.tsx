import React, { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { ScreenHeader } from "@/src/components/screen-header";
import { LiveBadge } from "@/src/components/demo-badge";
import { SeatAvailData, toDDMMYYYY, seatAvailability, trainInfo } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

const CLASSES = ["SL", "3A", "2A", "1A", "CC", "EC"] as const;
type ClassCode = (typeof CLASSES)[number];

const CLASS_LABELS: Record<ClassCode, string> = {
  SL: "Sleeper",
  "3A": "AC 3 Tier",
  "2A": "AC 2 Tier",
  "1A": "First AC",
  CC: "Chair Car",
  EC: "Executive",
};

function nextWeekDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toDDMMYYYY(d);
}

export default function SeatAvailabilityScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string; from?: string; to?: string }>();

  const [trainNo, setTrainNo] = useState(params.number ?? "");
  const [fromCode, setFromCode] = useState(params.from ?? "");
  const [toCode, setToCode] = useState(params.to ?? "");
  const [date] = useState(nextWeekDate());
  const [selectedClass, setSelectedClass] = useState<ClassCode>("3A");

  const [data, setData] = useState<SeatAvailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillBusy, setPrefillBusy] = useState(false);

  // If only a train number was passed, auto-fetch its origin/destination.
  useEffect(() => {
    if (trainNo.length === 5 && !fromCode && !toCode) {
      (async () => {
        setPrefillBusy(true);
        const info = await trainInfo(trainNo);
        setPrefillBusy(false);
        if (info.success) {
          setFromCode(info.data.trainInfo.from_stn_code);
          setToCode(info.data.trainInfo.to_stn_code);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canFetch = useMemo(
    () => /^\d{5}$/.test(trainNo) && fromCode.length >= 2 && toCode.length >= 2,
    [trainNo, fromCode, toCode],
  );

  async function doFetch() {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    setData(null);
    const res = await seatAvailability(trainNo, fromCode, toCode, date, selectedClass, "GN");
    setLoading(false);
    if (res.success) setData(res.data);
    else setError(res.error);
  }

  useEffect(() => {
    if (canFetch) doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="seat-availability-screen">
      <ScreenHeader title="Seat Availability" subtitle={data?.train?.trainName || "Live from Indian Railways"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: spacing.md }}>
            <LiveBadge />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>TRAIN NUMBER</Text>
                <TextInput
                  testID="avail-train-input"
                  value={trainNo}
                  onChangeText={(v) => setTrainNo(v.replace(/\D/g, "").slice(0, 5))}
                  placeholder="12951"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={5}
                  style={[styles.inputText, { color: colors.onSurface }]}
                />
              </View>
            </View>
            <View style={[styles.sep, { backgroundColor: colors.divider }]} />
            <View style={styles.inputRow2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>FROM</Text>
                <TextInput
                  testID="avail-from-input"
                  value={fromCode}
                  onChangeText={(v) => setFromCode(v.toUpperCase().slice(0, 5))}
                  placeholder="MMCT"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={[styles.codeText, { color: colors.onSurface }]}
                />
              </View>
              <MaterialDesignIcons name="arrow-right" size={16} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>TO</Text>
                <TextInput
                  testID="avail-to-input"
                  value={toCode}
                  onChangeText={(v) => setToCode(v.toUpperCase().slice(0, 5))}
                  placeholder="NDLS"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  style={[styles.codeText, { color: colors.onSurface }]}
                />
              </View>
            </View>
            <Pressable
              testID="avail-fetch-button"
              onPress={doFetch}
              disabled={!canFetch || loading || prefillBusy}
              style={({ pressed }) => [
                styles.submit,
                {
                  backgroundColor: canFetch ? colors.brandPrimary : colors.surfaceTertiary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading || prefillBusy ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <MaterialDesignIcons
                    name="seat-passenger"
                    size={18}
                    color={canFetch ? colors.onBrandPrimary : colors.muted}
                  />
                  <Text style={[styles.submitText, { color: canFetch ? colors.onBrandPrimary : colors.muted }]}>
                    Check availability
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>CLASS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CLASSES.map((cls) => {
              const active = cls === selectedClass;
              return (
                <Pressable
                  key={cls}
                  testID={`avail-class-chip-${cls}`}
                  onPress={() => setSelectedClass(cls)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
                      borderColor: active ? colors.brandPrimary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? colors.onBrandPrimary : colors.onSurface }]}>
                    {cls}
                  </Text>
                  <Text style={[styles.chipSub, { color: active ? colors.onBrandPrimary : colors.muted }]}>
                    {CLASS_LABELS[cls]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.error }]}>
              <MaterialDesignIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {data ? (
            <>
              <View style={[styles.summary, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={styles.summaryHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.summaryTrain, { color: colors.onSurface }]} numberOfLines={1}>
                      {data.train.trainName}
                    </Text>
                    <Text style={[styles.summaryRoute, { color: colors.muted }]} numberOfLines={1}>
                      {data.train.fromStationName} → {data.train.toStationName}
                    </Text>
                  </View>
                  <View style={[styles.classPill, { backgroundColor: colors.brandTertiary }]}>
                    <Text style={[styles.classPillText, { color: colors.brandPrimary }]}>{selectedClass}</Text>
                  </View>
                </View>
                <View style={[styles.sep, { backgroundColor: colors.divider }]} />
                <View style={styles.fareRow}>
                  <FareCell label="Base" value={`₹${data.fare.baseFare}`} />
                  <FareCell label="Reserv." value={`₹${data.fare.reservationCharge}`} />
                  <FareCell label="SF" value={`₹${data.fare.superfastCharge}`} />
                  <FareCell label="Total" value={`₹${data.fare.totalFare}`} highlight />
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.muted }]}>AVAILABILITY · GN QUOTA</Text>

              <View style={{ gap: spacing.sm }}>
                {data.availability.map((day, idx) => {
                  const status = (day.rawStatus || day.availabilityText || "").toUpperCase();
                  const isAvl = status.startsWith("AVL") || status.includes("AVAILABLE");
                  const isRac = status.includes("RAC");
                  const color = isAvl ? colors.success : isRac ? colors.warning : colors.error;
                  const bg = isAvl
                    ? colors.brandTertiary
                    : isRac
                    ? "rgba(255, 183, 77, 0.14)"
                    : "rgba(239, 83, 80, 0.14)";
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.availRow,
                        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      ]}
                      testID={`avail-row-${idx}`}
                    >
                      <View style={styles.dayCol}>
                        <Text style={[styles.dayNum, { color: colors.onSurface }]}>
                          {day.date.split("-")[0]}
                        </Text>
                        <Text style={[styles.dayMonth, { color: colors.muted }]}>
                          {day.date.split("-")[1]}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.availStatus, { color: colors.onSurface }]} numberOfLines={1}>
                          {day.availabilityText}
                        </Text>
                        {day.prediction ? (
                          <Text style={[styles.availSub, { color: colors.muted }]} numberOfLines={1}>
                            {day.prediction}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.tag, { backgroundColor: bg, borderColor: color }]}>
                        <Text style={[styles.tagText, { color }]}>
                          {isAvl ? "AVL" : isRac ? "RAC" : "WL"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FareCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fareCell}>
      <Text style={[styles.fareLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.fareValue, { color: highlight ? colors.brandPrimary : colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  inputRow: {},
  inputRow2: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  inputLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  inputText: { fontSize: 20, fontWeight: "800", padding: 0, marginTop: 2, letterSpacing: 2 },
  codeText: { fontSize: 18, fontWeight: "800", padding: 0, marginTop: 2, letterSpacing: 1 },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
  submit: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitText: { fontSize: 14, fontWeight: "800" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 72,
  },
  chipText: { fontSize: 13, fontWeight: "800" },
  chipSub: { fontSize: 10, marginTop: 2 },
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
  summary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  summaryTrain: { fontSize: 15, fontWeight: "800" },
  summaryRoute: { fontSize: 12, marginTop: 2 },
  classPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  classPillText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  fareRow: { flexDirection: "row" },
  fareCell: { flex: 1, alignItems: "center" },
  fareLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  fareValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  availRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dayCol: { width: 44, alignItems: "center" },
  dayNum: { fontSize: 20, fontWeight: "800" },
  dayMonth: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  availStatus: { fontSize: 14, fontWeight: "800" },
  availSub: { fontSize: 11, marginTop: 2 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
});
