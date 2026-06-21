// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/auth/LoginPage';
import RegisterPage from '@/auth/RegisterPage';
import ProtectedRoute from '@/auth/ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import ProspectosPage from '@/modules/prospectos/ProspectosPage';
import NegociacionesPage from '@/modules/negociaciones/NegociacionesPage';
import ContactosPage from '@/modules/contactos/ContactosPage';
import AutomatizacionPage from '@/modules/automatizacion/AutomatizacionPage';
import ReglasPage from '@/modules/reglas/ReglasPage';
import ContactCenterPage from '@/modules/contact-center/ContactCenterPage';
import ChatPage from '@/modules/chat/ChatPage';
import UsersPage from '@/modules/admin/UsersPage';
import CumplimientoPage from '@/modules/cumplimiento/CumplimientoPage';
import ToastContainer from '@/components/shared/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-kovex-internal" element={<RegisterPage />} />

        {/* PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/prospectos" element={<ProspectosPage />} />
            <Route path="/negociaciones" element={<NegociacionesPage />} />
            <Route path="/contactos" element={<ContactosPage />} />
            <Route path="/cumplimiento" element={<CumplimientoPage />} />
            <Route path="/automatizacion" element={<AutomatizacionPage />} />
            <Route path="/reglas" element={<ReglasPage />} />
            <Route path="/contactcenter" element={<ContactCenterPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/admin" element={<UsersPage />} />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating Notifications Toasts */}
      <ToastContainer />
    </BrowserRouter>
  );
}
