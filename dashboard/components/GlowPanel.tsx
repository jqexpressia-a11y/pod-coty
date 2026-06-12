'use client';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlowPanelProps {
  children: React.ReactNode;
  color?: 'cyan' | 'pink' | 'green' | 'amber';
  className?: string;
  delay?: number;
  title?: string;
  icon?: React.ReactNode;
}

const colorMap = {
  cyan:  { border: 'border-cyan-500/20',    glow: 'glow-cyan',  text: 'text-[#00F5FF]', dot: 'bg-[#00F5FF]' },
  pink:  { border: 'border-pink-400/20',    glow: 'glow-pink',  text: 'text-[#FF6B9D]', dot: 'bg-[#FF6B9D]' },
  green: { border: 'border-emerald-400/20', glow: 'glow-green', text: 'text-[#00FF88]', dot: 'bg-[#00FF88]' },
  amber: { border: 'border-amber-400/20',   glow: 'glow-amber', text: 'text-[#FF9F1C]', dot: 'bg-[#FF9F1C]' },
};

export default function GlowPanel({ children, color = 'cyan', className, delay = 0, title, icon }: GlowPanelProps) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'relative rounded-xl border backdrop-blur-xl overflow-hidden',
        'bg-[rgba(6,12,35,0.85)]',
        c.border,
        c.glow,
        className
      )}
    >
      {title && (
        <div className={clsx('flex items-center gap-2 px-4 py-3 border-b', c.border)}>
          {icon && <span className={c.text}>{icon}</span>}
          <span className={clsx('text-xs font-semibold tracking-widest uppercase', c.text)}>{title}</span>
          <span className={clsx('ml-auto w-2 h-2 rounded-full animate-pulse', c.dot)} />
        </div>
      )}
      <div className="relative z-10">{children}</div>
      {/* Subtle inner gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent" />
    </motion.div>
  );
}
