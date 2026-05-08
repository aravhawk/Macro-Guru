import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const thread = await openai.beta.threads.create();
  return NextResponse.json({ threadId: thread.id });
}
