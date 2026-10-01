import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { ScreenHeader } from "@/src/components/screen-header";
import { LiveBadge } from "@/src/components/demo-badge";
import { TrainInfoData, readableDays, trainInfo } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

export default function TrainDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { number } = useLocalSearchParams<{ number: string }>();

  const [data, setData] = useState<TrainInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!number) return;
      setLoading(true);
      const res = await trainInfo(number);
      setLoading(false);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    })();
  }, [number]);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.surface }]} testID="train-detail-screen">
        <ScreenHeader title={number || "Train"} subtitle="Loading..." />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brandPrimary} />
          <Text style={[styles.centeredText, { color: colors.muted }]}>Fetching train details...</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.surface }]} testID="train-detail-screen">
        <ScreenHeader title={number || "Train"} />
        <View style={styles.centered}>
          <MaterialDesignIcons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.centeredText, { color: colors.error }]}>{error || "No data"}</Text>
        </View>
      </View>
    );
  }

  const { trainInfo: info, route } = data;
  const totalDist = route[route.length - 1]?.distance ?? "0";

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="train-detail-screen">
      <ScreenHeader title={info.train_no} subtitle={info.train_name} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <LiveBadge />
        <View style={[styles.summary, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.time, { color: colors.onSurface }]}>{info.from_time}</Text>
              <Text style={[styles.code, { color: colors.brandPrimary }]}>{info.from_stn_code}</Text>
              <Text style={[styles.stationName, { color: colors.muted }]} numberOfLines={1}>
                {info.from_stn_name}
              </Text>
            </View>
            <View style={styles.midCol}>
              <MaterialDesignIcons name="train" size={16} color={colors.muted} />
              <View style={[styles.hLine, { backgroundColor: colors.borderStrong }]} />
              <Text style={[styles.duration, { color: colors.brandPrimary }]}>{info.travel_time}</Text>
            </View>
            <View style={[{ flex: 1 }, { alignItems: "flex-end" }]}>
              <Text style={[styles.time, { color: colors.onSurface }]}>{info.to_time}</Text>
              <Text style={[styles.code, { color: colors.brandPrimary }]}>{info.to_stn_code}</Text>
              <Text style={[styles.stationName, { color: colors.muted }]} numberOfLines={1}>
                {info.to_stn_name}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.metaRow}>
            <Meta icon="calendar" label="Runs" value={readableDays(info.running_days)} />
            <Meta icon="map-marker-distance" label="Distance" value={`${totalDist} km`} />
            <Meta icon="train-car-passenger" label="Stops" value={`${route.length}`} />
          </View>
          {info.type ? (
            <View style={[styles.typeChip, { backgroundColor: colors.brandTertiary }]}>
              <Text style={[styles.typeText, { color: colors.brandPrimary }]}>{info.type}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.muted }]}>QUICK ACTIONS</Text>
        <View style={styles.actionRow}>
          <ActionBtn
            icon="radar"
            label="Live Status"
            onPress={() => router.push({ pathname: "/live-status", params: { number: info.train_no } })}
            testID="detail-action-live"
          />
          <ActionBtn
            icon="seat-passenger"
            label="Availability"
            onPress={() =>
              router.push({
                pathname: "/seat-availability",
                params: { number: info.train_no, from: info.from_stn_code, to: info.to_stn_code },
              })
            }
            testID="detail-action-availability"
          />
          <ActionBtn
            icon="map-marker-path"
            label="Route"
            onPress={() => router.push({ pathname: "/train-route", params: { number: info.train_no } })}
            testID="detail-action-route"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.muted }]}>ROUTE PREVIEW</Text>
        <View style={{ gap: spacing.sm }}>
          {route.slice(0, 5).map((stop, idx) => (
            <View
              key={stop.stnCode + idx}
              style={[styles.routePreviewRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={[styles.routeDot, { backgroundColor: colors.brandPrimary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeStn, { color: colors.onSurface }]} numberOfLines={1}>
                  {stop.stnName}
                </Text>
                <Text style={[styles.routeMeta, { color: colors.muted }]}>
                  {stop.stnCode} · {stop.distance} km · Day {stop.day}
                </Text>
              </View>
              <Text style={[styles.routeTime, { color: colors.brandPrimary }]}>{stop.departure}</Text>
            </View>
          ))}
          {route.length > 5 ? (
            <Pressable
              testID="detail-see-full-route"
              onPress={() => router.push({ pathname: "/train-route", params: { number: info.train_no } })}
              style={({ pressed }) => [
                styles.seeMore,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.seeMoreText, { color: colors.brandPrimary }]}>
                See all {route.length} stops →
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <MaterialDesignIcons name={icon as any} size={16} color={colors.brandPrimary} />
      <View>
        <Text style={[styles.metaLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.metaValue, { color: colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, testID }: { icon: string; label: string; onPress: () => void; testID: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.brandTertiary }]}>
        <MaterialDesignIcons name={icon as any} size={20} color={colors.brandPrimary} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  centeredText: { fontSize: 13 },
  summary: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center" },
  time: { fontSize: 22, fontWeight: "800" },
  code: { fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 4 },
  stationName: { fontSize: 11, marginTop: 2 },
  midCol: { alignItems: "center", gap: 6, width: 90 },
  hLine: { width: "100%", height: 1 },
  duration: { fontSize: 11, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  metaValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  typeChip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  typeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  action: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 12, fontWeight: "700" },
  routePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeStn: { fontSize: 13, fontWeight: "700" },
  routeMeta: { fontSize: 11, marginTop: 2 },
  routeTime: { fontSize: 14, fontWeight: "800" },
  seeMore: {
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  seeMoreText: { fontSize: 13, fontWeight: "700" },
});
