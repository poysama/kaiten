const Redis = require('ioredis');

// List of board games to populate
const games = [
  'Cartographers',
  'Verdant',
  'Forest Shuffle',
  'Forest Shuffle: Dartmoor',
  'Can\'t Stop',
  'The Guild of Merchants and Explorers',
  'Castle Combo',
  'Lost Ruins of Arnak',
  'It\'s A Wonderful World',
  'Terra Mystica',
  'Castles of Burgundy',
  'Super Mega Lucky Box',
  'Castles of Mad King Ludwig',
  'Ticket to Ride USA',
  'Wingspan',
  'Yahtzee',
  'Living Forest',
  'Flip 7',
  'Draft and Write Records',
  '6nimmt!',
  'Architects of the West Kingdom',
  'Gizmos',
  'Clans of Caledonia',
  'Distilled',
  'Lucky Numbers',
  'Seven Wonders',
  'Draftosaurus',
  'Alhambra',
  'Carcassonne',
  'Keyflower',
  'Potion Explosion',
  'Bag of Chips',
  'Tokaido',
  'Next Station: London',
  'Sushi Go Party!',
  'No Thanks'
];

async function populateRedis() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    lazyConnect: true
  });

  try {
    console.log('Connecting to Redis...');
    await redis.connect();
    console.log('Connected successfully!\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await redis.flushdb();
    console.log('Database cleared.\n');

    console.log(`Adding ${games.length} games...\n`);

    const gameIds = [];

    // Add each game following the same structure as the API
    for (const gameName of games) {
      const gameId = `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const gameObj = {
        id: gameId,
        name: gameName,
        length: 'medium',
        meta: {}
      };

      // Store game object
      await redis.set(`game:${gameId}`, JSON.stringify(gameObj));

      // Add to games:ids set
      await redis.sadd('games:ids', gameId);

      // Initialize stats
      await redis.hset(`stats:game:${gameId}`, {
        played: '0',
        skipped: '0',
        picks: '0',
        weight: '1.000'
      });

      gameIds.push(gameId);
      console.log(`✓ Added: ${gameName}`);

      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log(`\n✅ Successfully added ${games.length} games to Redis`);

    // Verify data
    console.log('\nVerifying data...');
    const totalKeys = await redis.dbsize();
    const storedIds = await redis.smembers('games:ids');
    console.log(`Total keys in database: ${totalKeys}`);
    console.log(`Total games: ${storedIds.length}`);

    console.log('\n✅ Population complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

populateRedis();
