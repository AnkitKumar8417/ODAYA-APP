import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { useTheme, spacing, radius } from "@/src/theme";

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

interface Feature {
  key: string;
  label: string;
  caption: string;
  icon: IconName;
  route: string;
  testId: string;
}

const FEATURES: Feature[] = [
  { key: "search", label: "Train Search", caption: "Live search", icon: "train", route: "/train-search", testId: "home-train-search" },
  { key: "pnr", label: "PNR Status", caption: "Real-time", icon: "ticket-confirmation", route: "/pnr-status", testId: "home-pnr-status" },
  { key: "live", label: "Live Status", caption: "Live tracking", icon: "radar", route: "/live-status", testId: "home-live-status" },
  { key: "seats", label: "Seat Avail", caption: "Live quota", icon: "seat-passenger", route: "/seat-availability", testId: "home-seat-availability" },
  { key: "fare", label: "Fare Split", caption: "Split cost", icon: "calculator-variant", route: "/fare-calculator", testId: "home-fare-calculator" },
  { key: "route", label: "Train Route", caption: "Full timeline", icon: "map-marker-path", route: "/train-route", testId: "home-train-route" },
  { key: "weather", label: "Weather", caption: "Destination forecast", icon: "weather-partly-cloudy", route: "/location", testId: "home-weather" },
  { key: "nearby", label: "Nearby", caption: "Hospitals & hotels", icon: "hospital-building", route: "/location", testId: "home-nearby" },
  { key: "map", label: "Map", caption: "Explore locations", icon: "map-outline", route: "/location", testId: "home-map" },
];

export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]} testID="home-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <LinearGradient
            colors={["rgba(0, 230, 118, 0.14)", "rgba(0, 230, 118, 0)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroRow}>
            <View style={[styles.logoWrap, { backgroundColor: colors.brandPrimary }]}>
              <MaterialDesignIcons name="train-car-passenger" size={26} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: colors.brandPrimary }]}>ODAYA</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>Railway companion</Text>
            </View>
            <View style={[styles.liveDotWrap, { borderColor: colors.brandPrimary }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.brandPrimary }]} />
              <Text style={[styles.liveText, { color: colors.onSurface }]}>v1</Text>
            </View>
          </View>

          <Text style={[styles.greeting, { color: colors.onSurface }]}>Where are you headed today?</Text>
          <Text style={[styles.subGreeting, { color: colors.muted }]}>
            Search trains, check PNR, track live status, weather and nearby places - all in one place.
          </Text>
        </View>

        {/* Primary CTA */}
        <Pressable
          testID="home-primary-cta"
          onPress={() => router.push("/train-search")}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.brandPrimary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <MaterialDesignIcons name="magnify" size={22} color={colors.onBrandPrimary} />
          <Text style={[styles.ctaText, { color: colors.onBrandPrimary }]}>Search trains</Text>
          <MaterialDesignIcons name="arrow-right" size={20} color={colors.onBrandPrimary} />
        </Pressable>

        {/* Section label */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBar, { backgroundColor: colors.brandPrimary }]} />
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Modules</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {FEATURES.map((f) => (
            <Pressable
              key={f.key}
              testID={f.testId}
              onPress={() => router.push(f.route as any)}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.brandTertiary }]}>
                <MaterialDesignIcons name={f.icon} size={22} color={colors.brandPrimary} />
              </View>
              <Text style={[styles.tileTitle, { color: colors.onSurface }]}>{f.label}</Text>
              <Text style={[styles.tileCaption, { color: colors.muted }]}>{f.caption}</Text>
            </Pressable>
          ))}
        </View>

        {/* Info strip */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <MaterialDesignIcons name="shield-check-outline" size={18} color={colors.brandPrimary} />
          <Text style={[styles.infoText, { color: colors.onSurfaceSecondary }]}>
            Powered by RailKit. Live Indian Railways data for every module above.
          </Text>
        </View>
      </ScrollView>

      {/* FAB - Assistant */}
      <Pressable
        testID="home-assistant-fab"
        onPress={() => router.push("/assistant")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.brandPrimary,
            bottom: insets.bottom + spacing.lg,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <MaterialDesignIcons name="robot-happy-outline" size={22} color={colors.onBrandPrimary} />
        <Text style={[styles.fabText, { color: colors.onBrandPrimary }]}>Assistant</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  liveDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
  },
  greeting: {
    marginTop: spacing.xl,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subGreeting: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  ctaText: { flex: 1, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tile: {
    width: "47.5%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: { fontSize: 14, fontWeight: "700" },
  tileCaption: { fontSize: 11 },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 16 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    boxShadow: "0px 6px 12px rgba(0, 230, 118, 0.3)",
    elevation: 10,
  },
  fabText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
});
