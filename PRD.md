# ODAYA - Railway Companion App (RailKit Integration)

Expo React Native mobile app for Indian Railways. Dark-first UI with neon green accents on black. Now powered by **live RailKit data** instead of sample data.

## Architecture
- **Expo frontend** (Expo SDK 57, Expo Router, react-native-safe-area-context, MaterialDesignIcons, expo-linear-gradient)
- **FastAPI backend** on :8001 - proxies RailKit via `/api/railkit/*`, plus `/api/chat` for the Groq-backed assistant
- **Node RailKit service** (supervisor-managed, 127.0.0.1:7001) - wraps the official `railkit` npm SDK and exposes JSON endpoints the FastAPI backend calls
- **MongoDB** for chat logs only

## Features
- **Home**: 6-tile dashboard + Assistant FAB
- **Train Search**: Stations typed in → autocomplete via RailKit `stationsByName` → `searchTrainBetweenStations` → results list
- **Train Detail**: `getTrainInfo` summary card + classes/type + route preview (first 5 stops)
- **PNR Status**: Real `checkPNRStatus` with passenger-by-passenger current/booking status, chart status, fare
- **Live Train Status**: `trackTrain` (DD-MM-YYYY) for current station, progress %, avg speed, stoppages. 7-DAY HISTORY tab calls `getTrainHistory` for each of the last 7 days
- **Seat Availability**: `getAvailability` with class chips (SL, 3A, 2A, 1A, CC, EC) + fare breakdown + per-day AVL/RAC/WL tags
- **Fare Calculator**: Simple split calculator (unchanged, no API needed)
- **Train Route**: `getTrainInfo` → full station-by-station timeline with arrival/departure/halt/day/distance
- **ODAYA Assistant**: Chatbot powered by Groq (`openai/gpt-oss-20b`) via `/api/chat`

## Env (backend/.env)
- `MONGO_URL`, `DB_NAME`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `RAILKIT_API_KEY` (user-provided)
- `RAILKIT_SERVICE_URL` (default `http://127.0.0.1:7001`)

## Backend endpoints
- `/api/health` - overall health, incl. `railkit_ready`
- `/api/chat` - Groq-powered assistant
- `/api/railkit/pnr/{pnr}`
- `/api/railkit/trains/between/{from}/{to}`
- `/api/railkit/trains/{number}/info`
- `/api/railkit/trains/{number}/live?date=DD-MM-YYYY`
- `/api/railkit/trains/{number}/history?date=DD-MM-YYYY`
- `/api/railkit/seats/{trainNo}/{from}/{to}/{date}/{coach}/{quota}`
- `/api/railkit/stations/search?name=...`
- `/api/railkit/stations/{code}`
