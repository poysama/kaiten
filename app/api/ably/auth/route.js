import { NextResponse } from 'next/server';
import Ably from 'ably';

export const dynamic = 'force-dynamic';

/**
 * Ably token authentication endpoint
 * Generates tokens for client connections
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    const client = new Ably.Rest(process.env.ABLY_API_KEY);
    const tokenRequest = await client.auth.createTokenRequest({ clientId });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('[ABLY] Token auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
