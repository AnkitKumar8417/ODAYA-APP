# ODAYA deployment

## 1. Backend on Render

The repository includes `render.yaml` with two web services:
- `odaya-api` (FastAPI)
- `odaya-railkit` (RailKit Node service)

Create a Render Blueprint from this repository. When prompted for secrets, provide:
- `GROQ_API_KEY`
- `RAILKIT_API_KEY`
- `MONGO_URL` only if chat logging/database features are wanted

Render wires `RAILKIT_SERVICE_URL` automatically to the RailKit service.

## 2. Frontend

Set `EXPO_PUBLIC_BACKEND_URL` to the public `odaya-api` Render URL. For local development, use the backend URL reachable from the phone/emulator rather than `localhost` on a physical device.

## 3. Android preview APK

From the `frontend` directory:

```bash
npm install
npx eas login
npx eas build:configure
eas build --platform android --profile preview
```

The `preview` profile produces an installable APK.

## 4. Google Play production

Use:

```bash
eas build --platform android --profile production
```

This produces an Android App Bundle (AAB) suitable for Google Play.
