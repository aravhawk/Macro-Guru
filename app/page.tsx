'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'chat_data';

const EXAMPLE_PROMPTS = [
  "What's the difference between monetary and fiscal policy?",
  'Explain how the AD-AS model works in AP Macro',
  'How does the Federal Reserve respond to inflation?',
];

/* ── Sidebar ──────────────────────────────────────────── */
function Sidebar({
  messageCount,
  onClear,
  disabled,
}: {
  messageCount: number;
  onClear: () => void;
  disabled: boolean;
}) {
  return (
    <aside
      className="hidden md:flex flex-col shrink-0 glass-dark relative"
      style={{
        width: 258,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 20,
      }}
    >
      {/* Amber–teal top stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #f5a623 0%, #14d9c4 65%, transparent 100%)',
        }}
      />

      {/* Logo */}
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

      {/* Session indicator */}
      <div style={{ padding: '14px 16px 0' }}>
        <p
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#263048',
            marginBottom: 8,
          }}
        >
          Session
        </p>
        <div
          className="glass"
          style={{ borderRadius: 12, padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: '#14d9c4',
              boxShadow: '0 0 7px rgba(20,217,196,0.65)',
            }}
          />
          <span style={{ fontSize: 12, color: '#5e6e98' }}>
            {messageCount === 0
              ? 'No messages yet'
              : `${messageCount} message${messageCount === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* New conversation */}
      <div style={{ padding: '0 16px 14px' }}>
        <SidebarButton onClick={onClear} disabled={disabled}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          New conversation
        </SidebarButton>
      </div>

      <Divider />

      {/* Footer links */}
      <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 10, fontSize: 11 }}>
        <FooterLink href="mailto:support@aravhawk.com?subject=Need%20Help%20with%20Macro%20Guru">Help</FooterLink>
        <span style={{ color: '#263048' }}>·</span>
        <FooterLink href="mailto:bugs@aravhawk.com?subject=Macro%20Guru%20Bug%20Report">Report bug</FooterLink>
      </div>
    </aside>
  );
}

/* ── Small shared components ──────────────────────────── */
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

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createNewThread = useCallback(async () => {
    const res = await fetch('/api/threads', { method: 'POST' });
    const { threadId: newThreadId } = await res.json();
    setThreadId(newThreadId);
    setMessages([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ threadId: newThreadId, messages: [] }));
    return newThreadId;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { threadId: storedId, messages: storedMessages } = JSON.parse(stored);
        setThreadId(storedId);
        setMessages(storedMessages ?? []);
        setIsInitializing(false);
      } catch {
        createNewThread().then(() => setIsInitializing(false));
      }
    } else {
      createNewThread().then(() => setIsInitializing(false));
    }
  }, [createNewThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = async () => {
    if (isStreaming) return;
    await createNewThread();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMessage = input.trim();
    if (!userMessage || !threadId || isStreaming) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: Message = { role: 'user', content: userMessage };
    const assistantMsg: Message = { role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

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
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
          return updated;
        });
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ threadId, messages: updated }));
        return updated;
      });
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        };
        return updated;
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
      {/* Ambient background */}
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

      {/* Sidebar */}
      <Sidebar
        messageCount={messages.length}
        onClear={handleClearChat}
        disabled={disabled}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0" style={{ position: 'relative', zIndex: 10 }}>

        {/* Mobile header */}
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
          <button
            onClick={handleClearChat}
            disabled={disabled}
            style={{
              fontSize: 12, padding: '6px 13px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#5e6e98', opacity: disabled ? 0.4 : 1,
            }}
          >
            Clear
          </button>
        </header>

        {/* Messages */}
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
              /* ── Empty state ───────────────────────────── */
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: '64vh', textAlign: 'center', gap: 32,
                }}
              >
                {/* Animated logo mark */}
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

                {/* Heading */}
                <div>
                  <h1
                    className="font-display"
                    style={{ fontSize: 44, fontWeight: 700, color: '#eaefff', lineHeight: 1.1, marginBottom: 14 }}
                  >
                    Macro Guru
                  </h1>
                  <p style={{ fontSize: 15, color: '#46547a', maxWidth: 310, lineHeight: 1.65, margin: '0 auto' }}>
                    Your intelligent guide to AP Macroeconomics — ask anything, learn everything.
                  </p>
                </div>

                {/* Example prompt chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: 480 }}>
                  {EXAMPLE_PROMPTS.map(prompt => (
                    <ExampleChip key={prompt} prompt={prompt} onClick={handleExamplePrompt} />
                  ))}
                </div>
              </div>

            ) : (
              /* ── Message list ──────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {messages.map((msg, i) => (
                  <MessageRow
                    key={i}
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

        {/* Input bar */}
        <InputBar
          ref={textareaRef}
          value={input}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

/* ── Message row ──────────────────────────────────────── */
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

/* ── Example prompt chip ──────────────────────────────── */
function ExampleChip({ prompt, onClick }: { prompt: string; onClick: (p: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
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

/* ── Input bar ────────────────────────────────────────── */
const InputBar = ({
  value,
  disabled,
  onChange,
  onKeyDown,
  onSubmit,
  ref,
}: {
  value: string;
  disabled: boolean;
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
        <p style={{ textAlign: 'center', fontSize: 11, color: '#1e2a46', marginTop: 8 }}>
          Enter to send · Shift+Enter for new line
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
