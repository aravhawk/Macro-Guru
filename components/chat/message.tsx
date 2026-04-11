"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function Message({ role, content, isStreaming }: MessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full animate-fade-in-up",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-emerald/15 text-foreground border border-emerald/20"
            : "bg-card text-card-foreground border border-border/50",
          "backdrop-blur-sm"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-heading font-semibold text-emerald">
              Macro Guru
            </span>
          </div>
        )}
        <div
          className={cn(
            "prose prose-sm prose-invert max-w-none",
            "prose-p:my-1 prose-headings:text-foreground",
            "prose-a:text-emerald prose-code:text-gold",
            isStreaming && "streaming-cursor"
          )}
        >
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
