'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthContext';

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

const DEFAULT_TITLE = 'New Conversation';

function cleanTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return DEFAULT_TITLE;
  return cleaned.length > 50
    ? `${cleaned.slice(0, 50).trimEnd()}...`
    : cleaned;
}

export type SendResult = 'success' | 'thread-error' | 'general-error' | 'rate-limit';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversationsState] = useState<Conversation[]>([]);
  const [activeId, setActiveIdState] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  const conversationsRef = useRef<Conversation[]>([]);
  const activeIdRef = useRef('');

  const persist = useCallback((nextConversations: Conversation[], nextActiveId: string) => {
    conversationsRef.current = nextConversations;
    activeIdRef.current = nextActiveId;
    setConversationsState(nextConversations);
    setActiveIdState(nextActiveId);
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

  const createNewConversation = useCallback(async () => {
    if (isStreaming || !user) return;

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Failed to create conversation');

      const { conversation } = await res.json();

      const currentActiveId = activeIdRef.current;
      const retained = conversationsRef.current.filter(conversation => {
        const isCurrentEmptyDraft = conversation.id === currentActiveId
          && conversation.messages.length === 0
          && conversation.threadId === null
          && conversation.title === DEFAULT_TITLE;
        return !isCurrentEmptyDraft;
      });

      persist([conversation, ...retained], conversation.id);
    } catch (error) {
      console.error('Create conversation error:', error);
    }
  }, [isStreaming, user, persist]);

  const switchConversation = useCallback((id: string) => {
    if (isStreaming || id === activeIdRef.current) return;
    if (!conversationsRef.current.some(c => c.id === id)) return;
    persist(conversationsRef.current, id);
  }, [isStreaming, persist]);

  const deleteConversation = useCallback(async (id: string) => {
    if (isStreaming || !user) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete conversation');

      const remaining = conversationsRef.current.filter(c => c.id !== id);
      if (remaining.length === 0) {
        // Create a new empty conversation
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (createRes.ok) {
          const { conversation } = await createRes.json();
          persist([conversation], conversation.id);
        }
        return;
      }

      const nextActiveId = id === activeIdRef.current
        ? remaining.reduce((latest, c) => c.updatedAt > latest.updatedAt ? c : latest, remaining[0]).id
        : activeIdRef.current;

      persist(remaining, nextActiveId);
    } catch (error) {
      console.error('Delete conversation error:', error);
    }
  }, [isStreaming, user, persist]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    if (!user) return;
    const nextTitle = cleanTitle(title);

    // Optimistic update
    replaceConversation(id, c => ({ ...c, title: nextTitle, updatedAt: Date.now() }));

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!res.ok) throw new Error('Failed to rename');
    } catch (error) {
      console.error('Rename conversation error:', error);
    }
  }, [user, replaceConversation]);

  const ensureThreadId = useCallback(async (conversationId: string): Promise<string> => {
    const existing = conversationsRef.current.find(c => c.id === conversationId);
    if (!existing) throw new Error('Conversation not found');
    if (existing.threadId) return existing.threadId;

    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });
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
        body: JSON.stringify({ threadId, conversationId, message: userMessage, turnstileToken }),
      });

      if (res.status === 429) {
        // Rate limit hit - remove the optimistic messages
        replaceConversation(conversationId, current => ({
          ...current,
          messages: current.messages.slice(0, -2),
        }));
        setIsStreaming(false);
        return 'rate-limit';
      }

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

  // Fetch conversations from server on mount
  useEffect(() => {
    if (!user) {
      setConversationsState([]);
      setActiveIdState('');
      setIsInitializing(false);
      return;
    }

    async function loadConversations() {
      try {
        const res = await fetch('/api/conversations');
        if (!res.ok) throw new Error('Failed to load conversations');

        const { conversations: serverConversations } = await res.json();

        if (serverConversations.length === 0) {
          // Create initial conversation
          const createRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          if (createRes.ok) {
            const { conversation } = await createRes.json();
            persist([conversation], conversation.id);
          }
        } else {
          persist(serverConversations, serverConversations[0].id);
        }
      } catch (error) {
        console.error('Load conversations error:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    loadConversations();
  }, [user, persist]);

  const activeConversation = conversations.find(c => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  return {
    conversations,
    activeId,
    activeConversation,
    messages,
    isInitializing,
    isStreaming,
    storageWarning: false,
    createNewConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
  };
}
