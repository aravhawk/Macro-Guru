import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { SYSTEM_INSTRUCTIONS } from '@/lib/constants';
import { getUserFromCookies } from '@/lib/auth';
import { sql } from '@/lib/db';

const DAILY_LIMIT = 50;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const user = await getUserFromCookies(cookieStore);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { threadId, conversationId, message, turnstileToken } = await request.json();

  // Turnstile verification (optional)
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (secretKey) {
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretKey, response: turnstileToken ?? '' }),
      },
    );
    const verification = await verifyRes.json();
    if (!verification.success) {
      return new Response(
        JSON.stringify({ error: 'Verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Server-side rate limiting
  const rateResult = await sql`
    SELECT count FROM rate_limits
    WHERE user_id = ${user.id} AND date = CURRENT_DATE
  `;
  const currentCount = rateResult.length > 0 ? (rateResult[0] as { count: number }).count : 0;

  if (currentCount >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: 'Daily message limit reached. Resets at midnight UTC.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Increment rate limit
  await sql`
    INSERT INTO rate_limits (user_id, date, count)
    VALUES (${user.id}, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET count = rate_limits.count + 1
  `;

  // Store user message in DB
  if (conversationId) {
    await sql`
      INSERT INTO messages (conversation_id, role, content)
      VALUES (${conversationId}, 'user', ${message})
    `;

    // Update conversation timestamp and auto-title
    const conv = await sql`
      SELECT title, (SELECT COUNT(*) FROM messages WHERE conversation_id = ${conversationId}) as msg_count
      FROM conversations WHERE id = ${conversationId} AND user_id = ${user.id}
    `;
    if (conv.length > 0) {
      const { title, msg_count } = conv[0] as { title: string; msg_count: string };
      const newTitle = title === 'New Conversation' && Number(msg_count) <= 2
        ? message.slice(0, 50).trim() || 'New Conversation'
        : title;
      await sql`
        UPDATE conversations SET title = ${newTitle}, updated_at = NOW()
        WHERE id = ${conversationId}
      `;
    }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });

  // Capture full response for DB storage
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const run = openai.beta.threads.runs.stream(threadId, {
          assistant_id: process.env.ASSISTANT_ID!,
          instructions: SYSTEM_INSTRUCTIONS,
        });

        run.on('textDelta', (delta) => {
          if (delta.value) {
            fullResponse += delta.value;
            controller.enqueue(encoder.encode(delta.value));
          }
        });

        await run.finalRun();

        // Store assistant response in DB
        if (conversationId && fullResponse) {
          try {
            await sql`
              INSERT INTO messages (conversation_id, role, content)
              VALUES (${conversationId}, 'assistant', ${fullResponse})
            `;
          } catch (dbErr) {
            console.error('Failed to store assistant message:', dbErr);
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
