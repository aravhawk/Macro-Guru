import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromCookies } from '@/lib/auth';
import { sql } from '@/lib/db';

interface MigrationConversation {
  id: string;
  title: string;
  threadId: string | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  createdAt: number;
  updatedAt: number;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromCookies(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversations } = (await request.json()) as { conversations: MigrationConversation[] };
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    let migrated = 0;

    for (const conv of conversations) {
      if (!conv.id || !conv.messages) continue;

      // Check if already exists
      const existing = await sql`
        SELECT id FROM conversations WHERE id = ${conv.id}
      `;

      if (existing.length > 0) {
        continue;
      }

      // Insert conversation
      await sql`
        INSERT INTO conversations (id, user_id, title, thread_id, created_at, updated_at)
        VALUES (
          ${conv.id}::uuid,
          ${user.id}::uuid,
          ${conv.title || 'New Conversation'},
          ${conv.threadId},
          ${new Date(conv.createdAt).toISOString()},
          ${new Date(conv.updatedAt).toISOString()}
        )
      `;

      // Insert messages
      for (const msg of conv.messages) {
        if (!msg.role || !msg.content) continue;
        await sql`
          INSERT INTO messages (conversation_id, role, content)
          VALUES (${conv.id}::uuid, ${msg.role}, ${msg.content})
        `;
      }

      migrated++;
    }

    return NextResponse.json({ migrated });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
