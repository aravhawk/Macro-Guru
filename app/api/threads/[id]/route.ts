import { NextRequest, NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { getThreadById, deleteThread, getMessagesByThreadId } from "@/lib/db/queries";
import { auth } from "@/lib/auth/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createDb(process.env.DATABASE_URL!);
  const thread = await getThreadById(db, id);

  if (!thread || thread.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await getMessagesByThreadId(db, id);
  return NextResponse.json({ ...thread, messages: msgs });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createDb(process.env.DATABASE_URL!);
  const thread = await getThreadById(db, id);

  if (!thread || thread.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteThread(db, id);
  return NextResponse.json({ success: true });
}
