"use client";

import { useRef, useEffect } from "react";
import { Message } from "./message";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
}

export function ChatArea({ messages, isStreaming, streamingContent }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg, i) => (
        <Message key={i} role={msg.role} content={msg.content} />
      ))}
      {isStreaming && streamingContent && (
        <Message
          role="assistant"
          content={streamingContent}
          isStreaming={true}
        />
      )}
      {isStreaming && !streamingContent && (
        <div className="flex justify-start">
          <div className="bg-card border border-border/50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-heading font-semibold text-emerald">
                Macro Guru
              </span>
              <span className="text-muted-foreground text-xs">Thinking...</span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
