# Board Game Wheel Spinner

A beautiful, interactive board game selector with wheel spinner animation, statistics tracking, and cloud data persistence using Vercel + Redis.

## Features

### Core Functionality
- **Wheel Spinner**: Randomly select a board game with smooth animation
- **Confirm/Skip System**: Stats only count when you confirm the selection
- **Statistics Tracking**: Track games played, skipped, and never selected
- **Leaderboards**: View most played and never played games
- **Reroll Limits**: Limited rerolls per day (based on number of players)

### Data Management
- **Admin Panel**: Easy-to-use interface for managing games and players
- **Cloud Sync**: Automatic data sync to Vercel Redis backend
- **LocalStorage**: Automatic local backup with fallback support
- **Session Codes**: Share session codes to collaborate across devices
- **Import/Export**: Backup and restore your data

### Design
- **Board Game Arena Theme**: Blue, white, and orange color scheme
- **Desktop-Focused**: Optimized for desktop browsers
- **Large Text Display**: Clear, bold text when selecting games
- **Responsive Layout**: Works on various screen sizes

## Quick Start - Deploy to Vercel

### Prerequisites
- A Vercel account (free): https://vercel.com/signup
- Git installed on your computer
- Node.js 18+ installed

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy the App

```bash
# Navigate to your project directory
cd kaiten

# Login to Vercel
vercel login

# Deploy (follow the prompts)
vercel
```

When prompted:
- **Set up and deploy?** `Y`
- **Which scope?** Select your account
- **Link to existing project?** `N`
- **Project name?** `board-game-spinner` (or your choice)
- **Directory?** `./` (just press Enter)
- **Override settings?** `N`

### Step 3: Create Vercel KV (Redis) Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (`board-game-spinner`)
3. Go to the **Storage** tab
4. Click **Create Database**
5. Choose **KV (Redis)**
6. Name it: `spinner-db`
7. Click **Create**
8. The database will be automatically linked to your project!

### Step 4: Deploy with Environment Variables

```bash
# Redeploy to production with the KV database linked
vercel --prod
```

That's it! Your app is now live with a working Redis backend! 🎉

Your app will be available at: `https://your-project.vercel.app`

## How It Works

### Data Storage
- **Vercel KV (Redis)**: Stores all game data, players, and statistics
- **LocalStorage**: Browser cache for offline support and fast loading
- **Auto-Sync**: Data automatically saves to server on every change

### API Endpoints
- `GET /api/data` - Load game data from server
- `POST /api/data` - Save game data to server

### Session Codes
- Create a unique session code (e.g., "game-night-2024")
- Share the code with friends
- Everyone with the same code shares the same data!

## Using the App

### 1. First Time Setup

1. Go to the **Admin** tab
2. Add players (affects daily reroll limit)
3. Add your games
4. Start spinning!

### 2. Spinning the Wheel

1. Go to the **Spinner** tab
2. Click "Spin the Wheel!"
3. When a game is selected, choose:
   - **Confirm**: Play this game (counts toward statistics)
   - **Skip**: Don't play this game (counts as skipped)
   - **Reroll**: Spin again (limited by daily reroll counter)

### 3. Viewing Statistics

Go to the **Statistics** tab to see:
- Total games played
- Total games skipped
- Games never selected
- Detailed play history for each game

### 4. Leaderboards

Go to the **Leaderboard** tab to see:
- Most played games
- Games that have never been played

### 5. Admin Functions

**Managing Games:**
- Add Game: Enter name and click "Add Game"
- Remove Game: Click the remove button

**Managing Players:**
- Add Player: Enter name and click "Add Player"
- Remove Player: Click the remove button
- Note: Number of players affects daily reroll limit

**Session Management:**
- **Create Session**: Enter a code and click "Create Session"
- **Join Session**: Enter someone else's code and click "Join Session"
- All devices with the same session code share data!

**Data Management:**
- **Export Data**: Download JSON file of all data
- **Import Data**: Upload previously exported JSON file
- **Reset Statistics**: Clear play counts, skips, and reroll counter (keeps games & players)
- **Reset All Data**: Clear everything (cannot be undone!)

## Reroll System

- Daily reroll limit = Number of players in the system
- Counter resets every day at midnight
- Rerolls don't affect statistics

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run locally with Vercel dev server
vercel dev
```

This starts a local server at `http://localhost:3000` with hot reload and simulated Vercel KV.

### File Structure

```
├── index.html          # Main application HTML
├── styles.css          # Board Game Arena themed styles
├── app.js              # Application logic
├── data.json           # Initial data structure
├── api/
│   └── data.js         # Vercel serverless function for data API
├── package.json        # Node dependencies
├── vercel.json         # Vercel configuration
└── README.md           # This file
```

## Technical Details

### Stack
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Vercel KV (Redis)
- **Hosting**: Vercel (Free tier)

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- LocalStorage support required
- Canvas API support required

## Customization

### Changing Colors

Edit `styles.css` and modify the CSS variables:

```css
:root {
    --primary-blue: #2175d9;
    --primary-orange: #ff8c00;
    /* ... etc */
}
```

### Wheel Design

The wheel colors can be modified in `app.js` in the `drawWheel()` method:

```javascript
const colors = ['#2175d9', '#4a9eff', '#174d8a', '#5eb3ff'];
```

## Troubleshooting

### Data Not Syncing
- Check browser console (F12) for errors
- Make sure you deployed with `vercel --prod`
- Verify Vercel KV database is created and linked
- Try clicking the sync button (🔄 icon) manually

### App Not Loading
- Clear browser cache and hard refresh (Ctrl+F5)
- Check Vercel deployment logs in dashboard
- Make sure the deployment succeeded

### Session Not Working
- Both devices need to be on the same Vercel deployment URL
- Make sure session code is exactly the same (case-sensitive)
- Click "Join Session" to load data from server

## Vercel Free Tier Limits

- **Bandwidth**: 100 GB/month
- **Function Executions**: 100 GB-hours/month
- **KV Storage**: 256 MB storage
- **KV Commands**: 30,000 commands/month

These limits are more than enough for personal/small group use!

## Privacy & Security

- All data stored in your own Vercel KV database
- No third-party analytics or tracking
- Session codes are stored in Redis, not publicly accessible
- Data is not shared between different Vercel deployments

## Contributing

Feel free to fork, modify, and improve this application!

## License

Free to use and modify for personal and commercial purposes.

## Credits

- Design inspired by Board Game Arena
- Built for board game enthusiasts everywhere!

---

**Enjoy your game nights!** 🎲🎮
