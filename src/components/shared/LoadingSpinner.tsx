// components/shared/LoadingSpinner.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: number;
}

export default function LoadingSpinner({ label = 'Cargando...', size = 28 }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 w-full">
      <Loader2 size={size} className="animate-spin text-kovex-primary mb-3" />
      {label && <span className="text-xs text-kovex-muted font-medium">{label}</span>}
    </div>
  );
}
