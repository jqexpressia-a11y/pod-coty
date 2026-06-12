'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot } from 'lucide-react';
import GlowPanel from './GlowPanel';
import type { AgentInfo } from '@/lib/types';

interface AgentCardProps {
  agent: AgentInfo;
  delay?: number;
}

const colorKey: Record<string, 'cyan' | 'pink' | 'green' | 'amber'> = {
  '#00F5FF': 'cyan',
  '#FF6B9D': 'pink',
  '#00FF88': 'green',
  '#FF9F1C': 'amber',
};

export default function AgentCard({ agent, delay = 0 }: AgentCardProps) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const panelColor = colorKey[agent.color] ?? 'cyan';

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setResponse(data.response ?? '[No response]');
    } catch (e) {
      setResponse(`[Error: ${e}]`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlowPanel
      color={panelColor}
      delay={delay}
      title={agent.name.toUpperCase()}
      icon={<Bot size={12} />}
      className="flex flex-col"
    >
      <div className="p-3 space-y-3">
        <p className="text-[11px] text-[rgba(224,247,250,0.5)] leading-relaxed">{agent.description}</p>

        {/* Status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
            style={{
              color: agent.color,
              borderColor: `${agent.color}35`,
              background: `${agent.color}10`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: agent.color }}
            />
            {agent.status.toUpperCase()}
          </span>
          {agent.lastActivity && (
            <span className="text-[10px] text-[rgba(224,247,250,0.3)] font-mono">
              {agent.lastActivity}
            </span>
          )}
        </div>

        {/* Response area */}
        {response && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-[rgba(0,0,0,0.3)] border border-[rgba(224,247,250,0.06)] rounded-lg p-2 text-[11px] font-mono text-[rgba(224,247,250,0.75)] max-h-28 overflow-y-auto leading-relaxed whitespace-pre-wrap"
          >
            {response}
          </motion.div>
        )}

        {/* Input */}
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${agent.name}…`}
            disabled={loading}
            className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(224,247,250,0.08)] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[#E0F7FA] placeholder-[rgba(224,247,250,0.22)] focus:outline-none focus:border-[rgba(224,247,250,0.22)] disabled:opacity-50 transition-colors min-w-0"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40 flex items-center justify-center flex-shrink-0"
            style={{
              color: agent.color,
              borderColor: `${agent.color}35`,
              background: `${agent.color}0A`,
            }}
          >
            {loading ? '…' : <Send size={12} />}
          </button>
        </div>
      </div>
    </GlowPanel>
  );
}
