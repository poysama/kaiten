const Redis = require('ioredis');

// Usage: node scripts/copy-from-production.js <PRODUCTION_REDIS_URL>
// Example: node scripts/copy-from-production.js redis://username:password@host:port

async function copyFromProduction() {
  const productionUrl = process.argv[2];

  if (!productionUrl) {
    console.error('❌ Error: Please provide production Redis URL as argument');
    console.log('\nUsage:');
    console.log('  node scripts/copy-from-production.js <PRODUCTION_REDIS_URL>\n');
    console.log('Example:');
    console.log('  node scripts/copy-from-production.js redis://username:password@host:port\n');
    process.exit(1);
  }

  console.log('Starting migration from production to local Redis...\n');

  // Connect to production Redis
  const prodRedis = new Redis(productionUrl, {
    lazyConnect: true,
    tls: productionUrl.includes('rediss://') ? {} : undefined
  });

  // Connect to local Redis
  const localRedis = new Redis({
    host: 'localhost',
    port: 6379,
    lazyConnect: true
  });

  try {
    // Connect to both Redis instances
    console.log('Connecting to production Redis...');
    await prodRedis.connect();
    console.log('✓ Connected to production\n');

    console.log('Connecting to local Redis...');
    await localRedis.connect();
    console.log('✓ Connected to local Redis\n');

    // Get all keys from production
    console.log('Fetching all keys from production...');
    const keys = await prodRedis.keys('*');
    console.log(`Found ${keys.length} keys\n`);

    if (keys.length === 0) {
      console.log('No data to migrate!');
      return;
    }

    // Clear local Redis
    console.log('Clearing local Redis...');
    await localRedis.flushdb();
    console.log('✓ Local Redis cleared\n');

    // Copy each key
    console.log('Copying data...\n');
    let copied = 0;

    for (const key of keys) {
      const type = await prodRedis.type(key);

      switch (type) {
        case 'string':
          const strValue = await prodRedis.get(key);
          await localRedis.set(key, strValue);
          console.log(`✓ Copied STRING: ${key}`);
          break;

        case 'hash':
          const hashValue = await prodRedis.hgetall(key);
          await localRedis.hset(key, hashValue);
          console.log(`✓ Copied HASH: ${key}`);
          break;

        case 'set':
          const setMembers = await prodRedis.smembers(key);
          if (setMembers.length > 0) {
            await localRedis.sadd(key, ...setMembers);
          }
          console.log(`✓ Copied SET: ${key} (${setMembers.length} members)`);
          break;

        case 'list':
          const listValues = await prodRedis.lrange(key, 0, -1);
          for (const value of listValues) {
            await localRedis.rpush(key, value);
          }
          console.log(`✓ Copied LIST: ${key} (${listValues.length} items)`);
          break;

        case 'zset':
          const zsetValues = await prodRedis.zrange(key, 0, -1, 'WITHSCORES');
          if (zsetValues.length > 0) {
            await localRedis.zadd(key, ...zsetValues);
          }
          console.log(`✓ Copied ZSET: ${key}`);
          break;

        default:
          console.log(`⚠ Skipped unknown type: ${key} (${type})`);
      }

      copied++;
    }

    console.log(`\n✅ Successfully copied ${copied} keys from production to local`);

    // Verify migration
    console.log('\nVerifying local data...');
    const localKeys = await localRedis.dbsize();
    const gameIds = await localRedis.smembers('games:ids');
    console.log(`Total keys in local database: ${localKeys}`);
    console.log(`Total games: ${gameIds ? gameIds.length : 0}`);

    // Show sample games
    if (gameIds && gameIds.length > 0) {
      console.log('\nSample games:');
      for (let i = 0; i < Math.min(5, gameIds.length); i++) {
        const gameData = await localRedis.get(`game:${gameIds[i]}`);
        if (gameData) {
          const game = JSON.parse(gameData);
          const stats = await localRedis.hgetall(`stats:game:${gameIds[i]}`);
          console.log(`  - ${game.name}: picks=${stats.picks || 0}, played=${stats.played || 0}, skipped=${stats.skipped || 0}`);
        }
      }
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prodRedis.quit();
    await localRedis.quit();
  }
}

copyFromProduction();
