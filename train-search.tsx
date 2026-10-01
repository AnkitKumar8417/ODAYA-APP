import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { ScreenHeader } from "@/src/components/screen-header";
import { LiveBadge } from "@/src/components/demo-badge";
import { StationPicker } from "@/src/components/station-picker";
import { Station, SearchTrain, trainsBetween, readableDays } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

export default function TrainSearch() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [results, setResults] = useState<SearchTrain[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => !!from && !!to && from.code !== to.code, [from, to]);

  async function doSearch() {
    if (!canSearch || !from || !to) return;
    setLoading(true);
    setResults(null);
    setError(null);
    const res = await trainsBetween(from.code, to.code);
    setLoading(false);
    if (res.success) {
      setResults(res.data);
    } else {
      setError(res.error);
      setResults([]);
    }
  }

  function openDetail(train: SearchTrain) {
    router.push({ pathname: "/train-detail", params: { number: train.train_no } });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="train-search-screen">
      <ScreenHeader title="Train Search" subtitle="Live from Indian Railways" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={results ?? []}
          keyExtractor={(t, idx) => `${t.train_no}-${idx}`}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <StationPicker
                  icon="train-car"
                  label="FROM"
                  placeholder="Mumbai Central"
                  value={from}
                  onChange={setFrom}
                  testID="search-from"
                />
                <View style={[styles.sep, { backgroundColor: colors.divider }]} />
                <StationPicker
                  icon="map-marker-check"
                  label="TO"
                  placeholder="New Delhi"
                  value={to}
                  onChange={setTo}
                  testID="search-to"
                />
              </View>

              <Pressable
                testID="search-submit-button"
                disabled={!canSearch || loading}
                onPress={doSearch}
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
                      name="magnify"
                      size={20}
                      color={canSearch ? colors.onBrandPrimary : colors.muted}
                    />
                    <Text style={[styles.submitText, { color: canSearch ? colors.onBrandPrimary : colors.muted }]}>
                      Search trains
                    </Text>
                  </>
                )}
              </Pressable>

              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsTitle, { color: colors.onSurface }]}>
                  {results === null
                    ? "Pick stations"
                    : loading
                    ? "Searching..."
                    : `${results.length} trains`}
                </Text>
                <LiveBadge compact />
              </View>

              {error ? (
                <View style={[styles.errorCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.error }]}>
                  <MaterialDesignIcons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !loading && results !== null ? (
              <View style={styles.empty}>
                <MaterialDesignIcons name="train-variant" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  No trains found between {from?.code} → {to?.code}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => <TrainResultCard train={item} onPress={() => openDetail(item)} />}
          testID="search-results-list"
        />
      </KeyboardAvoidingView>
    </View>
  );
}

function TrainResultCard({ train, onPress }: { train: SearchTrain; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={`train-card-${train.train_no}`}
      onPress={onPress}
      style={({ pressed }) => [
        trainCardStyles.card,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={trainCardStyles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[trainCardStyles.number, { color: colors.brandPrimary }]}>{train.train_no}</Text>
          <Text style={[trainCardStyles.name, { color: colors.onSurface }]} numberOfLines={1}>
            {train.train_name}
          </Text>
        </View>
        <View style={[trainCardStyles.daysChip, { backgroundColor: colors.surfaceTertiary }]}>
          <Text style={[trainCardStyles.daysText, { color: colors.muted }]}>{readableDays(train.running_days)}</Text>
        </View>
      </View>
      <View style={trainCardStyles.timeRow}>
        <View style={trainCardStyles.col}>
          <Text style={[trainCardStyles.time, { color: colors.onSurface }]}>{train.from_time}</Text>
          <Text style={[trainCardStyles.station, { color: colors.muted }]}>{train.from_stn_code}</Text>
          <Text style={[trainCardStyles.stationName, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
            {train.from_stn_name}
          </Text>
        </View>
        <View style={trainCardStyles.midCol}>
          <Text style={[trainCardStyles.duration, { color: colors.brandPrimary }]}>{train.travel_time}</Text>
          <View style={[trainCardStyles.line, { backgroundColor: colors.borderStrong }]} />
          <MaterialDesignIcons name="train" size={14} color={colors.muted} />
        </View>
        <View style={[trainCardStyles.col, { alignItems: "flex-end" }]}>
          <Text style={[trainCardStyles.time, { color: colors.onSurface }]}>{train.to_time}</Text>
          <Text style={[trainCardStyles.station, { color: colors.muted }]}>{train.to_stn_code}</Text>
          <Text style={[trainCardStyles.stationName, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
            {train.to_stn_name}
          </Text>
        </View>
      </View>
      <View style={trainCardStyles.footer}>
        <View style={trainCardStyles.footerItem}>
          <MaterialDesignIcons name="map-marker-distance" size={12} color={colors.muted} />
          <Text style={[trainCardStyles.footerText, { color: colors.muted }]}>{train.distance} km</Text>
        </View>
        <View style={trainCardStyles.footerItem}>
          <MaterialDesignIcons name="map-marker-multiple" size={12} color={colors.muted} />
          <Text style={[trainCardStyles.footerText, { color: colors.muted }]}>{train.halts} halts</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  sep: { height: StyleSheet.hairlineWidth },
  submit: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: radius.md,
  },
  submitText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.4 },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  resultsTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 12 },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  emptyText: { fontSize: 13 },
});

const trainCardStyles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  number: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4 },
  name: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  daysChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.sm },
  daysText: { fontSize: 10, fontWeight: "700" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  col: { flex: 1 },
  midCol: { alignItems: "center", gap: 4, width: 70 },
  time: { fontSize: 20, fontWeight: "800" },
  station: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  stationName: { fontSize: 11, marginTop: 2 },
  duration: { fontSize: 11, fontWeight: "700" },
  line: { width: "100%", height: 1 },
  footer: { flexDirection: "row", gap: spacing.lg },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 11, fontWeight: "600" },
});
