# dresscode

## Run locally

### 0) Prepare environment variables
- Create `api/.env` and set:
	- `DATABASE_URL=postgresql://dresscode:dresscode@localhost:5432/dresscode?schema=public`
	- `OPENWEATHER_API_KEY=your_openweather_api_key`
- Create `mobile/.env` and set:
	- `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MAC_IP>:3000`

### 1) Start database (PostgreSQL)
docker compose up -d

### 2) Start API (NestJS)
cd api
npm run start:dev

### 3) Start Mobile (Expo)
cd mobile
npx expo start --lan

### Notes
- API health check: http://localhost:3000/health
- Prisma Studio: cd api && npx prisma studio (http://localhost:5555)
- For real iPhone, API URL in `mobile/.env` should use your Mac IP (e.g. `http://192.168.0.100:3000`)