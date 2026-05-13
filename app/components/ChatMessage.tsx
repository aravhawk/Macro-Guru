'use client';

import type { Message } from '@/app/hooks/useConversations';

interface ChatMessageProps {
  msg: Message;
  isLast: boolean;
  isStreaming: boolean;
}

export function ChatMessage({ msg, isLast, isStreaming }: ChatMessageProps) {
  const isUser = msg.role === 'user';
  const showDots = !isUser && isLast && isStreaming && msg.content === '';
  const showCursor = !isUser && isLast && isStreaming && msg.content !== '';

  if (isUser) {
    return (
      <div className="flex justify-end anim-fade-up">
        <div className="max-w-[92%] md:max-w-[75%] bg-muted rounded-2xl rounded-tr-sm px-4 py-3 md:px-5">
          <p className="text-base md:text-sm leading-relaxed text-foreground whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 md:gap-3 anim-fade-up">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center font-sans font-bold text-[10px] mt-0.5">
        M
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm md:text-xs font-medium text-foreground">Macro Guru</span>
          <span className="text-xs md:text-[10px] text-muted-foreground">Assistant</span>
        </div>
        <div className="text-base md:text-sm leading-[1.75] text-foreground whitespace-pre-wrap">
          {showDots ? (
            <span className="inline-flex items-center gap-1.5 py-1">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
          ) : (
            <>
              {msg.content}
              {showCursor && (
                <span className="inline-block w-0.5 h-4 bg-primary rounded-sm ml-0.5 align-middle anim-cursor" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
