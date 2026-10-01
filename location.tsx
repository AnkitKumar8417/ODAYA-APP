import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { ScreenHeader } from "@/src/components/screen-header";
import { getWeather, searchLocation, LocationResult, WeatherData } from "@/src/data/api";
import { useTheme, spacing, radius } from "@/src/theme";

const weatherText = (code: number) => {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather";
};

export default function LocationWeather() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;
    setBusy(true); setError("");
    const res = await searchLocation(query);
    setBusy(false);
    if (res.success) setResults(res.data); else setError(res.error);
  }
  async function choose(place: LocationResult) {
    setSelected(place); setResults([]); setBusy(true); setError("");
    const res = await getWeather(place.latitude, place.longitude);
    setBusy(false);
    if (res.success) setWeather(res.data); else setError(res.error);
  }

  return <View style={[styles.root, { backgroundColor: colors.surface }]}>
    <ScreenHeader title="Location & Weather" subtitle="Search any destination" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.search, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <MaterialDesignIcons name="map-search-outline" size={21} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="City, station or destination" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.onSurface }]} />
        <Pressable onPress={search} style={[styles.searchBtn, { backgroundColor: colors.brandPrimary }]}><MaterialDesignIcons name="magnify" size={20} color={colors.onBrandPrimary} /></Pressable>
      </View>
      {busy && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.brandPrimary} />}
      {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      {results.map((r, i) => <Pressable key={`${r.name}-${i}`} onPress={() => choose(r)} style={[styles.result, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <MaterialDesignIcons name="map-marker" size={22} color={colors.brandPrimary} />
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.onSurface }]}>{r.name}</Text><Text style={[styles.muted, { color: colors.muted }]}>{[r.admin1, r.country].filter(Boolean).join(", ")}</Text></View>
      </Pressable>)}
      {selected && weather && <>
        <View style={[styles.weatherCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.row}><View><Text style={[styles.place, { color: colors.onSurface }]}>{selected.name}</Text><Text style={[styles.muted, { color: colors.muted }]}>{weatherText(weather.current.weather_code)}</Text></View><MaterialDesignIcons name="weather-partly-cloudy" size={52} color={colors.brandPrimary} /></View>
          <Text style={[styles.temp, { color: colors.onSurface }]}>{Math.round(weather.current.temperature_2m)}°C</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>Feels like {Math.round(weather.current.apparent_temperature)}°C · Humidity {weather.current.relative_humidity_2m}% · Wind {Math.round(weather.current.wind_speed_10m)} km/h</Text>
        </View>
        <Text style={[styles.section, { color: colors.onSurface }]}>7-day forecast</Text>
        {weather.daily.time.map((day, i) => <View key={day} style={[styles.forecast, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}><Text style={[styles.day, { color: colors.onSurface }]}>{new Date(day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</Text><Text style={[styles.muted, { color: colors.muted }]}>{weatherText(weather.daily.weather_code[i])}</Text><Text style={[styles.range, { color: colors.onSurface }]}>{Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°</Text><Text style={[styles.rain, { color: colors.info }]}>{weather.daily.precipitation_probability_max[i]}% rain</Text></View>)}
        <View style={styles.actions}><Pressable onPress={() => router.push({ pathname: "/nearby", params: { lat: selected.latitude, lon: selected.longitude, name: selected.name } })} style={[styles.action, { backgroundColor: colors.brandPrimary }]}><MaterialDesignIcons name="hospital-building" size={19} color={colors.onBrandPrimary}/><Text style={{ color: colors.onBrandPrimary, fontWeight: "800" }}>Nearby places</Text></Pressable><Pressable onPress={() => router.push({ pathname: "/map", params: { lat: selected.latitude, lon: selected.longitude, name: selected.name } })} style={[styles.action, { backgroundColor: colors.surfaceTertiary }]}><MaterialDesignIcons name="map" size={19} color={colors.onSurface}/><Text style={{ color: colors.onSurface, fontWeight: "800" }}>Open map</Text></Pressable></View>
      </>}
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1},content:{padding:spacing.lg,paddingBottom:spacing.xxxl},search:{minHeight:54,borderRadius:radius.lg,borderWidth:1,flexDirection:"row",alignItems:"center",paddingLeft:spacing.md,gap:spacing.sm},input:{flex:1,fontSize:15,paddingVertical:12},searchBtn:{width:42,height:42,borderRadius:12,alignItems:"center",justifyContent:"center",marginRight:5},result:{flexDirection:"row",alignItems:"center",gap:spacing.md,padding:spacing.md,borderWidth:1,borderRadius:radius.md,marginTop:spacing.sm},title:{fontSize:15,fontWeight:"800"},muted:{fontSize:12,marginTop:3},error:{marginTop:spacing.md},weatherCard:{borderWidth:1,borderRadius:radius.lg,padding:spacing.lg,marginTop:spacing.lg},row:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},place:{fontSize:20,fontWeight:"900"},temp:{fontSize:48,fontWeight:"900",marginTop:spacing.md},section:{fontSize:16,fontWeight:"900",marginTop:spacing.xl,marginBottom:spacing.sm},forecast:{borderWidth:1,borderRadius:radius.md,padding:spacing.md,marginTop:spacing.sm,flexDirection:"row",alignItems:"center",gap:spacing.md},day:{fontWeight:"800",width:80},range:{fontWeight:"800",marginLeft:"auto"},rain:{fontSize:11},actions:{flexDirection:"row",gap:spacing.sm,marginTop:spacing.lg},action:{flex:1,minHeight:48,borderRadius:radius.md,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:7}});
