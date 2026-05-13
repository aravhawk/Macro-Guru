'use client';

import { useState, useRef, useEffect } from 'react';
import { useConversations } from './hooks/useConversations';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { EmptyState } from './components/EmptyState';
import { InputBar } from './components/InputBar';
import { Logo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';

export default function Home() {
  const {
    conversations,
    activeId,
    messages,
    isInitializing,
    isStreaming,
    storageWarning,
    createNewConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
  } = useConversations();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const disabled = isStreaming || isInitializing;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const result = await sendMessage(userMessage);
    if (result === 'thread-error') {
      setInput(userMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }, 0);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="noise-overlay" aria-hidden="true" />

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        disabled={disabled}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        onSwitch={switchConversation}
        onNew={createNewConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
      />

      {/* Sidebar toggle when collapsed (desktop) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Expand sidebar"
          className="hidden md:flex fixed top-3 left-3 z-40 p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <line x1="9" x2="9" y1="3" y2="21"/>
          </svg>
        </button>
      )}

      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between shrink-0 px-3 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-semibold text-foreground">Macro Guru</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {messages.length}
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile conversation selector */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
          <select
            value={activeId}
            disabled={disabled}
            onChange={e => switchConversation(e.target.value)}
            aria-label="Select conversation"
            className="flex-1 min-w-0 bg-muted border border-border rounded-lg text-foreground text-sm px-3 py-2 outline-none disabled:opacity-50 appearance-none"
            style={{ backgroundImage: 'none' }}
          >
            {[...conversations].sort((a, b) => b.updatedAt - a.updatedAt).map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button
            onClick={createNewConversation}
            disabled={disabled}
            className="shrink-0 text-sm font-medium px-4 py-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 touch-manipulation"
          >
            New
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-10">
            {isInitializing ? (
              <div className="flex justify-center pt-32">
                <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState disabled={disabled} onPrompt={handleExamplePrompt} />
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={`${msg.role}-${i}`}
                    msg={msg}
                    isLast={i === messages.length - 1}
                    isStreaming={isStreaming}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <InputBar
          ref={textareaRef}
          value={input}
          disabled={disabled}
          storageWarning={storageWarning}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
