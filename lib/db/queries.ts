import { eq, desc } from "drizzle-orm";
import type { Database } from "./index";
import { threads, messages } from "./schema";

export async function getThreadsByUserId(db: Database, userId: string) {
  return db
    .select()
    .from(threads)
    .where(eq(threads.userId, userId))
    .orderBy(desc(threads.updatedAt));
}

export async function getThreadById(db: Database, threadId: string) {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId));
  return result[0];
}

export async function getThreadByOpenaiId(db: Database, openaiThreadId: string) {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.openaiThreadId, openaiThreadId));
  return result[0];
}

export async function createThread(
  db: Database,
  data: { openaiThreadId: string; userId: string; title?: string }
) {
  const result = await db
    .insert(threads)
    .values(data)
    .returning();
  return result[0];
}

export async function updateThreadTitle(db: Database, threadId: string, title: string) {
  const result = await db
    .update(threads)
    .set({ title, updatedAt: new Date() })
    .where(eq(threads.id, threadId))
    .returning();
  return result[0];
}

export async function deleteThread(db: Database, threadId: string) {
  await db.delete(threads).where(eq(threads.id, threadId));
}

export async function getMessagesByThreadId(db: Database, threadId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt);
}

export async function createMessage(
  db: Database,
  data: { threadId: string; role: "user" | "assistant"; content: string }
) {
  const result = await db
    .insert(messages)
    .values(data)
    .returning();
  return result[0];
}
