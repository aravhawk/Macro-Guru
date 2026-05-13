'use client';

import { Logo } from './Logo';

const EXAMPLE_PROMPTS = [
  "What's the difference between monetary and fiscal policy?",
  'Explain how the AD-AS model works in AP Macro',
  'How does the Federal Reserve respond to inflation?',
];

interface EmptyStateProps {
  disabled: boolean;
  onPrompt: (prompt: string) => void;
}

export function EmptyState({ disabled, onPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] md:min-h-[60vh] text-center px-4 gap-5 md:gap-6 anim-fade-up">
      <Logo size={48} className="md:w-14 md:h-14" />

      <div>
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2 tracking-tight">
          Macro Guru
        </h1>
        <p className="text-base md:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your intelligent guide to AP Macroeconomics. Ask anything, learn everything.
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            disabled={disabled}
            className="w-full flex items-center justify-between px-4 py-3.5 md:py-3 rounded-xl border border-border bg-card text-left text-base md:text-sm text-muted-foreground hover:border-primary/20 hover:text-foreground transition-all group disabled:opacity-40 touch-manipulation"
          >
            <span>{prompt}</span>
            <svg
              className="shrink-0 ml-3 text-muted-foreground group-hover:text-foreground transition-colors"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
