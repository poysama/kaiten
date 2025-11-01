# Weighted Game Selection Algorithm

## Overview

This document describes the proposed weighted selection algorithm to ensure fair game rotation based on play history and skip frequency.

## Problem Statement

Currently, games are selected purely at random. This can lead to:
- Same games being picked repeatedly while others are ignored
- Games that are frequently skipped keep appearing
- No consideration for play balance across the game library

## Proposed Solution

Implement a **fairness-based weighted selection** that considers both skip frequency and play count.

## Algorithm Design

### Weight Calculation

For each game, calculate a composite weight based on:

1. **Skip Weight** - Games skipped more get higher priority
   ```javascript
   skipWeight = 1 + (skips / Math.max(picks, 1))
   ```
   - Games never picked: weight = 1
   - Games picked but always skipped: weight increases
   - Games with low skip rate: weight stays near 1

2. **Play Weight** - Games played more get lower priority
   ```javascript
   playWeight = 1 / (1 + played)
   ```
   - Never played: weight = 1
   - Played once: weight = 0.5
   - Played 5 times: weight = 0.167
   - Played 10 times: weight = 0.091

3. **Combined Weight**
   ```javascript
   finalWeight = skipWeight * playWeight
   ```

4. **Never-Picked Bonus**
   ```javascript
   if (picks === 0) {
     finalWeight = Math.max(finalWeight, 2.0); // Ensure minimum weight
   }
   ```

### Selection Process

```javascript
function weightedRandomSelection(games, stats) {
  const weights = [];
  let totalWeight = 0;

  // Calculate weights for each game
  games.forEach(game => {
    const stat = stats[game.id] || { picks: 0, played: 0, skipped: 0 };

    const skipWeight = 1 + (stat.skipped / Math.max(stat.picks, 1));
    const playWeight = 1 / (1 + stat.played);
    let weight = skipWeight * playWeight;

    // Bonus for never-picked games
    if (stat.picks === 0) {
      weight = Math.max(weight, 2.0);
    }

    weights.push(weight);
    totalWeight += weight;
  });

  // Select using weighted random
  let random = Math.random() * totalWeight;
  for (let i = 0; i < games.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return games[i];
    }
  }

  return games[games.length - 1]; // Fallback
}
```

## Examples

### Scenario 1: Balanced Selection

| Game | Picks | Played | Skipped | Skip Weight | Play Weight | Final Weight |
|------|-------|--------|---------|-------------|-------------|--------------|
| Catan | 10 | 8 | 2 | 1.20 | 0.11 | **0.13** |
| Ticket to Ride | 5 | 1 | 4 | 1.80 | 0.50 | **0.90** |
| Pandemic | 0 | 0 | 0 | 1.00 | 1.00 | **2.00** (bonus) |

**Result**: Pandemic has highest chance, followed by Ticket to Ride, then Catan

### Scenario 2: Frequently Skipped Game

| Game | Picks | Played | Skipped | Skip Weight | Play Weight | Final Weight |
|------|-------|--------|---------|-------------|-------------|--------------|
| Chess | 20 | 2 | 18 | 1.90 | 0.33 | **0.63** |
| Monopoly | 20 | 18 | 2 | 1.10 | 0.05 | **0.06** |

**Result**: Chess gets ~10x higher chance despite both being picked 20 times

## Implementation Steps

1. **Update `/api/pick` endpoint** (`app/api/pick/route.js`)
   - Fetch all games with their stats
   - Calculate weights for each game
   - Implement weighted random selection
   - Return selected game

2. **Add weight calculation function** in `/lib/weightedSelection.js`
   ```javascript
   export function calculateGameWeight(stats) {
     const { picks = 0, played = 0, skipped = 0 } = stats;

     const skipWeight = 1 + (skipped / Math.max(picks, 1));
     const playWeight = 1 / (1 + played);
     let weight = skipWeight * playWeight;

     if (picks === 0) {
       weight = Math.max(weight, 2.0);
     }

     return weight;
   }

   export function weightedRandomPick(games, statsMap) {
     // Implementation as shown above
   }
   ```

3. **Testing Strategy**
   - Add games with various play/skip ratios
   - Run picker 100 times and verify distribution
   - Check that never-picked games appear frequently
   - Verify overplayed games appear less

## Alternative Approaches Considered

### 1. Pure Round-Robin
- **Pros**: Perfect fairness, predictable
- **Cons**: No randomness, boring for users

### 2. Inverse Frequency Only
- **Pros**: Simple to implement
- **Cons**: Doesn't account for skips

### 3. Time-Based Weighting
- **Pros**: Considers recency
- **Cons**: Requires tracking timestamps, more complex

### 4. Elo-Style Rating
- **Pros**: Can adapt to user preferences
- **Cons**: Very complex, requires extensive tuning

## Configuration Options (Future)

Allow admin to configure weighting parameters:

```javascript
{
  skipWeightMultiplier: 1.0,    // How much skips affect weight
  playWeightDecay: 1.0,          // How fast play count reduces weight
  newGameBonus: 2.0,             // Weight multiplier for unpicked games
  enableWeighting: true          // Toggle weighted vs pure random
}
```

## Edge Cases

1. **All games never picked**: All get equal bonus weight
2. **Single game in library**: Always selected (weight irrelevant)
3. **All games heavily played**: Weights normalize, becomes nearly random
4. **Negative scenarios**: Use `Math.max(picks, 1)` to prevent division by zero

## Performance Considerations

- Weight calculation: O(n) where n = number of games
- Selection process: O(n)
- Total complexity: O(n) - acceptable for libraries up to 1000+ games

## Monitoring & Analytics

After implementation, track:
- Distribution of picked games over time
- Average picks-per-game variance
- User satisfaction (skip rate trends)
- Games that remain unpicked despite weighting
