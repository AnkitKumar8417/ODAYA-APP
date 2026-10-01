import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { ScreenHeader } from "@/src/components/screen-header";
import { useTheme } from "@/src/theme";

export default function MapScreen(){
  const { colors }=useTheme(); const p=useLocalSearchParams<{lat:string;lon:string;name:string}>(); const lat=Number(p.lat),lon=Number(p.lon);
  const html=useMemo(()=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body,#map{height:100%;margin:0;background:#050505}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([${lat},${lon}],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);L.marker([${lat},${lon}]).addTo(map).bindPopup(${JSON.stringify(p.name||"Location")}).openPopup();</script></body></html>`,[lat,lon,p.name]);
  return <View style={[styles.root,{backgroundColor:colors.surface}]}><ScreenHeader title="Map" subtitle={p.name||"Selected location"}/><WebView originWhitelist={["*"]} source={{html}} style={styles.web}/></View>
}
const styles=StyleSheet.create({root:{flex:1},web:{flex:1}});
