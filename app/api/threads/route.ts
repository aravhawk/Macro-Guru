import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { getThreadsByUserId, createThread } from "@/lib/db/queries";
import { createOpenAIClient } from "@/lib/openai";
import { auth } from "@/lib/auth/server";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createDb(process.env.DATABASE_URL!);
  const threads = await getThreadsByUserId(db, session.user.id);
  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = createOpenAIClient(process.env.OPENAI_API_KEY!);
  const openaiThread = await openai.beta.threads.create();

  const db = createDb(process.env.DATABASE_URL!);
  const thread = await createThread(db, {
    openaiThreadId: openaiThread.id,
    userId: session.user.id,
  });

  return NextResponse.json(thread);
}
