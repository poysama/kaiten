# Weight Testing Guide

This guide explains how to test the weighted selection algorithm with different scenarios.

## Understanding Weight Values

The weight algorithm uses this formula:
```
weight = (1 + skipped/picks) × (1 / (1 + played))
```

### Weight Examples:

- **Weight = 1.0**: New game, never picked before (neutral)
- **Weight = 0.05-0.1**: Heavily played game (very low priority)
- **Weight = 1.5-2.0**: Frequently skipped game (very high priority)
- **Weight = 0.3-0.7**: Moderately played game (medium priority)

## How to Seed Test Data

To seed example scenarios for testing:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or in the browser console:
```javascript
fetch('/api/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

This will create 10 example games with different weight characteristics:

### Seeded Scenarios:

1. **Monopoly** (Long)
   - Picks: 20, Played: 18, Skipped: 2
   - Weight: **0.057** (Very low - played almost every time)
   - Message: "Low priority - played frequently"

2. **Risk** (Long)
   - Picks: 15, Played: 2, Skipped: 13
   - Weight: **1.867** (Very high - skipped almost every time)
   - Message: "High priority - frequently skipped"

3. **Splendor** (Medium)
   - Picks: 0, Played: 0, Skipped: 0
   - Weight: **1.0** (Neutral - never picked)
   - Message: "New game - equal chance to be picked"

4. **Catan** (Medium)
   - Picks: 10, Played: 5, Skipped: 5
   - Weight: **0.3** (Medium)
   - Message: "Low priority - played frequently"

5. **Ticket to Ride** (Medium)
   - Picks: 30, Played: 28, Skipped: 2
   - Weight: **0.037** (Extremely low)
   - Message: "Low priority - played frequently"

6. **Pandemic** (Medium)
   - Picks: 10, Played: 0, Skipped: 10
   - Weight: **2.0** (Very high - never played)
   - Message: "High priority - never played yet"

7. **Love Letter** (Short)
   - Picks: 3, Played: 2, Skipped: 1
   - Weight: **0.6**
   - Message: "Normal priority"

8. **Uno** (Short)
   - Picks: 25, Played: 22, Skipped: 3
   - Weight: **0.047**
   - Message: "Low priority - played frequently"

9. **Twilight Imperium** (Long)
   - Picks: 8, Played: 1, Skipped: 7
   - Weight: **1.75** (High)
   - Message: "High priority - hasn't been played much"

10. **7 Wonders** (Medium)
    - Picks: 12, Played: 7, Skipped: 5
    - Weight: **0.188**
    - Message: "Lower priority - played recently"

## Manually Creating Specific Scenarios

If you want to create a specific scenario in the admin panel:

### To simulate a "played all the time" game:
- **Picks**: 50+ (high number)
- **Played**: 45+ (almost equal to picks)
- **Skipped**: 1-5 (very low)
- **Weight**: Will be around **0.02-0.05** (very low priority)

Example values:
- Picks: 50
- Played: 48
- Skipped: 2
- Weight: ~0.021

### To simulate a "never gets played" game:
- **Picks**: 15+ (decent number)
- **Played**: 0-2 (very low)
- **Skipped**: 13+ (almost equal to picks)
- **Weight**: Will be around **1.8-2.0** (very high priority)

Example values:
- Picks: 20
- Played: 1
- Skipped: 19
- Weight: ~2.0

### To simulate a "balanced" game:
- **Picks**: 10
- **Played**: 5
- **Skipped**: 5
- **Weight**: Will be around **0.3** (medium priority)

## Testing the Filter

1. **Test Length Filtering**:
   - Set filter to "Short" - should only show Love Letter and Uno
   - Set filter to "Long" - should only show Monopoly, Risk, Twilight Imperium
   - Set filter to "Medium" - should show the medium-length games
   - Set filter to "All" - should show all games

2. **Test Weighted Selection**:
   - Toggle "Weighted Selection" ON
   - Games with higher weights (Risk, Pandemic, Twilight Imperium) should appear more frequently
   - Games with lower weights (Ticket to Ride, Uno, Monopoly) should appear less frequently

3. **Test Unweighted Selection**:
   - Toggle "Weighted Selection" OFF
   - All games should have equal chance regardless of weight

## Weight Calculation Examples

### Example 1: Heavily Played Game
```
Picks: 100, Played: 95, Skipped: 5
skipWeight = 1 + (5/100) = 1.05
playWeight = 1 / (1 + 95) = 0.0104
weight = 1.05 × 0.0104 = 0.011 (very low)
```

### Example 2: Frequently Skipped Game
```
Picks: 20, Played: 2, Skipped: 18
skipWeight = 1 + (18/20) = 1.9
playWeight = 1 / (1 + 2) = 0.333
weight = 1.9 × 0.333 = 0.633 (medium-high)
```

### Example 3: Never Picked
```
Picks: 0, Played: 0, Skipped: 0
weight = 1.0 (default)
```

## Visual Indicators

- **Blue Border**: Default, normal weight games
- **Red Border**: High weight games (weight > 1.2)
- **Yellow Glow on Hover**: Currently hovering over game card
- **Red Text in Stats**: Games with weight > 1.2 in statistics table
