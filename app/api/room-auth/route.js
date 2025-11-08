import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { cookies } from 'next/headers';

/**
 * Room Creator Authentication
 * Simple password-only auth stored in Redis
 */

export async function POST(request) {
  try {
    const { action, password, newPassword } = await request.json();
    const redis = getRedis();

    if (action === 'login') {
      // Get stored password from Redis
      const storedPassword = await redis.get('room_creator:password');

      // If no password set yet, set the provided one as the password
      if (!storedPassword) {
        await redis.set('room_creator:password', password);

        // Set cookie
        cookies().set('room_creator_auth', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return NextResponse.json({
          ok: true,
          message: 'Password created and logged in'
        });
      }

      // Check password
      if (password === storedPassword) {
        // Set cookie
        cookies().set('room_creator_auth', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return NextResponse.json({
          ok: true,
          message: 'Logged in successfully'
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'Invalid password'
        }, { status: 401 });
      }
    }

    if (action === 'logout') {
      cookies().delete('room_creator_auth');
      return NextResponse.json({ ok: true });
    }

    if (action === 'check') {
      const authCookie = cookies().get('room_creator_auth');
      return NextResponse.json({
        authenticated: !!authCookie
      });
    }

    if (action === 'change_password') {
      // Check if authenticated
      const authCookie = cookies().get('room_creator_auth');
      if (!authCookie) {
        return NextResponse.json({
          ok: false,
          error: 'Not authenticated'
        }, { status: 401 });
      }

      // Get current password
      const storedPassword = await redis.get('room_creator:password');

      // Verify current password
      if (password !== storedPassword) {
        return NextResponse.json({
          ok: false,
          error: 'Current password is incorrect'
        }, { status: 401 });
      }

      // Set new password
      await redis.set('room_creator:password', newPassword);

      return NextResponse.json({
        ok: true,
        message: 'Password changed successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ROOM-AUTH] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const authCookie = cookies().get('room_creator_auth');
    return NextResponse.json({
      authenticated: !!authCookie
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false
    });
  }
}
