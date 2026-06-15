'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal, Zap, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import GlowPanel from './GlowPanel';
import type { Message } from '@/lib/types';

export default function ClaudeTerminal() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys-0',
      role: 'system',
      content: 'Claude Code CLI bridge active. Type a prompt and press Send — or hit Enter.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendPrompt = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const prompt = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch('/api/claude/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === 'delta') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: m.content + ev.text } : m
                )
              );
            } else if (ev.type === 'done') {
              setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, streaming: false } : m))
              );
              setStreaming(false);
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: `[Error: ${e}]`, streaming: false } : m
        )
      );
      setStreaming(false);
    }
  }, [input, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };

  return (
    <GlowPanel
      color="cyan"
      title="CLAUDE TERMINAL"
      icon={<Terminal size={12} />}
      delay={0.1}
      className="flex flex-col h-full"
    >
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'system' ? (
                <div className="text-[10px] text-[rgba(224,247,250,0.35)] font-mono px-3 py-1.5 rounded border border-[rgba(0,245,255,0.08)] bg-[rgba(0,245,255,0.03)]">
                  {msg.content}
                </div>
              ) : (
                <>
                  <div className="text-[9px] font-mono text-[rgba(224,247,250,0.3)] px-1" suppressHydrationWarning>
                    {msg.role === 'user' ? 'YOU' : 'CLAUDE'} · {format(msg.timestamp, 'HH:mm:ss')}
                  </div>
                  <div
                    className={`max-w-[88%] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] text-[#E0F7FA]'
                        : 'bg-[rgba(6,12,35,0.6)] border border-[rgba(0,245,255,0.08)] text-[rgba(224,247,250,0.85)]'
                    }`}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-[7px] h-[14px] bg-[#00F5FF] ml-0.5 cursor-blink align-middle" />
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="border-t border-[rgba(0,245,255,0.1)] p-3 flex gap-2">
        <div className="flex-1">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Send a prompt to Claude… (Enter to send, Shift+Enter for newline)"
            disabled={streaming}
            rows={2}
            className="w-full bg-[rgba(0,245,255,0.05)] border border-[rgba(0,245,255,0.15)] rounded-lg px-3 py-2 text-sm font-mono text-[#E0F7FA] placeholder-[rgba(224,247,250,0.25)] focus:outline-none focus:border-[rgba(0,245,255,0.4)] resize-none disabled:opacity-50 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={sendPrompt}
            disabled={streaming || !input.trim()}
            className="px-3 py-2 rounded-lg bg-[rgba(0,245,255,0.12)] border border-[rgba(0,245,255,0.3)] text-[#00F5FF] hover:bg-[rgba(0,245,255,0.22)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
          >
            {streaming ? <Zap size={14} className="animate-pulse" /> : <Send size={14} />}
            {streaming ? 'Streaming…' : 'Send'}
          </button>
          <button
            onClick={() =>
              setMessages([
                { id: `sys-clear-${Date.now()}`, role: 'system', content: 'Terminal cleared.', timestamp: new Date() },
              ])
            }
            className="px-3 py-1.5 rounded-lg bg-transparent border border-[rgba(224,247,250,0.08)] text-[rgba(224,247,250,0.4)] hover:border-[rgba(224,247,250,0.2)] hover:text-[rgba(224,247,250,0.6)] transition-all text-xs flex items-center gap-1 justify-center"
          >
            <RotateCcw size={10} />
            Clear
          </button>
        </div>
      </div>
    </GlowPanel>
  );
}
