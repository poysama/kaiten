# Changelog

## [2.1.0] - New Features & Improvements

### Added

#### Game Length Property
- **Feature**: Games can now be categorized by play time duration
- **Values**: `short`, `medium`, `long`
- **Default**: New games default to `medium`
- **UI**:
  - Dropdown selector in Admin panel for editing game length
  - Length filter on main randomizer page
  - Filter selection persisted in localStorage
- **API**:
  - `/api/games` POST/PUT endpoints support `length` parameter
  - `/api/pick` POST endpoint filters by `lengthFilter` parameter

#### Visual Priority Indicators
- **Feature**: Low-priority games (heavily played) now appear visually distinct
- **Threshold**: Games with weight < 0.3 are marked as low priority
- **Styling**:
  - Desaturated colors (gray tint)
  - Maintained full opacity on tooltips for readability
  - Applied to both game cards and statistics table

#### Enhanced Tooltips
- **Design**: Larger, card-like appearance with gradient background
- **Colors**: Dark blue-gray gradient instead of black
- **Spacing**: Increased line-height and padding for better readability
- **Content**:
  - Game name
  - Weight value
  - **Pick Chance %** - Shows actual probability of selection
  - Picks, Played, Skipped counts

#### Auto-calculated Weights
- **Feature**: Weight field now auto-calculates in Admin panel
- **Implementation**: Read-only input field with special styling
- **Behavior**: Updates immediately when picks, played, or skipped values change
- **API**: Confirm and Skip endpoints automatically recalculate weights

#### Migration System
- **Check Endpoint**: `GET /api/migrate` - Dry-run to see what needs migration
- **Migration Endpoint**: `POST /api/migrate` - Runs migration with safety confirmation
- **Script**: `scripts/migrate.js` - Command-line tool for easy migration
- **NPM Scripts**:
  - `npm run migrate:check` - Check migration status
  - `npm run migrate:run` - Run migration
- **Documentation**:
  - `MIGRATION.md` - Complete migration guide
  - `MIGRATION_QUICK_START.md` - Quick reference

### Changed

#### Weight Calculation
- Now consistently applied across all API endpoints
- Confirm/Skip actions recalculate weight automatically
- Formula remains: `(1 + skipped/picks) × (1 / (1 + played))`

#### Tooltip Display
- Removed verbose weight messages (e.g., "Low priority - played frequently")
- Replaced with concise pick probability percentage
- Improved visual hierarchy and readability

#### Admin Panel
- Weight field is now read-only (auto-calculated)
- Added Length dropdown to game editing modal
- Visual distinction for read-only fields

#### Statistics Page
- Low priority games (weight < 0.3) shown with reduced opacity and italic style
- Consistent with main page visual indicators

### Fixed

#### Tooltip Opacity Issue
- **Issue**: Low-priority game tooltips were inheriting parent's reduced opacity
- **Solution**: Changed from `filter` property to `color-mix()` for fade effect
- **Result**: Tooltips always display at full brightness regardless of parent styling

#### Hover Border
- **Previous**: Red border on hover (conflicted with selection state)
- **Current**: Yellow glow effect using box-shadow
- **Benefit**: Clear distinction between hover and selected states

### Technical Details

#### Data Model Changes
```javascript
// Game object now includes:
{
  id: string,
  name: string,
  length: 'short' | 'medium' | 'long',  // NEW
  meta: object
}

// Stats remain unchanged:
{
  picks: number,
  played: number,
  skipped: number,
  weight: number  // Auto-calculated
}
```

#### CSS Updates
- `.gameCard.lowPriority` - Uses `color-mix()` instead of `filter`
- `.gameCard::after` - Tooltip with new gradient background
- `.inputReadonly` - Styling for read-only weight field
- `.filterSelect` - Dropdown for length filtering

#### API Endpoints Modified
- `/api/games` - POST/PUT support length parameter
- `/api/pick` - Accepts lengthFilter parameter
- `/api/confirm` - Auto-recalculates weight
- `/api/skip` - Auto-recalculates weight

#### API Endpoints Added
- `/api/migrate` - GET (check) and POST (run) migration

### Migration Required

**For existing installations with data:**
Run migration to add `length` property to existing games and validate all stats.

```bash
npm run migrate:check  # Check what needs migration
npm run migrate:run    # Run migration
```

**For new installations:**
No migration needed - all new games include length property by default.

### Breaking Changes

None - All changes are backward compatible. Games without `length` property default to `'medium'`.

### Deprecated

None

### Removed

- Removed verbose weight description messages from tooltips
- Cleaned up redundant weight calculation logic

### Security

No security-related changes in this release.

---

## [2.0.0] - Weighted Selection System

Previous major release with weighted randomization based on play history.

### Features
- Weighted selection algorithm
- Statistics tracking (picks, played, skipped)
- Weight-based prioritization
- Toggle for weighted/unweighted selection
- Admin panel for game management
- Statistics dashboard

---

## Future Considerations

### Potential Enhancements
- Player count filtering
- Complexity rating system
- Custom game tags/categories
- Play history log
- Export/import functionality
- Multi-user support
- Session management
- Favorites system
