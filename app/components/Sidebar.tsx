'use client';

import { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Conversation } from '@/app/hooks/useConversations';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function Sidebar({ conversations, activeId, disabled, isOpen, onToggle, onSwitch, onNew, onDelete, onRename }: SidebarProps) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card h-screen transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0'}`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size={32} />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground leading-none truncate">Macro Guru</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">AP Macroeconomics</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <PanelLeftIcon />
        </button>
      </div>

      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Conversations</span>
        <ThemeToggle />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 min-h-0">
        {sorted.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeId}
            canDelete={conversations.length > 1}
            disabled={disabled}
            onSwitch={onSwitch}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>

      <div className="p-3 border-t border-border">
        <button
          onClick={onNew}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-muted-foreground text-sm hover:border-primary/30 hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New conversation
        </button>
      </div>

      <div className="px-4 py-3 flex gap-3 text-[11px] text-muted-foreground">
        <a href="mailto:aravhawk@gmail.com?subject=Need%20Help%20with%20Macro%20Guru" className="hover:text-foreground transition-colors">Help</a>
        <span>·</span>
        <a href="mailto:aravhawk@gmail.com?subject=Macro%20Guru%20Bug%20Report" className="hover:text-foreground transition-colors">Report bug</a>
      </div>
    </aside>
  );
}

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <line x1="9" x2="9" y1="3" y2="21"/>
    </svg>
  );
}

const MAX_TITLE_LENGTH = 50;

function ConversationItem({
  conversation,
  isActive,
  canDelete,
  disabled,
  onSwitch,
  onDelete,
  onRename,
}: {
  conversation: Conversation;
  isActive: boolean;
  canDelete: boolean;
  disabled: boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRenaming) setRenameValue(conversation.title);
  }, [conversation.title, isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handler = () => setShowDeleteConfirm(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showDeleteConfirm]);

  const commitRename = () => {
    const nextTitle = renameValue.trim();
    setIsRenaming(false);
    if (nextTitle && nextTitle !== conversation.title) {
      onRename(conversation.id, nextTitle);
    } else {
      setRenameValue(conversation.title);
    }
  };

  return (
    <div
      onClick={() => {
        if (!disabled && !isRenaming && !showDeleteConfirm) onSwitch(conversation.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors
        ${isActive ? 'bg-accent' : ''}
        ${!isActive && hovered ? 'bg-accent' : ''}
        ${disabled ? 'opacity-40 cursor-default' : ''}
      `}
    >
      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') { setRenameValue(conversation.title); setIsRenaming(false); }
          }}
          maxLength={MAX_TITLE_LENGTH + 10}
          className="flex-1 min-w-0 bg-background border border-primary/30 rounded px-1.5 py-0.5 text-xs text-foreground outline-none"
        />
      ) : showDeleteConfirm ? (
        <>
          <span className="flex-1 text-xs text-destructive truncate">Delete?</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(conversation.id); }}
            className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowDeleteConfirm(false); }}
            className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </>
      ) : (
        <>
          <span
            onClick={e => { e.stopPropagation(); if (!disabled) setIsRenaming(true); }}
            className={`flex-1 min-w-0 truncate text-xs cursor-text ${isActive ? 'text-accent-foreground font-medium' : 'text-muted-foreground'}`}
            title={conversation.title}
          >
            {conversation.title}
          </span>
          <button
            onClick={e => { e.stopPropagation(); if (!disabled) setIsRenaming(true); }}
            disabled={disabled}
            className={`p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-all ${hovered || isActive ? 'opacity-100' : 'opacity-0'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          </button>
          {canDelete && (
            <button
              onClick={e => { e.stopPropagation(); if (!disabled) setShowDeleteConfirm(true); }}
              disabled={disabled}
              className={`p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${hovered || isActive ? 'opacity-100' : 'opacity-0'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
