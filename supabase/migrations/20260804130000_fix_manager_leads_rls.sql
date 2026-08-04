-- Fix Manager RLS Policy on Leads to align with Frontend permissions (canViewAll, canEditAll)
DROP POLICY IF EXISTS "Managers can read and edit leads of their team" ON leads;

CREATE POLICY "Managers can read and edit all leads" ON leads FOR ALL USING (
    get_user_role(auth.uid()) = 'MANAGER'
);

-- Also fix for contacts and deals just in case they are used
DROP POLICY IF EXISTS "Managers can read and edit contacts of their team" ON contacts;
CREATE POLICY "Managers can read and edit all contacts" ON contacts FOR ALL USING (
    get_user_role(auth.uid()) = 'MANAGER'
);

DROP POLICY IF EXISTS "Managers can read and edit deals of their team" ON deals;
CREATE POLICY "Managers can read and edit all deals" ON deals FOR ALL USING (
    get_user_role(auth.uid()) = 'MANAGER'
);
