# dresscode

## Run locally

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
- For real iPhone, API base URL should use your Mac IP (e.g. http://192.168.0.100:3000)