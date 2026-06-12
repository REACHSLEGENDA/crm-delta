// components/shared/EmptyState.tsx
import React from 'react';
import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export default function EmptyState({
  icon = <HelpCircle size={28} className="opacity-30" />,
  title,
  description,
  actionButton
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.01] border border-dashed border-kovex-border rounded-2xl">
      <div className="w-12 h-12 rounded-xl bg-kovex-surface flex items-center justify-center text-kovex-muted mb-4">
        {icon}
      </div>
      <h3 className="font-display font-bold text-white text-sm mb-1">{title}</h3>
      <p className="text-xs text-kovex-muted max-w-xs leading-relaxed mb-6">{description}</p>
      {actionButton && <div className="flex justify-center">{actionButton}</div>}
    </div>
  );
}
