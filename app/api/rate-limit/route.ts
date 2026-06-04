import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromCookies } from '@/lib/auth';
import { sql } from '@/lib/db';

const DAILY_LIMIT = 50;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT count FROM rate_limits
      WHERE user_id = ${user.id} AND date = CURRENT_DATE
    `;

    const count = result.length > 0 ? (result[0] as { count: number }).count : 0;

    return NextResponse.json({ used: count, limit: DAILY_LIMIT });
  } catch (error) {
    console.error('Rate limit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
