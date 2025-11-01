#!/usr/bin/env node

/**
 * Migration script for Kaiten Board Game Randomizer
 *
 * Usage:
 *   node scripts/migrate.js check    # Check what needs migration
 *   node scripts/migrate.js run      # Run the migration
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');

  try {
    const response = await fetch(`${baseUrl}/api/migrate`);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error checking migration:', data.error);
      process.exit(1);
    }

    console.log('📊 Migration Status Report:');
    console.log('═══════════════════════════════════════\n');
    console.log(`Total games: ${data.report.totalGames}`);
    console.log(`Games needing length property: ${data.report.gamesNeedingLength}`);
    console.log(`Games without stats: ${data.report.gamesWithoutStats}`);
    console.log(`Games with incorrect weight: ${data.report.gamesWithIncorrectWeight}`);

    if (data.needsMigration) {
      console.log('\n⚠️  Migration needed!\n');

      if (data.report.details && data.report.details.length > 0) {
        console.log('Details:');
        console.log('─────────────────────────────────────');
        data.report.details.forEach(item => {
          console.log(`\n  ${item.name || item.id}:`);
          if (item.issues) {
            item.issues.forEach(issue => console.log(`    • ${issue}`));
          }
          if (item.error) {
            console.log(`    ❌ ${item.error}`);
          }
        });
      }

      console.log('\n\nTo run migration, use: node scripts/migrate.js run');
    } else {
      console.log('\n✅ No migration needed - all data is up to date!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function runMigration() {
  console.log('🚀 Running migration...\n');

  try {
    const response = await fetch(`${baseUrl}/api/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirm: 'MIGRATE' })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Migration failed:', data.error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Migration Report:');
    console.log('═══════════════════════════════════════\n');
    console.log(`Total games processed: ${data.report.totalGames}`);
    console.log(`Games updated with length: ${data.report.gamesUpdated}`);
    console.log(`Stats fixed: ${data.report.statsFixed}`);
    console.log(`Stats created: ${data.report.statsCreated}`);

    if (data.report.gamesWithoutLength.length > 0) {
      console.log('\n📝 Games that received default length (medium):');
      console.log('─────────────────────────────────────');
      data.report.gamesWithoutLength.forEach(name => {
        console.log(`  • ${name}`);
      });
    }

    if (data.report.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      console.log('─────────────────────────────────────');
      data.report.errors.forEach(error => {
        console.log(`  ❌ ${error}`);
      });
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  console.log('╔═══════════════════════════════════════╗');
  console.log('║  Kaiten Migration Tool                ║');
  console.log('╚═══════════════════════════════════════╝\n');

  if (!command || command === 'check') {
    await checkMigration();
  } else if (command === 'run') {
    await runMigration();
  } else {
    console.log('Usage:');
    console.log('  node scripts/migrate.js check    # Check migration status');
    console.log('  node scripts/migrate.js run      # Run migration');
    console.log('\nEnvironment variables:');
    console.log('  BASE_URL - Base URL of the app (default: http://localhost:3000)');
    process.exit(1);
  }
}

main();
