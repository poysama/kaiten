# Deployment Checklist

Use this checklist when deploying the updated Kaiten application with new features.

## Pre-Deployment

### Code Review
- [ ] All changes reviewed and tested locally
- [ ] New features tested with different game lengths
- [ ] Weight calculations verified with various scenarios
- [ ] Tooltips display correctly for all games
- [ ] Low-priority visual indicators working
- [ ] Admin panel updates tested

### Testing
- [ ] Test with empty database (new installation)
- [ ] Test with existing games (migration scenario)
- [ ] Test length filter with all options (All, Short, Medium, Long)
- [ ] Test weighted selection on/off toggle
- [ ] Test pick probability calculations
- [ ] Test admin panel game editing
- [ ] Test stats page displays correctly

### Data Backup (Production Only)
- [ ] Backup Redis database before deployment
- [ ] Document backup location and timestamp
- [ ] Verify backup can be restored if needed

### Environment Check
- [ ] `REDIS_URL` environment variable set
- [ ] Redis server accessible
- [ ] Node.js version compatible (14+)
- [ ] Next.js dependencies installed

## Deployment Steps

### 1. Deploy Code
- [ ] Pull latest code to server
- [ ] Install dependencies: `npm install` or `pnpm install`
- [ ] Build application: `npm run build`
- [ ] Start application: `npm run start`

### 2. Verify Application Running
- [ ] Application starts without errors
- [ ] Can access main page
- [ ] Can access admin page
- [ ] Can access stats page
- [ ] Redis connection successful

### 3. Check Migration Status
- [ ] Run migration check: `npm run migrate:check`
- [ ] Review what needs to be migrated
- [ ] Note number of games affected

### 4. Run Migration
- [ ] Execute migration: `npm run migrate:run`
- [ ] Verify migration completed successfully
- [ ] Check migration report for errors
- [ ] Confirm expected number of games updated

### 5. Post-Migration Verification
- [ ] Load admin panel - all games visible
- [ ] Check games have `length` property
- [ ] Verify stats are complete (picks, played, skipped, weight)
- [ ] Test game selection works
- [ ] Test length filter works
- [ ] Verify tooltips show pick probabilities
- [ ] Check low-priority games appear faded

## Post-Deployment

### Immediate Verification
- [ ] Main randomizer page loads
- [ ] Can pick a game successfully
- [ ] Weighted selection toggle works
- [ ] Length filter functions correctly
- [ ] Tooltips display properly
- [ ] Admin panel accessible
- [ ] Stats page shows data correctly

### Data Integrity
- [ ] All games present (compare count to pre-deployment)
- [ ] Game names unchanged
- [ ] Stats preserved correctly
- [ ] Weights calculated correctly
- [ ] No duplicate games

### Feature Testing
- [ ] Test picking games with different lengths
- [ ] Confirm/Skip actions update stats
- [ ] Weights recalculate after plays
- [ ] Low-priority games fade correctly
- [ ] Tooltips show accurate percentages

### Performance Check
- [ ] Page load times acceptable
- [ ] No console errors
- [ ] Redis queries responding quickly
- [ ] No memory leaks observed

## Optional Post-Deployment Tasks

### Update Game Lengths
- [ ] Review each game in admin panel
- [ ] Set appropriate length for each game:
  - Short: < 30 minutes
  - Medium: 30-90 minutes
  - Long: > 90 minutes
- [ ] Save changes

### Data Cleanup (if needed)
- [ ] Remove any duplicate games
- [ ] Reset stats if starting fresh: Admin → Reset All Stats
- [ ] Verify weight calculations are correct

### User Communication
- [ ] Notify users of new features
- [ ] Explain length filter functionality
- [ ] Describe visual priority indicators
- [ ] Share documentation if needed

## Rollback Plan

If issues occur after deployment:

### Quick Fixes
- [ ] Restart application
- [ ] Check Redis connection
- [ ] Review application logs
- [ ] Verify environment variables

### Data Rollback (if necessary)
- [ ] Stop application
- [ ] Restore Redis backup
- [ ] Verify data integrity
- [ ] Restart application

### Code Rollback (if necessary)
- [ ] Revert to previous version
- [ ] Rebuild application
- [ ] Restart application
- [ ] Verify functionality

## Monitoring

### First 24 Hours
- [ ] Monitor application logs for errors
- [ ] Check Redis memory usage
- [ ] Track API response times
- [ ] Watch for unusual behavior

### First Week
- [ ] Verify weight calculations remain accurate
- [ ] Check for any user-reported issues
- [ ] Monitor stats accumulation
- [ ] Ensure no data corruption

## Documentation

- [ ] Update internal wiki/docs with new features
- [ ] Document any custom configurations
- [ ] Note any issues encountered and resolutions
- [ ] Update user guide if applicable

## Sign-Off

- [ ] Deployment completed by: ________________
- [ ] Date/Time: ________________
- [ ] All checks passed: Yes / No
- [ ] Issues noted: ________________
- [ ] Rollback required: Yes / No

---

## Quick Commands Reference

```bash
# Check migration status
npm run migrate:check

# Run migration
npm run migrate:run

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Docker commands
npm run docker:up      # Start Redis
npm run docker:down    # Stop Redis
npm run docker:logs    # View Redis logs
```

## Support Contacts

- **Developer**: [Your contact info]
- **Redis Issues**: Check Redis logs with `npm run docker:logs`
- **Application Issues**: Check Next.js logs in console

## Additional Resources

- [MIGRATION.md](./MIGRATION.md) - Detailed migration guide
- [MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md) - Quick reference
- [CHANGELOG.md](./CHANGELOG.md) - All changes in this release
- [WEIGHT_TESTING.md](./WEIGHT_TESTING.md) - Testing weighted selection
