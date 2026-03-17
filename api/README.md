# DressCode API

NestJS backend for weather data and clothing recommendations flow.

## Environment

Create `api/.env`:

```dotenv
DATABASE_URL=postgresql://dresscode:dresscode@localhost:5432/dresscode?schema=public
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
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
- `POST /auth/register` → register user and return access/refresh tokens
- `POST /auth/login` → login user and return access/refresh tokens
- `POST /auth/refresh` → refresh access/refresh tokens
- `POST /auth/logout` → revoke refresh token (Bearer auth)
- `GET /users/me` → current user profile (Bearer auth)
- `PATCH /users/me` → update profile fields (Bearer auth)

## Useful commands

```bash
npm run lint
npm run test
npm run build
npx prisma studio
```
