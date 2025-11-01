# Migration Quick Start

## What Changed?

Your Kaiten app now has these new features:
1. **Game Length Filter** - Games can be marked as Short, Medium, or Long
2. **Visual Priority Indicators** - Low priority games (played too often) appear faded
3. **Pick Probability** - Tooltips show actual % chance to be picked

## Do I Need to Migrate?

**YES** - if you have existing games in your database.

**NO** - if you're starting fresh with no games.

## How to Migrate (2 Simple Steps)

### Step 1: Check What Needs Migration

```bash
npm run migrate:check
```

or

```bash
pnpm migrate:check
```

This shows you what will be changed **without** making any changes.

### Step 2: Run Migration

```bash
npm run migrate:run
```

or

```bash
pnpm migrate:run
```

This will:
- ✅ Add `length: 'medium'` to all existing games
- ✅ Fix any missing stats
- ✅ Recalculate all weights for accuracy

## After Migration

### Update Game Lengths (Optional)

1. Go to `/admin` in your browser
2. Click on each game
3. Set the correct length (Short/Medium/Long)
4. Save

All games default to "Medium" after migration.

### Test the New Features

1. **Length Filter**: Main page now has a dropdown to filter by length
2. **Faded Games**: Heavily played games (weight < 0.3) appear faded
3. **Tooltips**: Hover over any game to see its pick probability %

## Troubleshooting

### "Cannot connect to Redis"
Make sure Redis is running:
```bash
npm run docker:up
```

### "REDIS_URL not set"
Check your `.env.local` file has:
```
REDIS_URL=redis://localhost:6379
```

### Migration Script Not Found
Make sure you're in the project root directory:
```bash
cd /path/to/kaiten
```

## Need More Help?

See [MIGRATION.md](./MIGRATION.md) for detailed documentation.
