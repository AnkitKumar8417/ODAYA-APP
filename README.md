# Here are your Instructions

## ODAYA travel tools added
- Location search and weather: Open-Meteo geocoding + forecast (no API key required for normal non-commercial use).
- Nearby hospitals/hotels: OpenStreetMap Overpass data.
- Map: OpenStreetMap tiles rendered in the app through Leaflet/WebView.
- All provider calls are behind the FastAPI backend so providers can be swapped later without changing the mobile UI.
- No provider API keys are hard-coded.
