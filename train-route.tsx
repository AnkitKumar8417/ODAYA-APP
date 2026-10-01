import React, { useEffect, useState } from "react";
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
import { TrainInfoData, readableDays, trainInfo } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

export default function TrainRoute() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string }>();

  const [input, setInput] = useState(params.number ?? "");
  const [trainNumber, setTrainNumber] = useState(params.number ?? "");
  const [data, setData] = useState<TrainInfoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = /^\d{5}$/.test(trainNumber);

  useEffect(() => {
    if (!canFetch) return;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await trainInfo(trainNumber);
      setLoading(false);
      if (res.success) setData(res.data);
      else {
        setError(res.error);
        setData(null);
      }
    })();
  }, [trainNumber, canFetch]);

  function submit() {
    const cleaned = input.replace(/\D/g, "").slice(0, 5);
    setInput(cleaned);
    setTrainNumber(cleaned);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="train-route-screen">
      <ScreenHeader title="Train Route" subtitle={data?.trainInfo?.train_name || "Enter a train number"} />
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
              <View style={[styles.iconBox, { backgroundColor: colors.brandTertiary }]}>
                <MaterialDesignIcons name="train" size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>TRAIN NUMBER</Text>
                <TextInput
                  testID="route-train-input"
                  value={input}
                  onChangeText={(v) => setInput(v.replace(/\D/g, "").slice(0, 5))}
                  placeholder="e.g. 12951"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="search"
                  onSubmitEditing={submit}
                  style={[styles.inputText, { color: colors.onSurface }]}
                />
              </View>
              <Pressable
                testID="route-fetch-button"
                onPress={submit}
                disabled={input.length !== 5}
                style={({ pressed }) => [
                  styles.trackBtn,
                  {
                    backgroundColor: input.length === 5 ? colors.brandPrimary : colors.surfaceTertiary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <MaterialDesignIcons
                  name="map-marker-path"
                  size={18}
                  color={input.length === 5 ? colors.onBrandPrimary : colors.muted}
                />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.brandPrimary} />
              <Text style={[styles.centerText, { color: colors.muted }]}>Fetching route...</Text>
            </View>
          ) : error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.error }]}>
              <MaterialDesignIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : data ? (
            <RouteTimeline data={data} />
          ) : (
            <View style={styles.center}>
              <MaterialDesignIcons name="map-marker-path" size={48} color={colors.muted} />
              <Text style={[styles.centerText, { color: colors.muted }]}>
                Enter a 5-digit train number to see its complete station timeline.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RouteTimeline({ data }: { data: TrainInfoData }) {
  const { colors } = useTheme();
  const info = data.trainInfo;
  const route = data.route;
  const totalDist = route[route.length - 1]?.distance ?? "0";

  return (
    <View>
      <View style={[styles.summary, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Metric label="Stops" value={`${route.length}`} />
          <View style={[styles.vDiv, { backgroundColor: colors.divider }]} />
          <Metric label="Distance" value={`${totalDist} km`} />
          <View style={[styles.vDiv, { backgroundColor: colors.divider }]} />
          <Metric label="Duration" value={info.travel_time} />
          <View style={[styles.vDiv, { backgroundColor: colors.divider }]} />
          <Metric label="Runs" value={readableDays(info.running_days)} />
        </View>
      </View>

      <View style={styles.timeline}>
        {route.map((stop, idx) => {
          const first = idx === 0;
          const last = idx === route.length - 1;
          const nodeColor = first || last ? colors.brandPrimary : colors.onSurface;
          const lineColor = colors.borderStrong;
          return (
            <View key={stop.stnCode + idx} style={styles.timelineRow} testID={`route-stop-${idx}`}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.node,
                    {
                      backgroundColor: first || last ? colors.brandPrimary : colors.surface,
                      borderColor: nodeColor,
                    },
                  ]}
                >
                  {first || last ? (
                    <MaterialDesignIcons
                      name={first ? "flag" : "flag-checkered"}
                      size={10}
                      color={colors.onBrandPrimary}
                    />
                  ) : null}
                </View>
                {!last ? <View style={[styles.line, { backgroundColor: lineColor }]} /> : null}
              </View>
              <View style={[styles.stopCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={styles.stopHeader}>
                  <Text style={[styles.stationName, { color: colors.onSurface }]} numberOfLines={1}>
                    {stop.stnName}
                  </Text>
                  <Text style={[styles.stationCode, { color: colors.brandPrimary }]}>{stop.stnCode}</Text>
                </View>
                <View style={styles.stopMeta}>
                  <TimeCell label="Arr" value={stop.arrival} />
                  <TimeCell label="Dep" value={stop.departure} />
                  <TimeCell label="Halt" value={stop.halt?.replace(" min", "m") || "—"} />
                  <TimeCell label="Day" value={`D${stop.day}`} highlight />
                </View>
                <View style={[styles.distRow, { borderTopColor: colors.divider }]}>
                  <MaterialDesignIcons name="map-marker-distance" size={12} color={colors.muted} />
                  <Text style={[styles.distText, { color: colors.muted }]}>{stop.distance} km from origin</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.onSurface }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TimeCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.timeCell}>
      <Text style={[styles.timeLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.timeValue, { color: highlight ? colors.brandPrimary : colors.onSurface }]}>{value}</Text>
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
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  inputText: { fontSize: 20, fontWeight: "800", padding: 0, marginTop: 2, letterSpacing: 2 },
  trackBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  vDiv: { width: StyleSheet.hairlineWidth, height: 32, marginHorizontal: 6 },
  metric: { flex: 1, alignItems: "center" },
  metricLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  metricValue: { fontSize: 13, fontWeight: "800", marginTop: 2 },
  center: { paddingVertical: spacing.xxxl, alignItems: "center", gap: spacing.md },
  centerText: { fontSize: 13, textAlign: "center" },
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
  timeline: { marginTop: spacing.lg },
  timelineRow: { flexDirection: "row" },
  timelineLeft: { width: 32, alignItems: "center" },
  node: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  line: { width: 2, flex: 1, marginTop: 2 },
  stopCard: {
    flex: 1,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  stopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stationName: { flex: 1, fontSize: 15, fontWeight: "700" },
  stationCode: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  stopMeta: { flexDirection: "row", marginTop: spacing.sm },
  timeCell: { flex: 1 },
  timeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  timeValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  distRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distText: { fontSize: 11 },
});
