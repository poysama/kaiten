# Kaiten - Board Game Randomizer

A Next.js web app to randomly select board games from Board Game Arena. Pick games with a flashing grid animation, track statistics, and manage your game collection!

## Features

- **Game Randomizer**: Flashing grid animation to randomly select games
- **Game Management**: Admin panel to add, edit, and delete games (with authentication)
- **Statistics**: Track which games are most played, skipped, and picked
- **Modal Actions**: Confirm, skip, or re-spin after each selection
- **Redis Backend**: Fast, reliable data storage using Redis
- **Health Endpoint**: Monitor Redis connectivity and app stats

## Tech Stack

- **Next.js 14**: React framework with App Router
- **Redis**: Data storage via `ioredis`
- **Vercel**: Hosting platform

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (install with `npm install -g pnpm`)
- Docker & Docker Compose (for local Redis)

### Installation

```bash
pnpm install
```

### Local Development with Docker Redis

1. **Start Redis**:
   ```bash
   pnpm docker:up
   ```

2. **Verify Redis is running**:
   ```bash
   pnpm docker:logs
   ```

3. **Start the dev server**:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

5. **Stop Redis** (when done):
   ```bash
   pnpm docker:down
   ```

### Environment Variables

The `.env.local` file is already created for local development:

```env
REDIS_URL=redis://localhost:6379
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
```

For production on Vercel, set these environment variables:
- `REDIS_URL` - Your Redis connection URL
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password

### Build

```bash
pnpm build
pnpm start
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in Vercel
3. Set environment variable:
   - `REDIS_URL` (your Redis connection URL)
4. Deploy!

## API Routes

### Game Management
- `GET /api/games` - Get all games
- `POST /api/games` - Add a new game
- `PUT /api/games` - Update a game
- `DELETE /api/games` - Delete a game

### Game Selection
- `POST /api/pick` - Randomly pick a game
- `POST /api/confirm` - Mark game as played
- `POST /api/skip` - Mark game as skipped

### Statistics
- `GET /api/stats` - Get all statistics
- `POST /api/stats/reset` - Reset all statistics

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/check` - Check authentication status

### System
- `GET /api/health` - Health check (Redis ping, game count, system stats)

## Project Structure

```
kaiten/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication endpoints
│   │   ├── games/          # Game CRUD
│   │   ├── pick/           # Random selection
│   │   ├── confirm/        # Mark as played
│   │   ├── skip/           # Mark as skipped
│   │   ├── stats/          # Statistics
│   │   └── health/         # Health check
│   ├── admin/              # Admin page (authenticated)
│   ├── stats/              # Statistics page
│   ├── page.js             # Randomizer page (home)
│   └── layout.js           # Root layout
├── lib/
│   └── redis.js            # Redis client
├── WEIGHTED_SELECTION.md   # Algorithm design doc
└── package.json
```

## License

MIT
