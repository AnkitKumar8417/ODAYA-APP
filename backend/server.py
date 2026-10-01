from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from groq import AsyncGroq

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "")
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[os.environ.get("DB_NAME", "odaya")] if client else None

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
RAILKIT_SERVICE_URL = os.environ.get("RAILKIT_SERVICE_URL", "http://127.0.0.1:7001")

SYSTEM_PROMPT = (
    "You are ODAYA Assistant, a friendly Indian Railways travel helper inside the ODAYA mobile app. "
    "Help users with PNR status, train search, seat availability, live train status, fare calculation, "
    "train routes, and general railway/travel advice. Keep answers short (2-4 sentences), practical, "
    "and friendly. When relevant, point users to the matching feature inside ODAYA (for example: "
    "\"Open PNR Status from the home screen\"). ODAYA now uses live Indian Railways data from RailKit. "
    "Never invent live schedules or fares, if you don't know ask the user to check the matching ODAYA screen."
)

app = FastAPI(title="ODAYA API")
api_router = APIRouter(prefix="/api")

_http_client: httpx.AsyncClient | None = None


def http() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(base_url=RAILKIT_SERVICE_URL, timeout=25.0)
    return _http_client


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


@api_router.get("/")
async def root():
    return {"message": "ODAYA API is running", "status": "ok"}


@api_router.get("/health")
async def health():
    rk_ok = False
    try:
        r = await http().get("/health", timeout=5.0)
        rk_ok = r.status_code == 200 and r.json().get("ok", False)
    except Exception:
        rk_ok = False
    return {
        "ok": True,
        "service": "odaya",
        "groq_configured": bool(GROQ_API_KEY),
        "railkit_ready": rk_ok,
    }


async def _railkit_get(path: str, params: dict | None = None):
    try:
        r = await http().get(path, params=params)
    except httpx.HTTPError as exc:
        logging.exception("RailKit service unreachable")
        raise HTTPException(status_code=502, detail="Railway service unavailable") from exc
    try:
        payload = r.json()
    except Exception:
        payload = {"success": False, "error": "Invalid upstream response"}
    status = 200 if payload.get("success") else (r.status_code if r.status_code >= 400 else 400)
    return JSONResponse(status_code=status, content=payload)


# --- RailKit proxy routes --------------------------------------------------


@api_router.get("/railkit/pnr/{pnr}")
async def pnr_status(pnr: str):
    return await _railkit_get(f"/pnr/{pnr}")


@api_router.get("/railkit/trains/between/{from_code}/{to_code}")
async def trains_between(from_code: str, to_code: str):
    return await _railkit_get(f"/trains/between/{from_code.upper()}/{to_code.upper()}")


@api_router.get("/railkit/trains/{number}/info")
async def train_info(number: str):
    return await _railkit_get(f"/trains/{number}/info")


@api_router.get("/railkit/trains/{number}/live")
async def train_live(number: str, date: str = "today"):
    return await _railkit_get(f"/trains/{number}/live", params={"date": date})


@api_router.get("/railkit/trains/{number}/history")
async def train_history(number: str, date: str):
    return await _railkit_get(f"/trains/{number}/history", params={"date": date})


@api_router.get("/railkit/seats/{train_no}/{from_code}/{to_code}/{date}/{coach}/{quota}")
async def seat_availability(
    train_no: str,
    from_code: str,
    to_code: str,
    date: str,
    coach: str,
    quota: str,
):
    return await _railkit_get(
        f"/seats/{train_no}/{from_code.upper()}/{to_code.upper()}/{date}/{coach.upper()}/{quota.upper()}"
    )


@api_router.get("/railkit/fare/{train_no}/{from_code}/{to_code}/{date}/{coach}/{quota}")
async def fare_lookup(
    train_no: str,
    from_code: str,
    to_code: str,
    date: str,
    coach: str,
    quota: str,
):
    return await _railkit_get(
        f"/fare/{train_no}/{from_code.upper()}/{to_code.upper()}/{date}/{coach.upper()}/{quota.upper()}"
    )


@api_router.get("/railkit/stations/search")
async def stations_search(name: str):
    return await _railkit_get("/stations/search", params={"name": name})


@api_router.get("/railkit/stations/{code}")
async def station_by_code(code: str):
    return await _railkit_get(f"/stations/{code.upper()}")


# --- Chat (unchanged) ------------------------------------------------------


@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Assistant is not configured")

    history = [
        {"role": m.role, "content": m.content[:2000]}
        for m in request.history[-10:]
        if m.role in {"user", "assistant"} and isinstance(m.content, str)
    ]

    groq = AsyncGroq(api_key=GROQ_API_KEY)
    try:
        result = await groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                *history,
                {"role": "user", "content": request.message},
            ],
            temperature=0.4,
            max_completion_tokens=400,
        )
        reply = (result.choices[0].message.content or "").strip()
        if not reply:
            reply = "Sorry, I couldn't generate a reply. Please try again."
    except Exception as exc:
        logging.exception("Groq chat failed")
        raise HTTPException(status_code=502, detail="Assistant is temporarily unavailable") from exc

    try:
        if db is not None:
            await db.chat_logs.insert_one(
            {
                "user_message": request.message,
                "reply": reply,
                "created_at": datetime.now(timezone.utc),
            }
        )
    except Exception:
        logging.exception("Failed to log chat")

    return ChatResponse(reply=reply)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()

# --- Location, weather & nearby places ------------------------------------

class LocationSearchResult(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: str | None = None
    admin1: str | None = None


@api_router.get("/location/search")
async def location_search(name: str):
    """Resolve a city/station/place name to coordinates using Open-Meteo geocoding."""
    if not name.strip():
        raise HTTPException(status_code=400, detail="Location is required")
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": name.strip(), "count": 8, "language": "en", "format": "json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(url, params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable") from exc
    results = [
        LocationSearchResult(
            name=x.get("name", "Unknown"),
            latitude=float(x["latitude"]),
            longitude=float(x["longitude"]),
            country=x.get("country"),
            admin1=x.get("admin1"),
        ).model_dump()
        for x in data.get("results", [])
        if "latitude" in x and "longitude" in x
    ]
    return {"success": True, "data": results}


@api_router.get("/weather")
async def weather(latitude: float, longitude: float):
    """Current weather + 7-day daily forecast for a coordinate."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        "forecast_days": 7,
        "timezone": "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as c:
            r = await c.get("https://api.open-meteo.com/v1/forecast", params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather service is temporarily unavailable") from exc
    return {"success": True, "data": data}


@api_router.get("/nearby")
async def nearby(latitude: float, longitude: float, kind: str = "hospital", radius: int = 5000):
    """Find nearby hospitals or hotels from OpenStreetMap via Overpass."""
    if kind not in {"hospital", "hotel"}:
        raise HTTPException(status_code=400, detail="kind must be hospital or hotel")
    radius = max(500, min(radius, 10000))
    tag = "amenity=hospital" if kind == "hospital" else "tourism=hotel"
    query = f"""[out:json][timeout:20];
(
  nwr[{tag}](around:{radius},{latitude},{longitude});
);
out center tags;"""
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    data = None
    last_error = None
    try:
        async with httpx.AsyncClient(timeout=25.0) as c:
            for endpoint in endpoints:
                try:
                    r = await c.post(endpoint, data={"data": query})
                    r.raise_for_status()
                    data = r.json()
                    break
                except httpx.HTTPError as exc:
                    last_error = exc
    except httpx.HTTPError as exc:
        last_error = exc
    if data is None:
        raise HTTPException(status_code=502, detail="Nearby places service is temporarily unavailable") from last_error

    places = []
    from math import atan2, cos, radians, sin, sqrt
    def distance_km(lat2, lon2):
        r_earth = 6371.0
        p1, p2 = radians(latitude), radians(lat2)
        dp = radians(lat2 - latitude)
        dl = radians(lon2 - longitude)
        a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
        return 2 * r_earth * atan2(sqrt(a), sqrt(1 - a))

    for el in data.get("elements", []):
        tags = el.get("tags") or {}
        center = el.get("center") or {}
        lat = el.get("lat", center.get("lat"))
        lon = el.get("lon", center.get("lon"))
        if lat is None or lon is None:
            continue
        places.append({
            "id": str(el.get("id")),
            "name": tags.get("name") or ("Hospital" if kind == "hospital" else "Hotel"),
            "latitude": float(lat),
            "longitude": float(lon),
            "distanceKm": round(distance_km(float(lat), float(lon)), 2),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "website": tags.get("website") or tags.get("contact:website"),
            "address": ", ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:city")])),
        })
    places.sort(key=lambda x: x["distanceKm"])
    return {"success": True, "data": places[:30], "kind": kind, "radiusMeters": radius}
