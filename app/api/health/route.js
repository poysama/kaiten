import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

// Disable caching for this endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  try {
    // Check Redis connectivity
    const redis = getRedis();
    const pingStart = Date.now();
    const pong = await redis.ping();
    const pingDuration = Date.now() - pingStart;

    health.checks.redis = {
      status: pong === 'PONG' ? 'healthy' : 'unhealthy',
      responseTime: `${pingDuration}ms`,
      message: pong === 'PONG' ? 'Redis is responsive' : 'Redis ping failed'
    };

    // Get Redis stats
    try {
      const info = await redis.info('stats');
      const lines = info.split('\r\n');
      const stats = {};

      lines.forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key.trim()] = value.trim();
          }
        }
      });

      health.checks.redis.stats = {
        totalConnectionsReceived: stats.total_connections_received || 'N/A',
        totalCommandsProcessed: stats.total_commands_processed || 'N/A',
        instantaneousOpsPerSec: stats.instantaneous_ops_per_sec || 'N/A'
      };
    } catch (statsError) {
      health.checks.redis.stats = 'Unable to fetch stats';
    }

    // Get game count
    try {
      const gameIds = await redis.smembers('games:ids');
      health.checks.database = {
        status: 'healthy',
        totalGames: gameIds ? gameIds.length : 0
      };
    } catch (dbError) {
      health.checks.database = {
        status: 'unhealthy',
        error: dbError.message
      };
    }

    // Overall health status
    const hasUnhealthyChecks = Object.values(health.checks).some(
      check => check.status === 'unhealthy'
    );

    if (hasUnhealthyChecks) {
      health.status = 'degraded';
    }

  } catch (error) {
    health.status = 'unhealthy';
    health.checks.redis = {
      status: 'unhealthy',
      error: error.message
    };
  }

  const totalTime = Date.now() - startTime;
  health.responseTime = `${totalTime}ms`;

  const statusCode = health.status === 'healthy' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
