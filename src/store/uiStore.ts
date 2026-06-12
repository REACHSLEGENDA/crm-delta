// store/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  notificationsOpen: boolean;
  globalSearchOpen: boolean;
  activeView: string;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setNotificationsOpen: (open: boolean) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  setActiveView: (view: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationsOpen: false,
  globalSearchOpen: false,
  activeView: 'dashboard',

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
}));
