import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromCookies } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = (await sql`
      SELECT id, title, thread_id, created_at, updated_at
      FROM conversations
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
    `) as Array<{ id: string; title: string; thread_id: string | null; created_at: string; updated_at: string }>;

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = (await sql`
          SELECT role, content
          FROM messages
          WHERE conversation_id = ${conv.id}
          ORDER BY created_at ASC
        `) as Array<{ role: string; content: string }>;
        return {
          id: conv.id,
          title: conv.title,
          threadId: conv.thread_id,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          createdAt: new Date(conv.created_at).getTime(),
          updatedAt: new Date(conv.updated_at).getTime(),
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithMessages });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json().catch(() => ({}));

    const result = await sql`
      INSERT INTO conversations (user_id, title)
      VALUES (${user.id}, ${title || 'New Conversation'})
      RETURNING id, title, thread_id, created_at, updated_at
    `;

    const conv = result[0] as { id: string; title: string; thread_id: string | null; created_at: string; updated_at: string };

    return NextResponse.json({
      conversation: {
        id: conv.id,
        title: conv.title,
        threadId: conv.thread_id,
        messages: [],
        createdAt: new Date(conv.created_at).getTime(),
        updatedAt: new Date(conv.updated_at).getTime(),
      },
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
