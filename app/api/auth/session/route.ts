import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromCookies } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
