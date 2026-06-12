// components/shared/StatCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
  };
  variant?: 'primary' | 'accent' | 'success' | 'warning';
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  variant = 'primary'
}: StatCardProps) {
  const colors = {
    primary: 'text-kovex-primary bg-kovex-primary/10 border-kovex-primary/20',
    accent: 'text-kovex-accent bg-kovex-accent/10 border-kovex-accent/20',
    success: 'text-kovex-success bg-kovex-success/10 border-kovex-success/20',
    warning: 'text-kovex-warning bg-kovex-warning/10 border-kovex-warning/20',
  };

  return (
    <div className="bg-[#0F1525]/40 border border-kovex-border p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between h-32 hover:border-white/10 transition-all">
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-kovex-muted uppercase font-bold tracking-widest">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors[variant]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-3">
        <span className="font-mono font-extrabold text-2xl lg:text-3xl text-white tracking-tight">{value}</span>
        {trend && (
          <span className={`text-[10px] font-bold flex items-center gap-1 leading-none ${trend.isUp ? 'text-kovex-success' : 'text-kovex-danger'}`}>
            {trend.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
