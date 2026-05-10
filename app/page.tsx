'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  threadId: string | null;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ConversationStore {
  version: 1;
  conversations: Conversation[];
  activeId: string;
}

const STORAGE_KEY = 'macro_guru_conversations';
const LEGACY_KEY = 'chat_data';
const STORE_VERSION = 1;
const MAX_TITLE_LENGTH = 50;
const DEFAULT_TITLE = 'New Conversation';

const EXAMPLE_PROMPTS = [
  "What's the difference between monetary and fiscal policy?",
  'Explain how the AD-AS model works in AP Macro',
  'How does the Federal Reserve respond to inflation?',
];

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanTitle(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return DEFAULT_TITLE;
  return cleaned.length > MAX_TITLE_LENGTH
    ? `${cleaned.slice(0, MAX_TITLE_LENGTH).trimEnd()}...`
    : cleaned;
}

function titleFromMessages(messages: Message[]) {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content.trim());
  return firstUserMessage ? cleanTitle(firstUserMessage.content) : DEFAULT_TITLE;
}

function createEmptyConversation(): Conversation {
  const now = Date.now();
  return {
    id: makeId(),
    title: DEFAULT_TITLE,
    threadId: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Message>;
  return (candidate.role === 'user' || candidate.role === 'assistant') && typeof candidate.content === 'string';
}

function normalizeMessages(value: unknown): Message[] {
  return Array.isArray(value) ? value.filter(isMessage) : [];
}

function normalizeConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as {
    id?: unknown;
    title?: unknown;
    name?: unknown;
    threadId?: unknown;
    messages?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : makeId();
  const threadId = typeof candidate.threadId === 'string' && candidate.threadId.trim()
    ? candidate.threadId
    : null;
  const messages = normalizeMessages(candidate.messages);
  const rawTitle = typeof candidate.title === 'string'
    ? candidate.title
    : typeof candidate.name === 'string'
      ? candidate.name
      : titleFromMessages(messages);
  const createdAt = typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
    ? candidate.createdAt
    : Date.now();
  const updatedAt = typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
    ? candidate.updatedAt
    : createdAt;

  return {
    id,
    title: cleanTitle(rawTitle),
    threadId,
    messages,
    createdAt,
    updatedAt,
  };
}

function mostRecentConversationId(conversations: Conversation[]) {
  return conversations.reduce((latest, conversation) =>
    conversation.updatedAt > latest.updatedAt ? conversation : latest,
  conversations[0]).id;
}

function normalizeStore(value: unknown): ConversationStore | null {
  let conversationsValue: unknown;
  let activeIdValue: unknown;

  if (Array.isArray(value)) {
    conversationsValue = value;
  } else if (value && typeof value === 'object') {
    const candidate = value as { conversations?: unknown; activeId?: unknown };
    conversationsValue = candidate.conversations;
    activeIdValue = candidate.activeId;
  }

  if (!Array.isArray(conversationsValue)) return null;

  const conversations = conversationsValue
    .map(normalizeConversation)
    .filter((conversation): conversation is Conversation => conversation !== null);

  if (conversations.length === 0) return null;

  const activeId = typeof activeIdValue === 'string' && conversations.some(c => c.id === activeIdValue)
    ? activeIdValue
    : mostRecentConversationId(conversations);

  return {
    version: STORE_VERSION,
    conversations,
    activeId,
  };
}

function loadStoredConversations(): { store: ConversationStore; migratedLegacy: boolean } | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const normalized = normalizeStore(JSON.parse(stored));
      if (normalized) return { store: normalized, migratedLegacy: false };
    } catch {
      // Invalid new-format storage falls through to legacy migration.
    }
  }

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;

  try {
    const legacyData = JSON.parse(legacy) as { threadId?: unknown; messages?: unknown };
    const messages = normalizeMessages(legacyData.messages);
    const conversation: Conversation = {
      ...createEmptyConversation(),
      title: titleFromMessages(messages),
      threadId: typeof legacyData.threadId === 'string' ? legacyData.threadId : null,
      messages,
    };

    return {
      migratedLegacy: true,
      store: {
        version: STORE_VERSION,
        conversations: [conversation],
        activeId: conversation.id,
      },
    };
  } catch {
    return null;
  }
}

function serializeStore(conversations: Conversation[], activeId: string) {
  return JSON.stringify({
    version: STORE_VERSION,
    conversations,
    activeId,
  });
}

/* -- Conversation item ---------------------------------- */
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
    if (!isRenaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isRenaming]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleWindowClick = () => setShowDeleteConfirm(false);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
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
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', borderRadius: 10,
        cursor: disabled || isRenaming ? 'default' : 'pointer',
        background: isActive
          ? 'rgba(245,166,35,0.09)'
          : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: isActive
          ? '1px solid rgba(245,166,35,0.18)'
          : '1px solid transparent',
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        style={{
          width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
          background: isActive ? '#f5a623' : 'transparent',
          boxShadow: isActive ? '0 0 6px rgba(245,166,35,0.5)' : 'none',
        }}
      />

      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitRename();
            }
            if (e.key === 'Escape') {
              setRenameValue(conversation.title);
              setIsRenaming(false);
            }
          }}
          maxLength={MAX_TITLE_LENGTH + 10}
          style={{
            flex: 1, minWidth: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 6, padding: '2px 6px',
            fontSize: 12, color: '#eaefff', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      ) : showDeleteConfirm ? (
        <>
          <span style={{ fontSize: 11, color: '#e06060', flex: 1 }}>Delete?</span>
          <button
            type="button"
            aria-label="Confirm delete conversation"
            onClick={e => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
            style={{
              flexShrink: 0, width: 22, height: 22, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(20,217,196,0.12)', border: 'none',
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
              stroke="#14d9c4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Cancel delete conversation"
            onClick={e => {
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
            style={{
              flexShrink: 0, width: 22, height: 22, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', border: 'none',
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
              stroke="#5e6e98" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <span
            onClick={e => {
              e.stopPropagation();
              if (!disabled) setIsRenaming(true);
            }}
            title={conversation.title}
            style={{
              flex: 1, minWidth: 0, fontSize: 12,
              color: isActive ? '#c9a040' : '#5e6e98',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: disabled ? 'default' : 'text',
            }}
          >
            {conversation.title}
          </span>
          <button
            type="button"
            aria-label="Rename conversation"
            onClick={e => {
              e.stopPropagation();
              if (!disabled) setIsRenaming(true);
            }}
            disabled={disabled}
            style={{
              flexShrink: 0, width: 22, height: 22, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              opacity: hovered || isActive ? 0.55 : 0,
              transition: 'opacity 0.15s',
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
              stroke="#5e6e98" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          {canDelete && (
            <button
              type="button"
              aria-label="Delete conversation"
              onClick={e => {
                e.stopPropagation();
                if (!disabled) setShowDeleteConfirm(true);
              }}
              disabled={disabled}
              style={{
                flexShrink: 0, width: 22, height: 22, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none',
                cursor: disabled ? 'default' : 'pointer',
                opacity: hovered || isActive ? 0.4 : 0,
                transition: 'opacity 0.15s',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
                stroke="#5e6e98" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* -- Sidebar -------------------------------------------- */
function Sidebar({
  conversations,
  activeId,
  onSwitch,
  onNew,
  onDelete,
  onRename,
  disabled,
}: {
  conversations: Conversation[];
  activeId: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  disabled: boolean;
}) {
  const sorted = conversations
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 glass-dark relative"
      style={{
        width: 258,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #f5a623 0%, #14d9c4 65%, transparent 100%)',
        }}
      />

      <div style={{ padding: '26px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoMark size={42} radius={13} fontSize={19} />
          <div>
            <p
              className="font-display"
              style={{ fontSize: 17, fontWeight: 700, color: '#eaefff', lineHeight: 1 }}
            >
              Macro Guru
            </p>
            <p
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#37415e',
                marginTop: 5,
              }}
            >
              AP Macroeconomics
            </p>
          </div>
        </div>
      </div>

      <Divider />

      <div style={{ padding: '14px 16px 0', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <p
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#263048',
            marginBottom: 8,
          }}
        >
          Conversations
        </p>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      </div>

      <div style={{ padding: '0 16px 14px' }}>
        <SidebarButton onClick={onNew} disabled={disabled}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New conversation
        </SidebarButton>
      </div>

      <Divider />

      <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 10, fontSize: 11 }}>
        <FooterLink href="mailto:support@aravhawk.com?subject=Need%20Help%20with%20Macro%20Guru">Help</FooterLink>
        <span style={{ color: '#263048' }}>.</span>
        <FooterLink href="mailto:bugs@aravhawk.com?subject=Macro%20Guru%20Bug%20Report">Report bug</FooterLink>
      </div>
    </aside>
  );
}

function MobileConversationBar({
  conversations,
  activeId,
  disabled,
  onSwitch,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string;
  disabled: boolean;
  onSwitch: (id: string) => void;
  onNew: () => void;
}) {
  const sorted = conversations
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div
      className="md:hidden shrink-0"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 16px',
        background: 'rgba(5,8,22,0.94)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <select
        value={activeId}
        disabled={disabled}
        onChange={e => onSwitch(e.target.value)}
        aria-label="Select conversation"
        style={{
          flex: 1, minWidth: 0,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          color: '#9aa8ce',
          fontSize: 12,
          padding: '7px 9px',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {sorted.map(conversation => (
          <option key={conversation.id} value={conversation.id}>
            {conversation.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        style={{
          flexShrink: 0,
          fontSize: 12, padding: '7px 11px', borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#5e6e98',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        New
      </button>
    </div>
  );
}

/* -- Small shared components ---------------------------- */
function LogoMark({
  size,
  radius,
  fontSize,
}: {
  size: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <div
      className="font-display"
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: 'linear-gradient(140deg, #f5a623 0%, #f7cc44 100%)',
        color: '#07090f', fontWeight: 700, fontSize,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 18px rgba(245,166,35,0.35)',
      }}
    >
      M
    </div>
  );
}

function Divider() {
  return (
    <div style={{ margin: '0 16px', height: 1, background: 'rgba(255,255,255,0.05)' }} />
  );
}

function SidebarButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${hovered && !disabled ? 'rgba(245,166,35,0.22)' : 'rgba(255,255,255,0.07)'}`,
        background: hovered && !disabled ? 'rgba(245,166,35,0.07)' : 'rgba(255,255,255,0.04)',
        color: hovered && !disabled ? '#f5a623' : '#5e6e98',
        fontSize: 13, transition: 'all 0.2s ease',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? '#5e6e98' : '#263048',
        textDecoration: 'none', transition: 'color 0.2s',
      }}
    >
      {children}
    </a>
  );
}

/* -- Main page ------------------------------------------ */
export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);

  const conversationsRef = useRef<Conversation[]>([]);
  const activeIdRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(conversation => conversation.id === activeId);
  const messages = activeConversation?.messages ?? [];

  const persistConversations = (nextConversations: Conversation[], nextActiveId: string) => {
    conversationsRef.current = nextConversations;
    activeIdRef.current = nextActiveId;
    setConversations(nextConversations);
    setActiveId(nextActiveId);

    try {
      localStorage.setItem(STORAGE_KEY, serializeStore(nextConversations, nextActiveId));
      setStorageWarning(false);
      return true;
    } catch (error) {
      console.warn('Failed to save conversations', error);
      setStorageWarning(true);
      return false;
    }
  };

  const replaceConversation = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation,
    nextActiveId = activeIdRef.current,
  ) => {
    const nextConversations = conversationsRef.current.map(conversation =>
      conversation.id === conversationId ? updater(conversation) : conversation,
    );
    persistConversations(nextConversations, nextActiveId);
    return nextConversations.find(conversation => conversation.id === conversationId) ?? null;
  };

  const createNewConversation = () => {
    if (isStreaming) return;

    const currentActiveId = activeIdRef.current;
    const nextConversation = createEmptyConversation();
    const retained = conversationsRef.current.filter(conversation => {
      const isCurrentEmptyDraft = conversation.id === currentActiveId
        && conversation.messages.length === 0
        && conversation.threadId === null
        && conversation.title === DEFAULT_TITLE;
      return !isCurrentEmptyDraft;
    });

    persistConversations([nextConversation, ...retained], nextConversation.id);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const switchConversation = (id: string) => {
    if (isStreaming || id === activeIdRef.current) return;
    if (!conversationsRef.current.some(conversation => conversation.id === id)) return;
    persistConversations(conversationsRef.current, id);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const deleteConversation = (id: string) => {
    if (isStreaming) return;

    const remaining = conversationsRef.current.filter(conversation => conversation.id !== id);
    if (remaining.length === 0) {
      const nextConversation = createEmptyConversation();
      persistConversations([nextConversation], nextConversation.id);
      setInput('');
      return;
    }

    const nextActiveId = id === activeIdRef.current
      ? mostRecentConversationId(remaining)
      : activeIdRef.current;

    persistConversations(remaining, nextActiveId);
    if (id === activeIdRef.current) setInput('');
  };

  const renameConversation = (id: string, title: string) => {
    const nextTitle = cleanTitle(title);
    replaceConversation(id, conversation => ({
      ...conversation,
      title: nextTitle,
      updatedAt: Date.now(),
    }));
  };

  const ensureThreadId = async (conversationId: string) => {
    const existing = conversationsRef.current.find(conversation => conversation.id === conversationId);
    if (!existing) throw new Error('Conversation not found');
    if (existing.threadId) return existing.threadId;

    const res = await fetch('/api/threads', { method: 'POST' });
    if (!res.ok) throw new Error('Thread creation failed');

    const { threadId } = await res.json();
    if (typeof threadId !== 'string' || !threadId) throw new Error('Invalid thread response');

    replaceConversation(conversationId, conversation => ({
      ...conversation,
      threadId,
    }));

    return threadId;
  };

  useEffect(() => {
    const stored = loadStoredConversations();

    if (stored) {
      persistConversations(stored.store.conversations, stored.store.activeId);
      if (stored.migratedLegacy) {
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {
          // Keeping legacy data is harmless because the new store now wins.
        }
      }
    } else {
      const conversation = createEmptyConversation();
      persistConversations([conversation], conversation.id);
    }

    setIsInitializing(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = input.trim();
    const conversationId = activeIdRef.current;
    const conversation = conversationsRef.current.find(item => item.id === conversationId);
    if (!userMessage || !conversation || isStreaming || isInitializing) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsStreaming(true);

    let threadId: string;
    try {
      threadId = await ensureThreadId(conversationId);
    } catch (error) {
      console.error(error);
      setInput(userMessage);
      setIsStreaming(false);
      return;
    }

    const now = Date.now();
    const userMsg: Message = { role: 'user', content: userMessage };
    const assistantMsg: Message = { role: 'assistant', content: '' };

    replaceConversation(conversationId, current => ({
      ...current,
      title: current.title === DEFAULT_TITLE ? cleanTitle(userMessage) : current.title,
      messages: [...current.messages, userMsg, assistantMsg],
      updatedAt: now,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, message: userMessage }),
      });

      if (!res.ok || !res.body) throw new Error('Stream request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setConversations(prev =>
          prev.map(current => {
            if (current.id !== conversationId) return current;
            const nextMessages = [...current.messages];
            nextMessages[nextMessages.length - 1] = { role: 'assistant', content: fullResponse };
            return { ...current, messages: nextMessages };
          }),
        );
      }

      replaceConversation(conversationId, current => {
        const nextMessages = [...current.messages];
        nextMessages[nextMessages.length - 1] = { role: 'assistant', content: fullResponse };
        return {
          ...current,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      });
    } catch (err) {
      console.error(err);
      replaceConversation(conversationId, current => {
        const nextMessages = [...current.messages];
        nextMessages[nextMessages.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        };
        return {
          ...current,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      });
    } finally {
      setIsStreaming(false);
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

  const disabled = isStreaming || isInitializing;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#070c1f', color: '#dde4ff', position: 'relative' }}
    >
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(110,130,255,0.022) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(110,130,255,0.022) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 75% 45% at 50% 0%, rgba(110,130,255,0.09), transparent 72%)',
        }}
      />

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSwitch={switchConversation}
        onNew={createNewConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        disabled={disabled}
      />

      <div className="flex flex-col flex-1 min-w-0" style={{ position: 'relative', zIndex: 10 }}>
        <header
          className="md:hidden flex items-center justify-between shrink-0"
          style={{
            padding: '12px 16px',
            background: 'rgba(5,8,22,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={32} radius={9} fontSize={14} />
            <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: '#eaefff' }}>
              Macro Guru
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#37415e' }}>
            {messages.length} message{messages.length === 1 ? '' : 's'}
          </span>
        </header>

        <MobileConversationBar
          conversations={conversations}
          activeId={activeId}
          disabled={disabled}
          onSwitch={switchConversation}
          onNew={createNewConversation}
        />

        <main className="flex-1 overflow-y-auto">
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px' }}>

            {isInitializing ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 130 }}>
                <div
                  className="animate-spin"
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '2.5px solid rgba(245,166,35,0.18)',
                    borderTopColor: '#f5a623',
                  }}
                />
              </div>

            ) : messages.length === 0 ? (
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: '64vh', textAlign: 'center', gap: 32,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute', inset: -18, borderRadius: 28,
                      background: 'linear-gradient(140deg, rgba(245,166,35,0.14), rgba(20,217,196,0.09))',
                      animation: 'ringExpand 2.6s ease-out infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute', inset: -10, borderRadius: 22,
                      background: 'linear-gradient(140deg, rgba(245,166,35,0.1), rgba(20,217,196,0.07))',
                      animation: 'ringExpand 2.6s ease-out infinite',
                      animationDelay: '0.85s',
                    }}
                  />
                  <div
                    className="font-display anim-logo-pulse"
                    style={{
                      width: 84, height: 84, borderRadius: 22, position: 'relative',
                      background: 'linear-gradient(140deg, #f5a623 0%, #f7cc44 100%)',
                      color: '#07090f', fontWeight: 700, fontSize: 34,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    M
                  </div>
                </div>

                <div>
                  <h1
                    className="font-display"
                    style={{ fontSize: 44, fontWeight: 700, color: '#eaefff', lineHeight: 1.1, marginBottom: 14 }}
                  >
                    Macro Guru
                  </h1>
                  <p style={{ fontSize: 15, color: '#46547a', maxWidth: 310, lineHeight: 1.65, margin: '0 auto' }}>
                    Your intelligent guide to AP Macroeconomics - ask anything, learn everything.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: 480 }}>
                  {EXAMPLE_PROMPTS.map(prompt => (
                    <ExampleChip key={prompt} prompt={prompt} onClick={handleExamplePrompt} />
                  ))}
                </div>
              </div>

            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {messages.map((msg, i) => (
                  <MessageRow
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

/* -- Message row ---------------------------------------- */
function MessageRow({
  msg,
  isLast,
  isStreaming,
}: {
  msg: Message;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = msg.role === 'user';
  const showDots = !isUser && isLast && isStreaming && msg.content === '';
  const showCursor = !isUser && isLast && isStreaming && msg.content !== '';

  return (
    <div
      className="anim-fade-up"
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {!isUser && (
        <div
          className="font-display"
          style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 10, marginTop: 2,
            background: 'linear-gradient(140deg, #f5a623 0%, #f7cc44 100%)',
            color: '#07090f', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(245,166,35,0.22)',
          }}
        >
          M
        </div>
      )}

      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          fontSize: 14, lineHeight: 1.7,
          ...(isUser
            ? {
                background: 'linear-gradient(140deg, #f5a623 0%, #e89510 100%)',
                color: '#080b12',
                borderRadius: '18px 4px 18px 18px',
                fontWeight: 500,
                boxShadow: '0 4px 22px rgba(245,166,35,0.2)',
              }
            : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#c2cceb',
                borderRadius: '4px 18px 18px 18px',
                backdropFilter: 'blur(10px)',
              }),
        }}
      >
        {showDots ? (
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
            <span className="dot" style={{ background: '#f5a623' }} />
            <span className="dot" style={{ background: '#f5a623' }} />
            <span className="dot" style={{ background: '#f5a623' }} />
          </span>
        ) : (
          <>
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            {showCursor && (
              <span
                className="anim-cursor"
                style={{
                  display: 'inline-block', width: 2, height: 15,
                  background: '#14d9c4', borderRadius: 1,
                  marginLeft: 2, verticalAlign: 'middle',
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* -- Example prompt chip -------------------------------- */
function ExampleChip({ prompt, onClick }: { prompt: string; onClick: (p: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
        background: hovered ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(245,166,35,0.18)' : 'rgba(255,255,255,0.06)'}`,
        color: hovered ? '#c9a040' : '#6a7a9e',
        fontSize: 13, lineHeight: 1.5,
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ flex: 1 }}>{prompt}</span>
      <svg
        style={{ flexShrink: 0, marginLeft: 10, opacity: hovered ? 0.7 : 0.35, transition: 'opacity 0.2s' }}
        width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

/* -- Input bar ------------------------------------------ */
const InputBar = ({
  value,
  disabled,
  storageWarning,
  onChange,
  onKeyDown,
  onSubmit,
  ref,
}: {
  value: string;
  disabled: boolean;
  storageWarning: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  ref: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const [focused, setFocused] = useState(false);
  const canSend = value.trim() && !disabled;

  return (
    <div
      className="shrink-0"
      style={{
        padding: '14px 20px 18px',
        background: 'rgba(7,12,31,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <form onSubmit={onSubmit} style={{ maxWidth: 700, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex', alignItems: 'flex-end', gap: 10,
            padding: '11px 13px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? 'rgba(245,166,35,0.38)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 18,
            boxShadow: focused ? '0 0 0 3px rgba(245,166,35,0.07)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder="Ask anything about Macroeconomics..."
            rows={1}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1, background: 'transparent', resize: 'none', outline: 'none',
              fontSize: 14, lineHeight: 1.6, color: '#c2cceb',
              maxHeight: 160, fontFamily: 'inherit',
              opacity: disabled ? 0.5 : 1,
            }}
          />
          <SendButton active={!!canSend} />
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: storageWarning ? '#8c6140' : '#1e2a46', marginTop: 8 }}>
          {storageWarning ? 'Conversation changes could not be saved locally.' : 'Enter to send · Shift+Enter for new line'}
        </p>
      </form>
    </div>
  );
};

function SendButton({ active }: { active: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={!active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: 'none',
        background: active
          ? 'linear-gradient(140deg, #f5a623 0%, #14d9c4 100%)'
          : 'rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: active ? 'pointer' : 'not-allowed',
        opacity: active ? (hovered ? 0.88 : 1) : 0.35,
        boxShadow: active ? '0 0 16px rgba(245,166,35,0.3)' : 'none',
        transition: 'all 0.22s ease',
        transform: hovered && active ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
}
