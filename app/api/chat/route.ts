import { NextRequest } from "next/server";
import { createOpenAIClient, ASSISTANT_ID } from "@/lib/openai";
import { SYSTEM_INSTRUCTIONS } from "@/lib/system-instructions";
import { createDb } from "@/lib/db";
import { createMessage, getThreadByOpenaiId, updateThreadTitle } from "@/lib/db/queries";
import { auth } from "@/lib/auth/server";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { openaiThreadId, content } = await req.json();

  if (!openaiThreadId || !content) {
    return new Response("Missing openaiThreadId or content", { status: 400 });
  }

  const openai = createOpenAIClient(process.env.OPENAI_API_KEY!);

  // Add user message to OpenAI thread
  await openai.beta.threads.messages.create(openaiThreadId, {
    role: "user",
    content,
  });

  // Save user message to DB
  const db = createDb(process.env.DATABASE_URL!);
  const thread = await getThreadByOpenaiId(db, openaiThreadId);
  if (thread) {
    await createMessage(db, {
      threadId: thread.id,
      role: "user",
      content,
    });

    // Auto-generate title from first message if still default
    if (thread.title === "New Chat") {
      const title = content.slice(0, 60) + (content.length > 60 ? "..." : "");
      await updateThreadTitle(db, thread.id, title);
    }
  }

  // Stream the assistant response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        const runStream = openai.beta.threads.runs.stream(openaiThreadId, {
          assistant_id: ASSISTANT_ID,
          instructions: SYSTEM_INSTRUCTIONS,
        });

        for await (const event of runStream) {
          if (event.event === "thread.message.delta") {
            const delta = event.data.delta;
            if (delta.content?.[0]?.type === "text") {
              const text = delta.content[0].text!.value;
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "delta", content: text })}\n\n`)
              );
            }
          }
        }

        // Save assistant message to DB
        if (thread && fullResponse) {
          await createMessage(db, {
            threadId: thread.id,
            role: "assistant",
            content: fullResponse,
          });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", content: String(error) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
