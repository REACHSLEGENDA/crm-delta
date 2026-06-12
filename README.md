# KOVEX CRM — Suite de Trading Financiero

KOVEX CRM es un sistema completo de gestión de ventas optimizado para mesas de trading y brókers financieros. Cuenta con un diseño oscuro premium, tablero Kanban, colas de contact center y herramientas de automatización.

---

## 🚀 Inicio Rápido (Desarrollo Local)

El proyecto cuenta con un **sistema de fallback automático**. Si no configuras las credenciales de Supabase en tu archivo `.env`, la aplicación se iniciará en modo **LOCAL MOCK**, permitiendo interactuar con el CRM usando una base de datos local simulada en `localStorage` (puedes crear, editar y mover prospectos sin depender de un servidor externo).

### 1. Instalar dependencias e iniciar servidor de desarrollo:
```bash
# Instalar paquetes
npm install

# Levantar dev server
npm run dev
```

### 2. Cuentas de Acceso para Pruebas (Seed):
* **Superadmin:** `superadmin@kovex.net`
* **Manager:** `manager@kovex.net`
* **Agente 1:** `agente1@kovex.net`
* **Agente 2:** `agente2@kovex.net`
* **Contraseña Común:** `Kovex2025!`

---

## 🗄️ Conectar con Supabase (Producción)

Para conectar tu proyecto a una base de datos Supabase en producción:

1. Duplica el archivo `.env.example` como `.env`:
   ```bash
   cp .env.example .env
   ```
2. Llena las variables con tus credenciales obtenidas de tu panel de Supabase:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. Ejecuta la migración inicial ubicada en `supabase/migrations/001_initial.sql` dentro del editor SQL de Supabase para generar las tablas y políticas de RLS.
4. Carga los datos de semilla ejecutando `supabase/seed.sql` para tener los usuarios iniciales y datos reales en tu base de datos.
