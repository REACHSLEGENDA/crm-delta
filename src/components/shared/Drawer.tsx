// components/shared/Drawer.tsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MoreVertical } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | React.ReactNode;
  headerIcon?: React.ReactNode;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  headerIcon,
  footerActions,
  children
}: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[60] pointer-events-auto"
          />

          {/* Drawer Body */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-kovex-surface border-l border-kovex-border z-[70] flex flex-col pointer-events-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-kovex-border">
              {headerIcon && (
                <div className="w-10 h-10 rounded-xl bg-kovex-elevated flex items-center justify-center flex-shrink-0">
                  {headerIcon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-white text-base truncate">{title}</h3>
                {subtitle && (
                  <div className="text-xs text-kovex-muted mt-0.5 flex items-center gap-1">{subtitle}</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {children}
            </div>

            {/* Footer */}
            {footerActions && (
              <div className="p-4 border-t border-kovex-border bg-black/10 flex justify-end gap-3 flex-shrink-0">
                {footerActions}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
