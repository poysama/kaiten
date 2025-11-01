# Kaiten Data Migration Guide

This guide covers how to migrate existing game data to support new features.

## What's Being Migrated

### 1. Game Length Property
All games now have a `length` property that can be:
- `short` - Quick games
- `medium` - Standard games (default)
- `long` - Extended games

**Migration action**: Games without a `length` property will receive `'medium'` as default.

### 2. Stats Validation
All games should have complete statistics:
- `picks` - Number of times game was selected
- `played` - Number of times game was confirmed and played
- `skipped` - Number of times game was selected but skipped
- `weight` - Calculated priority weight

**Migration action**:
- Games without stats will have fresh stats created (all zeros, weight 1.0)
- Games with incomplete stats will have missing fields added
- All weights will be recalculated to ensure accuracy

## How to Run Migration

### Option 1: Using the Migration Script (Recommended)

#### Check Migration Status
```bash
node scripts/migrate.js check
```

This will show you:
- How many games need updates
- Which games are missing properties
- Which stats need to be fixed
- **No changes are made**

#### Run Migration
```bash
node scripts/migrate.js run
```

This will:
- Add `length` property to all games (default: 'medium')
- Create missing stats
- Fix incomplete stats
- Recalculate all weights

### Option 2: Using the API Endpoint

#### Check Migration Status
```bash
curl http://localhost:3000/api/migrate
```

#### Run Migration
```bash
curl -X POST http://localhost:3000/api/migrate \
  -H "Content-Type: application/json" \
  -d '{"confirm":"MIGRATE"}'
```

### Option 3: Using Browser Console

#### Check Status
```javascript
fetch('/api/migrate')
  .then(r => r.json())
  .then(console.log)
```

#### Run Migration
```javascript
fetch('/api/migrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirm: 'MIGRATE' })
})
  .then(r => r.json())
  .then(console.log)
```

## Migration Details

### What Gets Updated

#### Game Object Structure
**Before:**
```json
{
  "id": "g_1234567890_123",
  "name": "Catan",
  "meta": {}
}
```

**After:**
```json
{
  "id": "g_1234567890_123",
  "name": "Catan",
  "length": "medium",
  "meta": {}
}
```

#### Stats Object Structure
**Before (if incomplete):**
```json
{
  "picks": "10",
  "played": "5"
}
```

**After:**
```json
{
  "picks": "10",
  "played": "5",
  "skipped": "5",
  "weight": "0.300"
}
```

### Weight Calculation
The weight is calculated using:
```javascript
weight = (1 + skipped/picks) × (1 / (1 + played))
```

- **Weight = 1.0**: New game (neutral priority)
- **Weight < 0.3**: Heavily played (low priority, appears faded)
- **Weight > 1.2**: Frequently skipped (high priority)

### Safety Features

1. **Dry-run capability**: Use `GET /api/migrate` to check without modifying data
2. **Confirmation required**: Must send `{ confirm: 'MIGRATE' }` to run migration
3. **Detailed reporting**: Shows exactly what was changed
4. **Error handling**: Reports any issues encountered
5. **Non-destructive**: Only adds missing data, doesn't delete anything

## After Migration

### Verify Migration Success

1. **Check Admin Panel**: Go to `/admin` and verify all games show length property
2. **Check Statistics**: Go to `/stats` and verify weights are displayed correctly
3. **Test Filtering**: Use the length filter on the main page
4. **Check Faded Games**: Games with weight < 0.3 should appear faded

### Update Game Lengths (Optional)

After migration, all games will have `length: 'medium'`. To set appropriate lengths:

1. Go to Admin Panel (`/admin`)
2. Click on each game to edit
3. Update the Length dropdown to Short, Medium, or Long
4. Save changes

### Adjust Stats (Optional)

If you want to manually adjust any statistics:

1. Go to Admin Panel (`/admin`)
2. Click on a game to edit
3. Modify Picks, Played, or Skipped values
4. Weight will auto-calculate
5. Save changes

## Troubleshooting

### Migration Fails

**Error: "REDIS_URL not set"**
- Ensure your `.env.local` file has `REDIS_URL` configured
- Restart your development server

**Error: "Connection refused"**
- Make sure Redis server is running
- Verify Redis URL is correct

### Migration Completes but Games Missing Properties

- Check the migration report for errors
- Verify specific game IDs mentioned in errors
- Re-run migration to fix any transient issues

### Stats Look Wrong

- Stats are calculated based on actual play history
- If you want to reset stats: Use "Reset All Stats" in Admin Panel
- If specific game is wrong: Edit manually in Admin Panel

## Rolling Back

If you need to revert changes:

### Remove Length Property (Not Recommended)
The application is designed to work with the length property. However, if needed:

1. The app handles missing `length` by defaulting to 'medium'
2. To clean up: Would need custom script to remove property from all games

### Reset Stats
Use the "Reset All Stats" button in Admin Panel to reset all statistics to zero.

## Production Deployment

### Before Deployment
1. Run migration check on staging environment first
2. Verify expected number of games and changes
3. Backup your Redis database if possible

### During Deployment
1. Deploy new code
2. Run migration immediately after deployment
3. Verify migration success
4. Monitor application logs

### After Deployment
1. Check production `/admin` panel
2. Verify stats page loads correctly
3. Test game selection with different length filters
4. Monitor for any errors

## Support

If you encounter issues:
1. Check migration report for detailed error messages
2. Review Redis connection logs
3. Verify all environment variables are set
4. Check that Redis version is compatible (Redis 6.0+)

## Future Migrations

This migration system can be extended for future data changes:
1. Add new migration checks in `/api/migrate/route.js`
2. Update the `GET` endpoint to detect new issues
3. Update the `POST` endpoint to fix new issues
4. Document in this file
