import { useEffect, useRef, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  originalProfile: Profile | null;
  accessIssue: "profile_not_found" | "profile_load_failed" | "inactive" | null;
  loading: boolean;
  logout: () => Promise<void>;
  impersonate: (profileToImpersonate: Profile | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  originalProfile: null,
  accessIssue: null,
  loading: true,
  logout: async () => {},
  impersonate: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [accessIssue, setAccessIssue] = useState<AuthContextType["accessIssue"]>(null);
  const [loading, setLoading] = useState(true);
  // Which user the profile in state belongs to. Supabase re-emits auth events
  // on tab focus and on every token refresh; without this guard each one would
  // flip `loading` back on, unmount the whole app and wipe the screen the user
  // was working on (search, filters, the open record).
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let authRequestId = 0;

    const clearAuthState = () => {
      setUser(null);
      setOriginalProfile(null);
      setImpersonatedProfile(null);
      setAccessIssue(null);
    };

    const loadProfile = async (userId: string, requestId: number): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (!active || requestId !== authRequestId) return false;

        if (error) {
          console.error("Error fetching profile:", error);
          setOriginalProfile(null);
          setAccessIssue("profile_load_failed");
          return false;
        }

        if (!data) {
          setOriginalProfile(null);
          setAccessIssue("profile_not_found");
          return false;
        }

        const nextProfile = data as Profile;
        setOriginalProfile(nextProfile);
        setAccessIssue(nextProfile.active ? null : "inactive");
        if (!nextProfile.active) setImpersonatedProfile(null);
        return true;
      } catch (err) {
        if (!active || requestId !== authRequestId) return false;
        console.error("Error fetching profile:", err);
        setOriginalProfile(null);
        setAccessIssue("profile_load_failed");
        return false;
      }
    };

    const applySession = async (session: Session | null) => {
      const requestId = ++authRequestId;

      if (!session?.user) {
        if (!active) return;
        loadedUserIdRef.current = null;
        clearAuthState();
        setLoading(false);
        return;
      }

      if (!active) return;

      // Token refresh or tab focus for the session already loaded: the client
      // has the new token internally and nothing on screen needs to change.
      if (loadedUserIdRef.current === session.user.id) return;

      setLoading(true);
      setUser(session.user);
      loadedUserIdRef.current = session.user.id;
      const loaded = await loadProfile(session.user.id, requestId);
      if (!loaded) loadedUserIdRef.current = null;

      if (active && requestId === authRequestId) {
        setLoading(false);
      }
    };

    void supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(err => {
        if (!active) return;
        console.error("useAuth: getSession error:", err);
        clearAuthState();
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        // Supabase holds an internal auth lock while this callback runs.
        // Defer profile queries until the callback has returned to avoid a deadlock.
        setTimeout(() => {
          if (active) void applySession(session);
        }, 0);
      }
    );

    return () => {
      active = false;
      authRequestId += 1;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const impersonate = (profileToImpersonate: Profile | null) => {
    if (!profileToImpersonate) { setImpersonatedProfile(null); return; }
    if (!originalProfile?.active || !profileToImpersonate.active) return;

    const allowed =
      originalProfile.role === "SUPERADMIN" ||
      (originalProfile.role === "MANAGER" &&
        originalProfile.department === profileToImpersonate.department &&
        (profileToImpersonate.role === "SUPERVISOR" || profileToImpersonate.role === "AGENT")) ||
      (originalProfile.role === "SUPERVISOR" &&
        Boolean(originalProfile.team_id) &&
        originalProfile.team_id === profileToImpersonate.team_id &&
        profileToImpersonate.role === "AGENT");

    if (!allowed) return;
    setImpersonatedProfile(profileToImpersonate);
  };

  // Resolve active profile (use impersonated one if set, otherwise original)
  const activeProfile = impersonatedProfile || originalProfile;

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile: activeProfile, 
        originalProfile, 
        accessIssue,
        loading, 
        logout, 
        impersonate 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
