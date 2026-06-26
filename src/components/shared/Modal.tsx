// components/shared/Modal.tsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidthClass?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footerActions,
  maxWidthClass = 'max-w-lg'
}: ModalProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`w-full ${maxWidthClass} bg-kovex-surface border border-kovex-border rounded-2xl flex flex-col pointer-events-auto shadow-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-kovex-border">
                <h3 className="font-display font-extrabold text-white text-base">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-kovex-elevated text-kovex-muted hover:text-white rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[75vh]">
                {children}
              </div>

              {/* Footer */}
              {footerActions && (
                <div className="p-4 border-t border-kovex-border bg-black/10 flex justify-end gap-3">
                  {footerActions}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
