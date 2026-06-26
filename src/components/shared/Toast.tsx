// components/shared/Toast.tsx
import React, { useEffect } from 'react';
import { useNotificationsStore } from '@/store/notificationsStore';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useNotificationsStore((state) => state.toasts);
  const removeToast = useNotificationsStore((state) => state.removeToast);

  const icons = {
    info: <Info size={16} className="text-kovex-accent" />,
    success: <CheckCircle size={16} className="text-kovex-success" />,
    warning: <AlertTriangle size={16} className="text-kovex-warning" />,
    error: <AlertOctagon size={16} className="text-kovex-danger" />,
  };

  const borders = {
    info: 'border-l-kovex-accent',
    success: 'border-l-kovex-success',
    warning: 'border-l-kovex-warning',
    error: 'border-l-kovex-danger',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto bg-kovex-surface border border-kovex-border border-l-4 ${borders[t.type]} rounded-xl p-4 shadow-2xl flex items-start gap-3 relative overflow-hidden transition-all duration-300`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
            {t.description && (
              <p className="text-xs text-kovex-muted mt-1 leading-relaxed">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-kovex-muted hover:text-white p-1 rounded-lg hover:bg-kovex-elevated transition-all flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

