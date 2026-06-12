'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Radio, Wifi, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function MissionHeader() {
  const [time, setTime] = useState(new Date());
  const [pulseIdx, setPulseIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const p = setInterval(() => setPulseIdx(i => (i + 1) % 4), 800);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const dots = ['⠋','⠙','⠹','⠸'][pulseIdx];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="relative z-20 flex items-center gap-6 px-6 py-3 border-b border-[rgba(0,245,255,0.12)] bg-[rgba(2,4,15,0.9)] backdrop-blur-xl"
    >
      {/* Branding */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 flex items-center justify-center">
            <Cpu size={16} className="text-[#00F5FF]" />
          </div>
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-wider text-[#00F5FF] text-glow-cyan">
            POD CITY
          </div>
          <div className="text-[10px] text-[rgba(224,247,250,0.45)] tracking-widest uppercase">
            Mission Control
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 ml-4">
        {[
          { icon: <Radio size={12} />, label: 'Claude', color: '#00F5FF', status: 'ACTIVE' },
          { icon: <Wifi size={12} />,  label: 'Bridge',  color: '#FF9F1C', status: 'READY'  },
          { icon: <Shield size={12} />,label: 'Guards',  color: '#00FF88', status: 'ON'     },
        ].map(({ icon, label, color, status }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px]">
            <span style={{ color }}>{icon}</span>
            <span className="text-[rgba(224,247,250,0.5)]">{label}</span>
            <span className="font-mono font-semibold" style={{ color }}>{status}</span>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Spinner + time */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-[#00F5FF]/60">{dots} SYSTEMS NOMINAL</span>
        <div className="text-right">
          <div className="text-[#00F5FF] font-semibold text-sm">{format(time, 'HH:mm:ss')}</div>
          <div className="text-[rgba(224,247,250,0.4)] text-[10px]">{format(time, 'yyyy-MM-dd')}</div>
        </div>
      </div>
    </motion.header>
  );
}
