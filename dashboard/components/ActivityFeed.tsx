'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import type { ActivityEvent } from '@/lib/types';

const SEED: ActivityEvent[] = [
  {
    id: 'ev-1',
    type: 'system',
    message: 'Mission Control initialized',
    timestamp: new Date(Date.now() - 300_000),
    color: '#00F5FF',
  },
  {
    id: 'ev-2',
    type: 'pod',
    message: 'ai-mission-control-dashboard → active',
    timestamp: new Date(Date.now() - 180_000),
    color: '#FF9F1C',
  },
  {
    id: 'ev-3',
    type: 'claude',
    message: 'Claude bridge connected',
    timestamp: new Date(Date.now() - 60_000),
    color: '#00F5FF',
  },
];

export default function ActivityFeed({ events: extra }: { events?: ActivityEvent[] }) {
  const [events, setEvents] = useState<ActivityEvent[]>(SEED);

  useEffect(() => {
    if (extra?.length) setEvents(prev => [...prev, ...extra]);
  }, [extra]);

  return (
    <div className="relative z-10 border-t border-[rgba(0,245,255,0.08)] bg-[rgba(2,4,15,0.92)] backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[rgba(0,245,255,0.06)]">
        <Activity size={11} className="text-[#00F5FF]/60" />
        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#00F5FF]/60">
          Activity Feed
        </span>
        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
      </div>
      <div className="flex gap-2.5 px-4 py-2 overflow-x-auto">
        <AnimatePresence initial={false}>
          {[...events].reverse().map(ev => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              className="flex-shrink-0 flex items-start gap-2 px-3 py-1.5 rounded-lg border border-[rgba(224,247,250,0.06)] bg-[rgba(0,0,0,0.28)]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: ev.color }}
              />
              <div>
                <div className="text-[11px] font-mono text-[rgba(224,247,250,0.75)] whitespace-nowrap">
                  {ev.message}
                </div>
                <div className="text-[9px] text-[rgba(224,247,250,0.3)] font-mono">
                  {format(ev.timestamp, 'HH:mm:ss')}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
