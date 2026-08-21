-- Give supervisors UPDATE on deals/calls, scoped to their own team like the
-- existing SELECT policies from the access-hardening migration.

DROP POLICY IF EXISTS "Supervisors can read deals of their team" ON public.deals;
DROP POLICY IF EXISTS "Supervisors can read all deals" ON public.deals;
DROP POLICY IF EXISTS "Supervisors can update all deals" ON public.deals;

CREATE POLICY "Supervisors can read team deals" ON public.deals FOR SELECT TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND team_id = public.get_user_team(auth.uid())
);
CREATE POLICY "Supervisors can update team deals" ON public.deals FOR UPDATE TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND team_id = public.get_user_team(auth.uid())
) WITH CHECK (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND team_id = public.get_user_team(auth.uid())
);

DROP POLICY IF EXISTS "Supervisors can read calls of their team" ON public.calls;
DROP POLICY IF EXISTS "Supervisors can read all calls" ON public.calls;
DROP POLICY IF EXISTS "Supervisors can update all calls" ON public.calls;

CREATE POLICY "Supervisors can read team calls" ON public.calls FOR SELECT TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND public.get_profile_team(agent_id) = public.get_user_team(auth.uid())
);
CREATE POLICY "Supervisors can update team calls" ON public.calls FOR UPDATE TO authenticated USING (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND public.get_profile_team(agent_id) = public.get_user_team(auth.uid())
) WITH CHECK (
    public.get_user_role(auth.uid()) = 'SUPERVISOR' AND public.get_profile_team(agent_id) = public.get_user_team(auth.uid())
);
