// Frontend API client for the ODAYA backend (which proxies RailKit).
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`);
    const payload = await res.json();
    if (payload && typeof payload === "object" && "success" in payload) {
      return payload as ApiResult<T>;
    }
    return { success: false, error: `Unexpected response (${res.status})` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

// Format a Date (or today) as DD-MM-YYYY expected by RailKit.
export function toDDMMYYYY(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function todayPretty(d: Date = new Date()): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// --- Types (subset of RailKit responses) -----------------------------------

export interface Station {
  code: string;
  name: string;
  lat?: number;
  lon?: number;
}

export interface SearchTrain {
  train_no: string;
  train_name: string;
  source_stn_name: string;
  source_stn_code: string;
  dstn_stn_name: string;
  dstn_stn_code: string;
  from_stn_name: string;
  from_stn_code: string;
  to_stn_name: string;
  to_stn_code: string;
  from_time: string;
  to_time: string;
  travel_time: string;
  running_days: string; // "1111111"
  distance: string;
  halts: number;
}

export interface TrainInfoData {
  trainInfo: {
    train_no: string;
    train_name: string;
    from_stn_name: string;
    from_stn_code: string;
    to_stn_name: string;
    to_stn_code: string;
    from_time: string;
    to_time: string;
    travel_time: string;
    running_days: string;
    type?: string;
  };
  route: Array<{
    stnCode: string;
    stnName: string;
    arrival: string;
    departure: string;
    halt: string;
    distance: string;
    day: string;
    coordinates?: { latitude: number; longitude: number };
  }>;
}

export interface LiveTrainTimelinePoint {
  type: "stoppage" | "intermediate";
  status: "passed" | "current" | "upcoming";
  stationCode: string;
  stationName: string;
  platform?: string;
  distanceKm?: string;
  arrival?: { scheduled: string; actual: string; delay: string };
  departure?: { scheduled: string; actual: string; delay: string };
}

export interface LiveTrainData {
  trainNo: string;
  trainName: string;
  date: string;
  statusNote: string;
  lastUpdate: string;
  totalStations: number;
  currentStationCode: string;
  totalDistanceKm?: number;
  averageSpeedKmph?: number;
  progress?: {
    journeyStatus?: string;
    passedStations?: number;
    remainingStations?: number;
    currentDistanceKm?: number;
    distanceRemainingKm?: number;
    percent?: number;
  };
  timeline: LiveTrainTimelinePoint[];
}

export interface PnrData {
  pnr: string;
  train: { number: string; name: string };
  journey: {
    dateOfJourney: string;
    class: string;
    quota: string;
    source: { code: string; name: string };
    destination: { code: string; name: string };
    boardingPoint: { code: string; name: string };
    distance: number;
    arrivalDate: string;
  };
  chart: { status: string };
  booking: { fare: number; ticketFare: number; bookingDate: string };
  passengers: Array<{
    serialNumber: string;
    coachPosition?: number;
    booking: { status: string; coach: string | null; berthNo: number | null; berthCode: string | null; details: string };
    current: { status: string; coach: string | null; berthNo: number | null; berthCode: string | null; details: string };
  }>;
}

export interface SeatAvailDay {
  date: string;
  status: string;
  availabilityText: string;
  rawStatus?: string;
  prediction?: string;
  predictionPercentage?: number;
  canBook?: boolean;
}

export interface SeatAvailData {
  train: {
    trainNo: string;
    trainName: string;
    from: string;
    to: string;
    fromStationName: string;
    toStationName: string;
    distance: number;
    travelClass: string;
    quota: string;
  };
  fare: {
    baseFare: number;
    reservationCharge: number;
    superfastCharge: number;
    serviceTax?: number;
    totalFare: number;
  };
  availability: SeatAvailDay[];
}

export interface TrainHistoryData {
  historyKey: string;
  trainNo: string;
  trainName: string;
  journeyDate: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  stations: Array<{
    stationCode: string;
    stationName: string;
    platform?: string;
    distanceKm?: number;
    arrival: { scheduled: string; actual: string; delay: number };
    departure: { scheduled: string; actual: string; delay: number };
  }>;
  lastUpdate?: string;
}

// --- API calls -------------------------------------------------------------

export function searchStations(name: string) {
  return get<{ query: string; count: number; stations: Station[] }>(
    `/api/railkit/stations/search?name=${encodeURIComponent(name)}`,
  );
}

export function trainsBetween(from: string, to: string) {
  return get<SearchTrain[]>(`/api/railkit/trains/between/${from.toUpperCase()}/${to.toUpperCase()}`);
}

export function trainInfo(number: string) {
  return get<TrainInfoData>(`/api/railkit/trains/${number}/info`);
}

export function trainLive(number: string, date?: string) {
  const q = date ? `?date=${date}` : "";
  return get<LiveTrainData>(`/api/railkit/trains/${number}/live${q}`);
}

export function trainHistory(number: string, date: string) {
  return get<TrainHistoryData>(`/api/railkit/trains/${number}/history?date=${date}`);
}

export function pnrStatus(pnr: string) {
  return get<PnrData>(`/api/railkit/pnr/${pnr}`);
}

export function seatAvailability(
  trainNo: string,
  from: string,
  to: string,
  date: string,
  coach: string,
  quota: string,
) {
  return get<SeatAvailData>(
    `/api/railkit/seats/${trainNo}/${from.toUpperCase()}/${to.toUpperCase()}/${date}/${coach.toUpperCase()}/${quota.toUpperCase()}`,
  );
}

// Running days bitmask like "1111111" -> readable string.
export function readableDays(mask: string): string {
  if (!mask || mask.length !== 7) return "—";
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  if (mask === "1111111") return "Daily";
  const picked = labels.filter((_, i) => mask[i] === "1");
  return picked.join(" ");
}


export interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  timezone?: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  phone?: string;
  website?: string;
  address?: string;
}

export function searchLocation(name: string) {
  return get<LocationResult[]>(`/api/location/search?name=${encodeURIComponent(name)}`);
}

export function getWeather(latitude: number, longitude: number) {
  return get<WeatherData>(`/api/weather?latitude=${latitude}&longitude=${longitude}`);
}

export function getNearby(latitude: number, longitude: number, kind: "hospital" | "hotel", radius = 5000) {
  return get<NearbyPlace[]>(`/api/nearby?latitude=${latitude}&longitude=${longitude}&kind=${kind}&radius=${radius}`);
}
