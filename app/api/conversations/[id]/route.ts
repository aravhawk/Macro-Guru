import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromCookies } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await request.json();

    // Verify ownership
    const existing = await sql`
      SELECT id FROM conversations WHERE id = ${id} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const result = await sql`
      UPDATE conversations
      SET title = ${title}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, thread_id, created_at, updated_at
    `;

    const conv = result[0] as { id: string; title: string; thread_id: string | null; created_at: string; updated_at: string };

    return NextResponse.json({
      conversation: {
        id: conv.id,
        title: conv.title,
        threadId: conv.thread_id,
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime(),
      },
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT id FROM conversations WHERE id = ${id} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await sql`DELETE FROM conversations WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
