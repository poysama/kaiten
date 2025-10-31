# Board Game Wheel Spinner

A beautiful, interactive board game selector with wheel spinner animation, statistics tracking, and multi-device collaboration support.

## Features

### Core Functionality
- **Wheel Spinner**: Randomly select a board game with smooth animation
- **Confirm/Skip System**: Stats only count when you confirm the selection
- **Statistics Tracking**: Track games played, skipped, and never selected
- **Leaderboards**: View most played and never played games
- **Reroll Limits**: Limited rerolls per day (based on number of players)

### Data Management
- **Admin Panel**: Easy-to-use interface for managing games and players
- **GitHub Integration**: Sync data across devices using GitHub repository
- **LocalStorage**: Automatic local backup with fallback support
- **Session Codes**: Share session codes to collaborate across devices
- **Import/Export**: Backup and restore your data

### Design
- **Board Game Arena Theme**: Blue, white, and orange color scheme
- **Desktop-Focused**: Optimized for desktop browsers
- **BoardGameGeek Images**: Automatic game image loading from BGG API
- **Responsive Layout**: Works on various screen sizes

## Quick Start

### 1. Deploy to GitHub Pages

1. Fork or clone this repository
2. Go to repository Settings > Pages
3. Select branch `main` (or your branch) as source
4. Save and wait for deployment
5. Access your app at `https://yourusername.github.io/repository-name/`

### 2. First Time Setup

1. Navigate to the **Admin** tab
2. Add players (affects daily reroll limit)
3. Games are pre-loaded, but you can add/remove them
4. Optionally configure GitHub sync for multi-device support

### 3. Start Spinning!

1. Go to the **Spinner** tab
2. Click "Spin the Wheel!"
3. When a game is selected, choose:
   - **Confirm**: Play this game (counts toward statistics)
   - **Skip**: Don't play this game (counts as skipped)
   - **Reroll**: Spin again (limited by daily reroll counter)

## How It Works

### Reroll System
- Daily reroll limit = Number of players in the system
- Counter resets every day at midnight
- Rerolls don't affect statistics

### Statistics
- **Games Played**: Only counts when you click "Confirm"
- **Games Skipped**: Only counts when you click "Skip"
- **Never Selected**: Games that have never been confirmed
- **Last Played**: Timestamp of last confirmation

### Data Storage

The app uses a three-tier storage approach:

1. **LocalStorage** (Primary): Data stored in browser
2. **GitHub Repository** (Sync): Optional cloud backup
3. **Session Codes**: Share data across devices

#### Setting Up GitHub Sync

1. Create a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scope: `repo` (for private repos) or `public_repo` (for public repos)
   - Copy the token

2. In the Admin panel:
   - Paste your token in "GitHub Personal Access Token"
   - Enter your repository as `username/repository-name`
   - Click "Save Settings"

3. Data will automatically sync to `spinner-data.json` in your repository

#### Using Session Codes

Session codes allow multiple devices to share the same data:

1. On the first device:
   - Go to Admin > Session Settings
   - Enter a session code (e.g., "game-night-2024")
   - Click "Create Session"

2. On other devices:
   - Go to Admin > Session Settings
   - Enter the same session code
   - Click "Join Session"
   - Data will sync from GitHub

## Initial Games List

The app comes pre-loaded with these games:

- Forest Shuffle
- Forest Shuffle Dartmoor
- It's a Wonderful World
- 7 Wonders
- Can't Stop
- Lost Ruins of Arnak
- Terra Mystica
- Clans of Caledonia
- Castle Combo
- The Guilds of Merchants and Explorers

## Admin Functions

### Managing Games
- **Add Game**: Enter name and optional BoardGameGeek ID
- **Remove Game**: Click remove button (also removes all stats for that game)
- **BGG ID**: Used to fetch game images from BoardGameGeek

### Managing Players
- **Add Player**: Enter player name
- **Remove Player**: Click remove button
- **Note**: Number of players affects daily reroll limit

### Data Management
- **Export Data**: Download JSON file of all data
- **Import Data**: Upload previously exported JSON file
- **Reset Data**: Clear all data (cannot be undone!)

## Technical Details

### Stack
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **APIs**:
  - GitHub REST API (data persistence)
  - BoardGameGeek XML API2 (game images)
- **Hosting**: GitHub Pages compatible

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- LocalStorage support required
- Canvas API support required

### File Structure
```
├── index.html      # Main application HTML
├── styles.css      # Board Game Arena themed styles
├── app.js          # Application logic
├── data.json       # Initial data structure
└── README.md       # This file
```

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

The wheel colors and design can be modified in `app.js` in the `drawWheel()` method:

```javascript
const colors = ['#2175d9', '#4a9eff', '#174d8a', '#5eb3ff'];
```

## Troubleshooting

### Images Not Loading
- Check that the BoardGameGeek ID is correct
- BGG API may be slow or temporarily unavailable
- Images require internet connection

### GitHub Sync Not Working
- Verify token has correct permissions
- Check repository name format: `username/repo`
- Ensure repository exists and token has access
- Check browser console for error messages

### Data Lost
- Export data regularly as backup
- Use GitHub sync for automatic cloud backup
- Check browser's LocalStorage hasn't been cleared

## Privacy & Security

- All data stored locally in browser by default
- GitHub token stored in LocalStorage (use with caution)
- Never share your GitHub token publicly
- Use a dedicated token with minimal permissions
- Consider using a private repository for sensitive data

## Contributing

Feel free to fork, modify, and improve this application!

## License

Free to use and modify for personal and commercial purposes.

## Credits

- Design inspired by Board Game Arena
- Game data from BoardGameGeek
- Built for board game enthusiasts everywhere!

---

**Enjoy your game nights!** 🎲🎮
