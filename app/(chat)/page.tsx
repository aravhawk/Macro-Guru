"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { TopicGrid } from "@/components/topics/topic-grid";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showTopics, setShowTopics] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

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

  const handleSend = useCallback(
    async (content: string) => {
      if (isStreaming) return;

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setShowTopics(false);
      setIsStreaming(true);
      setStreamingContent("");

      try {
        if (!threadId) {
          const threadRes = await fetch("/api/threads", { method: "POST" });
          const threadData = await threadRes.json();
          setThreadId(threadData.openaiThreadId);
          await streamResponse(threadData.openaiThreadId, content);
        } else {
          await streamResponse(threadId, content);
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        setIsStreaming(false);
      }
    },
    [isStreaming, threadId, streamResponse]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {showTopics && messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            What would you like to learn?
          </h2>
          <p className="text-muted-foreground mb-8 text-center">
            Choose a topic below or ask anything about AP Macroeconomics
          </p>
          <div className="w-full max-w-2xl">
            <TopicGrid
              onSelectTopic={(topic) => handleSend(`Help me understand ${topic}`)}
            />
          </div>
        </div>
      ) : (
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />
      )}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        disabled={false}
      />
    </div>
  );
}
