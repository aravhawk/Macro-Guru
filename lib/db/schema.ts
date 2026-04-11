import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  openaiThreadId: text("openai_thread_id").notNull(),
  userId: text("user_id").notNull(),
  title: text("title").default("New Chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .references(() => threads.id)
    .notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
