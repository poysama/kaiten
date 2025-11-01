import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('admin_auth');

    return NextResponse.json({ authenticated: authCookie?.value === 'true' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
