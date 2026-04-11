"use client";

import { cn } from "@/lib/utils";

const TOPICS = [
  { title: "GDP & Economic Growth", emoji: "📊", prompt: "GDP & Economic Growth" },
  { title: "Inflation & CPI", emoji: "📈", prompt: "Inflation & CPI" },
  { title: "Monetary Policy & the Fed", emoji: "🏦", prompt: "Monetary Policy & the Fed" },
  { title: "Fiscal Policy & Government Spending", emoji: "🏛️", prompt: "Fiscal Policy & Government Spending" },
  { title: "Unemployment & NAIRU", emoji: "👥", prompt: "Unemployment & NAIRU" },
  { title: "Aggregate Supply & Demand", emoji: "📉", prompt: "Aggregate Supply & Demand" },
  { title: "Money Market & Interest Rates", emoji: "💰", prompt: "Money Market & Interest Rates" },
  { title: "The Phillips Curve", emoji: "🔄", prompt: "The Phillips Curve" },
  { title: "International Trade & Exchange Rates", emoji: "🌍", prompt: "International Trade & Exchange Rates" },
  { title: "Economic Indicators & Business Cycles", emoji: "🔁", prompt: "Economic Indicators & Business Cycles" },
];

interface TopicGridProps {
  onSelectTopic: (topic: string) => void;
}

export function TopicGrid({ onSelectTopic }: TopicGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TOPICS.map((topic) => (
        <button
          key={topic.title}
          onClick={() => onSelectTopic(topic.prompt)}
          className={cn(
            "topic-card group flex items-center gap-3 p-4 rounded-xl",
            "bg-card border border-border/50 hover:border-emerald/30",
            "text-left transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-emerald/50"
          )}
        >
          <span className="text-2xl shrink-0">{topic.emoji}</span>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-emerald transition-colors">
              {topic.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click to start learning
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
