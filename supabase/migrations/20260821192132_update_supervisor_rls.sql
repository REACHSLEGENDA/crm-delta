-- Update Supervisor RLS Policy on Leads/Contacts to align with Frontend permissions (canViewAll, canEditAll)
-- Supervisors gain UPDATE access, but stay scoped to their own team, matching the
-- team-scoped SELECT policy from the access-hardening migration.

DROP POLICY IF EXISTS "Supervisors can read leads of their team" ON leads;
DROP POLICY IF EXISTS "Supervisors can read leads of their team" ON public.leads;
DROP POLICY IF EXISTS "Supervisors can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Supervisors can update all leads" ON public.leads;

CREATE POLICY "Supervisors can read team leads" ON public.leads FOR SELECT TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
);

CREATE POLICY "Supervisors can update team leads" ON public.leads FOR UPDATE TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
) WITH CHECK (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
);

-- Do the same for contacts just in case
DROP POLICY IF EXISTS "Supervisors can read contacts of their team" ON contacts;
DROP POLICY IF EXISTS "Supervisors can read contacts of their team" ON public.contacts;
DROP POLICY IF EXISTS "Supervisors can read all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Supervisors can update all contacts" ON public.contacts;

CREATE POLICY "Supervisors can read team contacts" ON public.contacts FOR SELECT TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
);

CREATE POLICY "Supervisors can update team contacts" ON public.contacts FOR UPDATE TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
) WITH CHECK (
    public.get_user_role(auth.uid()) = 'SUPERVISOR'
    AND team_id = public.get_user_team(auth.uid())
);
