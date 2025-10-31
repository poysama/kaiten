
# Board Game Spinner v2 (Vite + React) - Vercel-ready

## What is included
- Vite + React frontend (src/)
- Serverless API endpoints (api/) using ES modules
- Redis integration (`ioredis`) expecting `REDIS_URL`
- Admin endpoints protected by JWT; initial credentials via env:
  - ADMIN_USER (default: admin)
  - ADMIN_PASS (default: admin)
  - ADMIN_JWT_SECRET (default: replace_secret)
- Endpoints:
  - `GET /api/pick` - returns `{ index, pick }`
  - `POST /api/confirm` - body `{ id }`
  - `POST /api/skip` - body `{ id }`
  - `GET /api/stats` - leaderboard data
  - `GET /api/admin/games` - get games (public)
  - `POST /api/admin/games` - create game (requires Authorization Bearer token)
  - `POST /api/admin/login` - login to get token
  - `GET /api/health` - test Redis connection
  - `POST /api/reset-stats` - reset all stats to zero (admin only)
  - `GET /api/seed-sample` - seed sample games if empty

## Deploy to Vercel (using Vercel UI)
1. Push this repo to GitHub.
2. In Vercel, import the GitHub repo and select framework `Vite`.
3. Set environment variables in Vercel:
   - `REDIS_URL` (your Redis connection URL)
   - `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_JWT_SECRET`
4. (Optional) Call `/api/seed-sample` once to populate initial games.
5. Deploy. Vercel will install dependencies and build automatically.

Footer displays: `Board Game Wheel Spinner • v10/31/2025 • a0cdab6`
