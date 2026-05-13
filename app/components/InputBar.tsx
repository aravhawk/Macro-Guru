'use client';

import { useState, forwardRef } from 'react';

interface InputBarProps {
  value: string;
  disabled: boolean;
  storageWarning: boolean;
  rateLimitReached: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const InputBar = forwardRef<HTMLTextAreaElement, InputBarProps>(function InputBar(
  { value, disabled, storageWarning, rateLimitReached, onChange, onKeyDown, onSubmit },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const canSend = value.trim() && !disabled;

  return (
    <div className="shrink-0 bg-background/80 backdrop-blur-xl border-t border-border px-3 py-3 md:px-6 md:py-5">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div
          className={`
            flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-2xl border transition-colors
            ${focused ? 'border-primary/30 bg-card' : 'border-border bg-muted'}
          `}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={rateLimitReached ? 'Daily message limit reached...' : 'Ask anything about Macroeconomics...'}
            rows={1}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent resize-none outline-none text-base md:text-sm leading-relaxed text-foreground max-h-40 placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`
              shrink-0 w-11 h-11 md:w-8 md:h-8 rounded-xl md:rounded-lg flex items-center justify-center transition-all touch-manipulation
              ${canSend
                ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
                : 'bg-muted text-muted-foreground'
              }
            `}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-[14px] md:h-[14px]">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className={`text-center text-[11px] mt-2 ${rateLimitReached || storageWarning ? 'text-destructive' : 'text-muted-foreground'}`}>
          {rateLimitReached
            ? 'Daily message limit reached. Resets at midnight.'
            : storageWarning
              ? 'Conversation changes could not be saved locally.'
              : 'Enter to send · Shift + Enter for new line'}
        </p>
      </form>
    </div>
  );
});
