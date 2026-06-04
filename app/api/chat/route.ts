import OpenAI from 'openai';
import { SYSTEM_INSTRUCTIONS } from '@/lib/constants';
import { getUser } from '@/lib/auth';
import { sql } from '@/lib/db';

const DAILY_LIMIT = 50;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { conversationId, message, turnstileToken } = await request.json();

  if (!conversationId || typeof message !== 'string' || !message.trim()) {
    return jsonResponse({ error: 'conversationId and message are required' }, 400);
  }

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
      return jsonResponse({ error: 'Verification failed' }, 403);
    }
  }

  // Verify the conversation belongs to the authenticated user and read its
  // server-stored thread id. We never trust a client-supplied threadId — doing
  // so previously let a caller append to (and read from) another user's thread.
  const owned = await sql`
    SELECT thread_id, title FROM conversations
    WHERE id = ${conversationId} AND user_id = ${user.id}
  `;
  if (owned.length === 0) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  const { thread_id: storedThreadId, title } = owned[0] as { thread_id: string | null; title: string };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Provision a thread on demand if one was never created for this conversation.
  let threadId = storedThreadId;
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
    await sql`
      UPDATE conversations SET thread_id = ${threadId}, updated_at = NOW()
      WHERE id = ${conversationId} AND user_id = ${user.id}
    `;
  }

  // Server-side rate limiting
  const rateResult = await sql`
    SELECT count FROM rate_limits
    WHERE user_id = ${user.id} AND date = CURRENT_DATE
  `;
  const currentCount = rateResult.length > 0 ? (rateResult[0] as { count: number }).count : 0;

  if (currentCount >= DAILY_LIMIT) {
    return jsonResponse({ error: 'Daily message limit reached. Resets at midnight UTC.' }, 429);
  }

  // Increment rate limit
  await sql`
    INSERT INTO rate_limits (user_id, date, count)
    VALUES (${user.id}, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET count = rate_limits.count + 1
  `;

  // Store user message (conversation ownership verified above).
  await sql`
    INSERT INTO messages (conversation_id, role, content)
    VALUES (${conversationId}, 'user', ${message})
  `;

  // Auto-title from the first user message.
  const newTitle = title === 'New Conversation'
    ? message.slice(0, 50).trim() || 'New Conversation'
    : title;
  await sql`
    UPDATE conversations SET title = ${newTitle}, updated_at = NOW()
    WHERE id = ${conversationId} AND user_id = ${user.id}
  `;

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
        if (fullResponse) {
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
