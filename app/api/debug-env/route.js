import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check environment variables (without exposing sensitive data)
 */
export async function GET() {
  try {
    const redisUrl = process.env.REDIS_URL;

    // Parse Redis URL to show connection info without exposing password
    let connectionInfo = 'Not configured';
    if (redisUrl) {
      try {
        const url = new URL(redisUrl);
        connectionInfo = {
          protocol: url.protocol,
          host: url.hostname,
          port: url.port || (url.protocol === 'rediss:' ? '6380' : '6379'),
          username: url.username || 'default',
          passwordSet: !!url.password,
          pathname: url.pathname
        };
      } catch (e) {
        connectionInfo = 'Invalid URL format';
      }
    }

    return NextResponse.json({
      environment: process.env.NODE_ENV || 'development',
      redisConfigured: !!redisUrl,
      redisConnection: connectionInfo,
      adminConfigured: !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
