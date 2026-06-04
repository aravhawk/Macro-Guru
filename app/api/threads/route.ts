import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await request.json().catch(() => ({}));

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const thread = await openai.beta.threads.create();

    if (conversationId) {
      await sql`
        UPDATE conversations
        SET thread_id = ${thread.id}, updated_at = NOW()
        WHERE id = ${conversationId} AND user_id = ${user.id}
      `;
    }

    return NextResponse.json({ threadId: thread.id });
  } catch (error) {
    console.error('Create thread error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
