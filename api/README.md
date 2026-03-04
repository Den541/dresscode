# DressCode API

NestJS backend for weather data and clothing recommendations flow.

## Environment

Create `api/.env`:

```dotenv
DATABASE_URL=postgresql://dresscode:dresscode@localhost:5432/dresscode?schema=public
OPENWEATHER_API_KEY=your_openweather_api_key
```

## Run

```bash
npm install
npm run start:dev
```

API starts on `http://localhost:3000`.

## Endpoints

- `GET /health` → `{ "ok": true }`
- `GET /weather?city=Kyiv` → weather payload for the city

## Useful commands

```bash
npm run lint
npm run test
npm run build
npx prisma studio
```
