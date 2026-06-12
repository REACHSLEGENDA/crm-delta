// store/notificationsStore.ts
import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface KovexNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'lead' | 'deal' | 'chat' | 'system';
}

interface NotificationsState {
  toasts: ToastMessage[];
  notifications: KovexNotification[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addNotification: (notification: Omit<KovexNotification, 'id' | 'read' | 'time'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  toasts: [],
  notifications: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
    
    // Auto-dismiss
    const duration = toast.duration || 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, duration);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  addNotification: (notif) => {
    const newNotif: KovexNotification = {
      ...notif,
      id: crypto.randomUUID(),
      read: false,
      time: 'Ahora'
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications]
    }));
  },

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true }))
  }))
}));
