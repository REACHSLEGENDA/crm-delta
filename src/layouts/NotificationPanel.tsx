// layouts/NotificationPanel.tsx
import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell, UserPlus, GitBranch, MessageSquare, AlertCircle, Check } from 'lucide-react';

export default function NotificationPanel() {
  const isOpen = useUIStore((state) => state.notificationsOpen);
  const setOpen = useUIStore((state) => state.setNotificationsOpen);
  
  const notifications = useNotificationsStore((state) => state.notifications);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <UserPlus size={16} className="text-kovex-accent" />;
      case 'deal':
        return <GitBranch size={16} className="text-kovex-primary" />;
      case 'chat':
        return <MessageSquare size={16} className="text-[#A78BFA]" />;
      default:
        return <AlertCircle size={16} className="text-kovex-warning" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black z-50 pointer-events-auto"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-kovex-surface border-l border-kovex-border z-50 flex flex-col pointer-events-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-kovex-border">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-kovex-primary" />
                <h3 className="font-display font-bold text-white text-base">Notificaciones</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="bg-kovex-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllAsRead}
                  title="Marcar todo como leído"
                  className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-kovex-muted">
                  <Bell size={24} className="opacity-20 mb-2" />
                  <span className="text-xs">Sin notificaciones nuevas</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      n.read
                        ? 'bg-transparent border-transparent hover:border-kovex-border'
                        : 'bg-kovex-elevated/40 border-kovex-primary/20 hover:border-kovex-primary/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-kovex-elevated flex items-center justify-center flex-shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-xs font-bold truncate ${n.read ? 'text-kovex-text' : 'text-white'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-kovex-muted flex-shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-kovex-muted mt-1 leading-relaxed break-words">{n.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
