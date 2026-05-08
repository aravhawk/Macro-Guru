import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_INSTRUCTIONS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { threadId, message } = await request.json();

  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });

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
            controller.enqueue(encoder.encode(delta.value));
          }
        });

        await run.finalRun();
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
