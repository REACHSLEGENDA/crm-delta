// components/shared/Toast.tsx
import React from 'react';
import { useNotificationsStore } from '@/store/notificationsStore';
import { motion, AnimatePresence } from 'framer-motion';
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
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className={`pointer-events-auto bg-kovex-surface border border-kovex-border border-l-4 ${borders[t.type]} rounded-xl p-4 shadow-2xl flex items-start gap-3 relative overflow-hidden`}
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

            {/* Progress Bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
              className={`absolute bottom-0 left-0 h-0.5 ${
                t.type === 'info'
                  ? 'bg-kovex-accent'
                  : t.type === 'success'
                  ? 'bg-kovex-success'
                  : t.type === 'warning'
                  ? 'bg-kovex-warning'
                  : 'bg-kovex-danger'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
