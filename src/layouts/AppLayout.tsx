// layouts/AppLayout.tsx
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationPanel from './NotificationPanel';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function AppLayout() {
  const activeView = useUIStore((state) => state.activeView);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);

  // Initialize auth
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync Router path with activeView state
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    if (path !== activeView) {
      setActiveView(path);
    }
  }, [location, activeView, setActiveView]);

  return (
    <div className="flex h-screen w-screen bg-kovex-bg text-kovex-text font-body overflow-hidden">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* TOPBAR */}
        <Topbar />

        {/* BANDA DE MERCADO ACTIVO (Gradient Line) */}
        <div className="h-[2px] w-full bg-gradient-to-r from-kovex-primary via-[#7B0E55] to-kovex-accent relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-kovex-bg p-6">
          <Outlet />
        </main>
      </div>

      {/* DRAWERS & MODALS */}
      <NotificationPanel />
    </div>
  );
}
