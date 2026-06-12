// components/shared/Badge.tsx
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'gray';
  showDot?: boolean;
}

export default function Badge({
  children,
  variant = 'gray',
  showDot = false
}: BadgeProps) {
  const styles = {
    primary: 'bg-kovex-primary/10 border-kovex-primary/20 text-[#FFC1E1]',
    accent: 'bg-kovex-accent/10 border-kovex-accent/20 text-[#7DF3E2]',
    success: 'bg-kovex-success/10 border-kovex-success/20 text-[#7BE5A0]',
    warning: 'bg-kovex-warning/10 border-kovex-warning/20 text-[#FCC97B]',
    danger: 'bg-kovex-danger/10 border-kovex-danger/20 text-[#FB9091]',
    gray: 'bg-white/[0.04] border-kovex-border text-kovex-muted',
  };

  const dotColors = {
    primary: 'bg-kovex-primary',
    accent: 'bg-kovex-accent',
    success: 'bg-kovex-success',
    warning: 'bg-kovex-warning',
    danger: 'bg-kovex-danger',
    gray: 'bg-kovex-muted',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[variant]}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
