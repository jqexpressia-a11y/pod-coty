'use client';
import dynamic from 'next/dynamic';
import MissionHeader from '@/components/MissionHeader';
import ClaudeTerminal from '@/components/ClaudeTerminal';
import AgentCard from '@/components/AgentCard';
import PodQueue from '@/components/PodQueue';
import ActivityFeed from '@/components/ActivityFeed';
import type { AgentInfo } from '@/lib/types';

const StarField = dynamic(() => import('@/components/StarField'), { ssr: false });

const AGENTS: AgentInfo[] = [
  {
    id: 'openclaw',
    name: 'OpenClaw PM',
    description: 'JQ Traffic Control — routes tasks through n8n and the agent hierarchy. Stops at approval gates.',
    color: '#FF6B9D',
    status: 'idle',
    lastActivity: 'jq-pm agent',
  },
  {
    id: 'hermes',
    name: 'Hermes PM',
    description: 'Automation Project Manager. Dispatches tasks via n8n webhook to CrewAI / Firecrawl / Claude.',
    color: '#00FF88',
    status: 'idle',
    lastActivity: 'n8n webhook',
  },
];

export default function Page() {
  return (
    <div className="relative flex flex-col h-screen bg-[#02040F] overflow-hidden">
      {/* Animated space background */}
      <StarField />

      {/* Grid overlay */}
      <div className="fixed inset-0 bg-grid pointer-events-none z-0 opacity-60" />

      {/* Header */}
      <MissionHeader />

      {/* Main content grid */}
      <div className="relative z-10 flex-1 grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left: Claude Terminal — takes full height */}
        <ClaudeTerminal />

        {/* Right column: agents + pods */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {AGENTS.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} delay={0.2 + i * 0.1} />
          ))}
          <div className="flex-1 min-h-0">
            <PodQueue />
          </div>
        </div>
      </div>

      {/* Bottom activity feed */}
      <ActivityFeed />
    </div>
  );
}
