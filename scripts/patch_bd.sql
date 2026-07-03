-- =============================================================
-- DELTA CAPITAL CRM — PARCHE DE COLUMNAS FALTANTES
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. Columnas adicionales en leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS country       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS investment_capacity VARCHAR(100),
  ADD COLUMN IF NOT EXISTS comments      TEXT;

-- 2. Insertar canales por defecto si no existen
INSERT INTO channels (name, type)
SELECT 'Ventas', 'ventas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Ventas');

INSERT INTO channels (name, type)
SELECT 'Compliance', 'alertas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Compliance');

INSERT INTO channels (name, type)
SELECT 'Retention', 'general'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Retention');

INSERT INTO channels (name, type)
SELECT 'Líderes', 'alertas'
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'Líderes');

-- 3. Política para que SUPERADMIN pueda leer todos los profiles (necesario para el chat)
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON profiles;
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Política para que cualquier usuario autenticado pueda leer y escribir canales y mensajes
DROP POLICY IF EXISTS "All authenticated can read channels" ON channels;
CREATE POLICY "All authenticated can read channels"
  ON channels FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Superadmins can manage channels" ON channels;
CREATE POLICY "Superadmins can manage channels"
  ON channels FOR ALL
  USING (get_user_role(auth.uid()) IN ('SUPERADMIN', 'MANAGER'));

DROP POLICY IF EXISTS "Authenticated can read messages" ON messages;
CREATE POLICY "Authenticated can read messages"
  ON messages FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert messages" ON messages;
CREATE POLICY "Authenticated can insert messages"
  ON messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id OR get_user_role(auth.uid()) IN ('SUPERADMIN', 'MANAGER'));

-- 5. Política para eliminar deals (SUPERADMIN y MANAGER)
DROP POLICY IF EXISTS "Superadmins can delete deals" ON deals;
CREATE POLICY "Superadmins can delete deals"
  ON deals FOR DELETE
  USING (get_user_role(auth.uid()) IN ('SUPERADMIN', 'MANAGER'));

-- 6. Actividades: todos pueden leer y escribir (necesario para bitácora)
DROP POLICY IF EXISTS "Authenticated can read activities" ON activities;
CREATE POLICY "Authenticated can read activities"
  ON activities FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert activities" ON activities;
CREATE POLICY "Authenticated can insert activities"
  ON activities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Calls: agentes solo ven las suyas, managers/superadmins ven todas
DROP POLICY IF EXISTS "Agents can read own calls" ON calls;
CREATE POLICY "Agents can read own calls"
  ON calls FOR SELECT
  USING (
    agent_id = auth.uid()
    OR get_user_role(auth.uid()) IN ('SUPERADMIN', 'MANAGER')
  );

DROP POLICY IF EXISTS "Authenticated can insert calls" ON calls;
CREATE POLICY "Authenticated can insert calls"
  ON calls FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
