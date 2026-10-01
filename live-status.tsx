import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  LiveTrainData,
  TrainHistoryData,
  toDDMMYYYY,
  trainHistory,
  trainLive,
} from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

type Tab = "live" | "history";

interface HistoryDay {
  dateIso: string;
  dateLabel: string;
  loading: boolean;
  loaded: boolean;
  record?: TrainHistoryData;
  error?: string;
}

export default function LiveStatusScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ number?: string }>();

  const [input, setInput] = useState(params.number ?? "");
  const [trainNumber, setTrainNumber] = useState(params.number ?? "");
  const [tab, setTab] = useState<Tab>("live");

  const [live, setLive] = useState<LiveTrainData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryDay[]>([]);

  const canFetch = /^\d{5}$/.test(trainNumber);

  const fetchLive = useCallback(async () => {
    if (!canFetch) return;
    setLiveLoading(true);
    setLiveError(null);
    const res = await trainLive(trainNumber);
    setLiveLoading(false);
    if (res.success) {
      setLive(res.data);
    } else {
      setLiveError(res.error);
      setLive(null);
    }
  }, [trainNumber, canFetch]);

  useEffect(() => {
    if (canFetch && tab === "live") fetchLive();
  }, [canFetch, tab, fetchLive]);

  const fetchHistory = useCallback(async () => {
    if (!canFetch) return;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days: HistoryDay[] = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (i + 1));
      return {
        dateIso: toDDMMYYYY(d),
        dateLabel: `${d.getDate()} ${months[d.getMonth()]}`,
        loading: true,
        loaded: false,
      };
    });
    setHistory(days);
    const results = await Promise.all(days.map((d) => trainHistory(trainNumber, d.dateIso)));
    setHistory(
      days.map((d, i) => {
        const res = results[i];
        if (res.success) {
          return { ...d, loading: false, loaded: true, record: res.data };
        }
        return { ...d, loading: false, loaded: true, error: res.error };
      }),
    );
  }, [trainNumber, canFetch]);

  useEffect(() => {
    if (canFetch && tab === "history") fetchHistory();
  }, [canFetch, tab, fetchHistory]);

  function submit() {
    const cleaned = input.replace(/\D/g, "").slice(0, 5);
    setInput(cleaned);
    setTrainNumber(cleaned);
    setLive(null);
    setHistory([]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="live-status-screen">
      <ScreenHeader
        title="Live Train Status"
        subtitle={live?.trainName || "Enter a train number"}
        rightIcon="refresh"
        onRightPress={() => (tab === "live" ? fetchLive() : fetchHistory())}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginTop: spacing.md }}>
            <LiveBadge />
          </View>

          <View
            style={[styles.inputCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          >
            <View style={styles.inputRow}>
              <View style={[styles.inputIcon, { backgroundColor: colors.brandTertiary }]}>
                <MaterialDesignIcons name="train" size={18} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>TRAIN NUMBER</Text>
                <TextInput
                  testID="live-train-input"
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
                testID="live-track-button"
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
                  name="radar"
                  size={18}
                  color={input.length === 5 ? colors.onBrandPrimary : colors.muted}
                />
              </Pressable>
            </View>
          </View>

          {canFetch ? (
            <View style={styles.tabRow}>
              <TabBtn label="LIVE" active={tab === "live"} onPress={() => setTab("live")} testID="tab-live" />
              <TabBtn label="7-DAY HISTORY" active={tab === "history"} onPress={() => setTab("history")} testID="tab-history" />
            </View>
          ) : null}

          {!canFetch ? (
            <View style={styles.hintBox}>
              <MaterialDesignIcons name="information-outline" size={16} color={colors.muted} />
              <Text style={[styles.hint, { color: colors.muted }]}>
                Enter a 5-digit train number (e.g. 12951, 12002, 12309) and tap the radar icon.
              </Text>
            </View>
          ) : tab === "live" ? (
            <LiveView
              live={live}
              loading={liveLoading}
              error={liveError}
            />
          ) : (
            <HistoryView days={history} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TabBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        {
          backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
          borderColor: active ? colors.brandPrimary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.tabText, { color: active ? colors.onBrandPrimary : colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

function LiveView({ live, loading, error }: { live: LiveTrainData | null; loading: boolean; error: string | null }) {
  const { colors } = useTheme();

  if (loading && !live) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brandPrimary} />
        <Text style={[styles.centerText, { color: colors.muted }]}>Fetching live status...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.error }]}>
        <MaterialDesignIcons name="alert-circle" size={18} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  if (!live) return null;

  const progress = Math.max(0, Math.min(100, Math.round(live.progress?.percent ?? 0)));
  const covered = live.progress?.currentDistanceKm ?? 0;
  const total = live.totalDistanceKm ?? covered;

  // find next upcoming station
  const upcomingIdx = live.timeline.findIndex((p) => p.status === "upcoming" || p.status === "current");
  const upcoming = live.timeline[upcomingIdx] ?? null;
  const currentIdx = live.timeline.findIndex((p) => p.status === "current");
  const current = live.timeline[currentIdx] ?? null;
  const stoppages = live.timeline.filter((p) => p.type === "stoppage");

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={[
          styles.delayBanner,
          { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
        ]}
        testID="live-delay-banner"
      >
        <MaterialDesignIcons name="information-outline" size={20} color={colors.brandPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.delayLabel, { color: colors.brandPrimary }]} numberOfLines={2}>
            {live.statusNote}
          </Text>
          <Text style={[styles.delaySub, { color: colors.muted }]}>Updated · {live.lastUpdate}</Text>
        </View>
      </View>

      <View style={[styles.block, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Text style={[styles.blockLabel, { color: colors.muted }]}>CURRENTLY AT</Text>
        <Text style={[styles.currentStation, { color: colors.onSurface }]}>
          {current?.stationName || live.currentStationCode}
        </Text>
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceTertiary }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.brandPrimary, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.muted }]}>
            {covered} / {total} km · {progress}%
          </Text>
        </View>
        {live.averageSpeedKmph ? (
          <View style={styles.speedRow}>
            <MaterialDesignIcons name="speedometer" size={14} color={colors.brandPrimary} />
            <Text style={[styles.speedText, { color: colors.onSurface }]}>
              Avg speed: {live.averageSpeedKmph.toFixed(1)} km/h
            </Text>
          </View>
        ) : null}
      </View>

      {upcoming && upcoming.stationCode !== (current?.stationCode ?? "") ? (
        <View style={[styles.block, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.blockLabel, { color: colors.muted }]}>NEXT STOP</Text>
          <View style={styles.nextRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextStation, { color: colors.onSurface }]} numberOfLines={1}>
                {upcoming.stationName}
              </Text>
              <Text style={[styles.nextSub, { color: colors.muted }]}>
                PF {upcoming.platform || "—"} · {upcoming.distanceKm || "—"} km
              </Text>
            </View>
            <View style={styles.timeCol}>
              <Text style={[styles.timeBig, { color: colors.brandPrimary }]}>
                {upcoming.arrival?.actual || upcoming.arrival?.scheduled || "--"}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.muted }]}>
                {upcoming.arrival?.delay || "ETA"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Stoppages list */}
      {stoppages.length > 0 ? (
        <View style={[styles.block, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.blockLabel, { color: colors.muted }]}>STOPPAGES</Text>
          <View style={{ gap: spacing.sm, marginTop: 4 }}>
            {stoppages.slice(0, 10).map((s, idx) => {
              const isCur = s.status === "current";
              const isPassed = s.status === "passed";
              return (
                <View key={s.stationCode + idx} style={styles.stopItem}>
                  <View
                    style={[
                      styles.stopDot,
                      {
                        backgroundColor: isCur ? colors.brandPrimary : isPassed ? colors.muted : colors.surfaceTertiary,
                        borderColor: isCur ? colors.brandPrimary : colors.borderStrong,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.stopName,
                        {
                          color: isPassed ? colors.muted : colors.onSurface,
                          fontWeight: isCur ? "800" : "600",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {s.stationName} · {s.stationCode}
                    </Text>
                    <Text style={[styles.stopMeta, { color: colors.muted }]} numberOfLines={1}>
                      Arr {s.arrival?.actual || s.arrival?.scheduled || "--"} ·
                      Dep {s.departure?.actual || s.departure?.scheduled || "--"} ·
                      PF {s.platform || "—"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HistoryView({ days }: { days: HistoryDay[] }) {
  const { colors } = useTheme();
  if (days.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.md }} testID="history-list">
      {days.map((d, idx) => {
        const rec = d.record;
        const last = rec?.stations?.[rec.stations.length - 1];
        const delay = last?.arrival?.delay ?? last?.departure?.delay;
        const onTime = typeof delay === "number" && delay <= 5;
        const color = rec
          ? onTime
            ? colors.success
            : colors.warning
          : colors.muted;
        return (
          <View
            key={d.dateIso}
            style={[styles.historyRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            testID={`history-day-${idx}`}
          >
            <View style={styles.histDayCol}>
              <Text style={[styles.histDay, { color: colors.onSurface }]}>{d.dateLabel.split(" ")[0]}</Text>
              <Text style={[styles.histMonth, { color: colors.muted }]}>
                {d.dateLabel.split(" ")[1]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {d.loading ? (
                <Text style={[styles.histLabel, { color: colors.muted }]}>Loading…</Text>
              ) : rec ? (
                <>
                  <Text style={[styles.histStatus, { color }]}>
                    {typeof delay === "number"
                      ? delay === 0
                        ? "ON TIME"
                        : delay <= 5
                        ? `${delay} MIN LATE`
                        : `DELAYED ${delay} MIN`
                      : "COMPLETED"}
                  </Text>
                  <Text style={[styles.histSub, { color: colors.muted }]} numberOfLines={1}>
                    {rec.sourceStationCode} → {rec.destinationStationCode}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.histStatus, { color: colors.muted }]}>NO DATA</Text>
                  <Text style={[styles.histSub, { color: colors.muted }]} numberOfLines={1}>
                    {d.error || "History not yet recorded"}
                  </Text>
                </>
              )}
            </View>
            <View
              style={[
                styles.histTag,
                {
                  backgroundColor:
                    rec && onTime ? colors.brandTertiary : "rgba(255, 183, 77, 0.14)",
                  borderColor: color,
                },
              ]}
            >
              <Text style={[styles.histTagText, { color }]}>
                {rec ? (typeof delay === "number" ? `${delay}m` : "DONE") : "—"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inputCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  inputIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  inputText: { fontSize: 20, fontWeight: "800", padding: 0, marginTop: 2, letterSpacing: 2 },
  trackBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: "center" },
  tabText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  hintBox: { marginTop: spacing.xl, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12, textAlign: "center" },
  delayBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  delayLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  delaySub: { fontSize: 11, marginTop: 2 },
  block: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  blockLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  currentStation: { fontSize: 24, fontWeight: "800" },
  progressWrap: { gap: 6, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%" },
  progressText: { fontSize: 11, fontWeight: "600" },
  speedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  speedText: { fontSize: 12, fontWeight: "600" },
  nextRow: { flexDirection: "row", alignItems: "center" },
  nextStation: { fontSize: 18, fontWeight: "800" },
  nextSub: { fontSize: 11, marginTop: 4 },
  timeCol: { alignItems: "flex-end" },
  timeBig: { fontSize: 22, fontWeight: "800" },
  timeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  stopItem: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  stopDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  stopName: { fontSize: 13 },
  stopMeta: { fontSize: 11, marginTop: 2 },
  center: { paddingVertical: spacing.xxxl, alignItems: "center", gap: spacing.md },
  centerText: { fontSize: 13 },
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
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  histDayCol: { width: 48 },
  histDay: { fontSize: 20, fontWeight: "800" },
  histMonth: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  histLabel: { fontSize: 12 },
  histStatus: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  histSub: { fontSize: 11, marginTop: 2 },
  histTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  histTagText: { fontSize: 11, fontWeight: "800" },
});
