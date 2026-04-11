"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [threadData, setThreadData] = useState<{
    openaiThreadId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const streamResponse = useCallback(
    async (openaiThreadId: string, content: string) => {
      abortRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiThreadId, content }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/sign-in");
          return;
        }
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "delta") {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                } else if (data.type === "done") {
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: fullContent },
                  ]);
                  setStreamingContent("");
                  setIsStreaming(false);
                } else if (data.type === "error") {
                  console.error("Stream error:", data.content);
                  setIsStreaming(false);
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled
        } else {
          console.error("Stream read error:", err);
        }
        setIsStreaming(false);
      }
    },
    [router]
  );

  useEffect(() => {
    async function loadThread() {
      try {
        const res = await fetch(`/api/threads/${threadId}`);
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        setThreadData({ openaiThreadId: data.openaiThreadId });
        setMessages(
          data.messages.map((m: Message) => ({
            role: m.role,
            content: m.content,
          }))
        );
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    loadThread();
  }, [threadId, router]);

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming || !threadData) return;

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");

      try {
        await streamResponse(threadData.openaiThreadId, content);
      } catch (err) {
        console.error("Failed to send message:", err);
        setIsStreaming(false);
      }
    },
    [isStreaming, threadData, streamResponse]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatArea
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
      />
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={!threadData}
      />
    </div>
  );
}
