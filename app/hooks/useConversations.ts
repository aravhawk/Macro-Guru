'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
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

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return DEFAULT_TITLE;
  return cleaned.length > MAX_TITLE_LENGTH
    ? `${cleaned.slice(0, MAX_TITLE_LENGTH).trimEnd()}...`
    : cleaned;
}

function titleFromMessages(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user' && m.content.trim());
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

function mostRecentConversationId(conversations: Conversation[]): string {
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
    .filter((c): c is Conversation => c !== null);

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
      // fall through
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

function serializeStore(conversations: Conversation[], activeId: string): string {
  return JSON.stringify({
    version: STORE_VERSION,
    conversations,
    activeId,
  });
}

export type SendResult = 'success' | 'thread-error' | 'general-error';

export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>([]);
  const [activeId, setActiveIdState] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);

  const conversationsRef = useRef<Conversation[]>([]);
  const activeIdRef = useRef('');

  const persist = useCallback((nextConversations: Conversation[], nextActiveId: string) => {
    conversationsRef.current = nextConversations;
    activeIdRef.current = nextActiveId;
    setConversationsState(nextConversations);
    setActiveIdState(nextActiveId);

    try {
      localStorage.setItem(STORAGE_KEY, serializeStore(nextConversations, nextActiveId));
      setStorageWarning(false);
      return true;
    } catch {
      setStorageWarning(true);
      return false;
    }
  }, []);

  const replaceConversation = useCallback((
    conversationId: string,
    updater: (conversation: Conversation) => Conversation,
    nextActiveId = activeIdRef.current,
  ) => {
    const nextConversations = conversationsRef.current.map(conversation =>
      conversation.id === conversationId ? updater(conversation) : conversation,
    );
    persist(nextConversations, nextActiveId);
    return nextConversations.find(conversation => conversation.id === conversationId) ?? null;
  }, [persist]);

  const createNewConversation = useCallback(() => {
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

    persist([nextConversation, ...retained], nextConversation.id);
  }, [isStreaming, persist]);

  const switchConversation = useCallback((id: string) => {
    if (isStreaming || id === activeIdRef.current) return;
    if (!conversationsRef.current.some(c => c.id === id)) return;
    persist(conversationsRef.current, id);
  }, [isStreaming, persist]);

  const deleteConversation = useCallback((id: string) => {
    if (isStreaming) return;

    const remaining = conversationsRef.current.filter(c => c.id !== id);
    if (remaining.length === 0) {
      const nextConversation = createEmptyConversation();
      persist([nextConversation], nextConversation.id);
      return;
    }

    const nextActiveId = id === activeIdRef.current
      ? mostRecentConversationId(remaining)
      : activeIdRef.current;

    persist(remaining, nextActiveId);
  }, [isStreaming, persist]);

  const renameConversation = useCallback((id: string, title: string) => {
    const nextTitle = cleanTitle(title);
    replaceConversation(id, c => ({
      ...c,
      title: nextTitle,
      updatedAt: Date.now(),
    }));
  }, [replaceConversation]);

  const ensureThreadId = useCallback(async (conversationId: string): Promise<string> => {
    const existing = conversationsRef.current.find(c => c.id === conversationId);
    if (!existing) throw new Error('Conversation not found');
    if (existing.threadId) return existing.threadId;

    const res = await fetch('/api/threads', { method: 'POST' });
    if (!res.ok) throw new Error('Thread creation failed');

    const { threadId } = await res.json();
    if (typeof threadId !== 'string' || !threadId) throw new Error('Invalid thread response');

    replaceConversation(conversationId, c => ({ ...c, threadId }));
    return threadId;
  }, [replaceConversation]);

  const sendMessage = useCallback(async (text: string, turnstileToken?: string): Promise<SendResult> => {
    const userMessage = text.trim();
    const conversationId = activeIdRef.current;
    const conversation = conversationsRef.current.find(c => c.id === conversationId);
    if (!userMessage || !conversation || isStreaming || isInitializing) return 'general-error';

    setIsStreaming(true);

    let threadId: string;
    try {
      threadId = await ensureThreadId(conversationId);
    } catch (error) {
      console.error(error);
      setIsStreaming(false);
      return 'thread-error';
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
        body: JSON.stringify({ threadId, message: userMessage, turnstileToken }),
      });

      if (!res.ok || !res.body) throw new Error('Stream request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setConversationsState(prev =>
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
        return { ...current, messages: nextMessages, updatedAt: Date.now() };
      });
    } catch (err) {
      console.error(err);
      replaceConversation(conversationId, current => {
        const nextMessages = [...current.messages];
        nextMessages[nextMessages.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        };
        return { ...current, messages: nextMessages, updatedAt: Date.now() };
      });
    } finally {
      setIsStreaming(false);
    }

    return 'success';
  }, [isStreaming, isInitializing, replaceConversation, ensureThreadId]);

  useEffect(() => {
    const stored = loadStoredConversations();

    if (stored) {
      persist(stored.store.conversations, stored.store.activeId);
      if (stored.migratedLegacy) {
        try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
      }
    } else {
      const conversation = createEmptyConversation();
      persist([conversation], conversation.id);
    }

    setIsInitializing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConversation = conversations.find(c => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  return {
    conversations,
    activeId,
    activeConversation,
    messages,
    isInitializing,
    isStreaming,
    storageWarning,
    createNewConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
  };
}
