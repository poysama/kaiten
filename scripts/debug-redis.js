const Redis = require('ioredis');

async function debugRedis() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    lazyConnect: true
  });

  try {
    await redis.connect();
    console.log('Connected to Redis\n');

    // Check what keys exist
    const allKeys = await redis.keys('*');
    console.log(`Total keys: ${allKeys.length}`);

    if (allKeys.length > 0) {
      console.log('\nAll keys:');
      allKeys.forEach(key => console.log(`  - ${key}`));
    }

    // Check games:ids specifically
    console.log('\n--- Checking games:ids ---');
    const exists = await redis.exists('games:ids');
    console.log(`games:ids exists: ${exists ? 'YES' : 'NO'}`);

    if (exists) {
      const type = await redis.type('games:ids');
      console.log(`Type: ${type}`);

      const members = await redis.smembers('games:ids');
      console.log(`Number of game IDs: ${members.length}`);

      if (members.length > 0) {
        console.log('\nFirst 3 game IDs:');
        members.slice(0, 3).forEach(id => console.log(`  - ${id}`));

        console.log('\nChecking first game data:');
        const firstId = members[0];
        const gameKey = `game:${firstId}`;
        const statsKey = `stats:game:${firstId}`;

        const gameExists = await redis.exists(gameKey);
        const statsExists = await redis.exists(statsKey);

        console.log(`  ${gameKey} exists: ${gameExists ? 'YES' : 'NO'}`);
        console.log(`  ${statsKey} exists: ${statsExists ? 'YES' : 'NO'}`);

        if (gameExists) {
          const gameData = await redis.get(gameKey);
          console.log(`  Game data: ${gameData}`);
        }

        if (statsExists) {
          const stats = await redis.hgetall(statsKey);
          console.log(`  Stats:`, stats);
        }
      }
    }

    console.log('\n--- Database Size ---');
    const dbsize = await redis.dbsize();
    console.log(`Total keys in DB: ${dbsize}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await redis.quit();
  }
}

debugRedis();
