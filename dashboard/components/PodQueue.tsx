'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Inbox, Play, Archive, AlertTriangle } from 'lucide-react';
import GlowPanel from './GlowPanel';
import type { PodFile } from '@/lib/types';

const folderMeta = {
  inbox:   { label: 'Inbox',   color: '#FF9F1C', Icon: Inbox          },
  active:  { label: 'Active',  color: '#00F5FF', Icon: Play           },
  archive: { label: 'Archive', color: '#00FF88', Icon: Archive        },
  failed:  { label: 'Failed',  color: '#FF6B9D', Icon: AlertTriangle  },
} as const;

export default function PodQueue() {
  const [pods, setPods] = useState<PodFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pods');
        const data = await res.json();
        setPods(data.pods ?? []);
      } catch {}
      setLoading(false);
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const grouped = (folder: PodFile['folder']) => pods.filter(p => p.folder === folder);

  return (
    <GlowPanel color="amber" title="POD QUEUE" icon={<Package size={12} />} delay={0.35} className="h-full">
      <div className="p-3 space-y-3 overflow-y-auto max-h-[320px]">
        {loading && (
          <div className="text-[11px] text-[rgba(224,247,250,0.4)] font-mono animate-pulse">
            Scanning pod directories…
          </div>
        )}

        {Object.entries(folderMeta).map(([folder, meta]) => {
          const items = grouped(folder as PodFile['folder']);
          if (items.length === 0) return null;
          return (
            <div key={folder}>
              <div
                className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: meta.color }}
              >
                <meta.Icon size={10} />
                {meta.label}
                <span className="opacity-50">({items.length})</span>
              </div>
              <AnimatePresence>
                {items.map(pod => (
                  <motion.div
                    key={pod.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-start gap-2 px-2.5 py-2 mb-1 rounded-lg border border-[rgba(224,247,250,0.05)] bg-[rgba(0,0,0,0.2)] hover:border-[rgba(224,247,250,0.12)] transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: meta.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-mono text-[rgba(224,247,250,0.8)] truncate">
                        {pod.title || pod.task_id}
                      </div>
                      <div className="text-[9px] text-[rgba(224,247,250,0.35)] truncate font-mono">
                        {pod.task_id}
                      </div>
                    </div>
                    {pod.priority && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded border border-[rgba(255,159,28,0.2)] text-[rgba(255,159,28,0.7)] flex-shrink-0 font-mono uppercase">
                        {pod.priority}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}

        {!loading && pods.length === 0 && (
          <div className="text-[11px] text-[rgba(224,247,250,0.3)] font-mono">
            No pods in queue.
          </div>
        )}
      </div>
    </GlowPanel>
  );
}
