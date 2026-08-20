import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setOriginalProfile(null);
        setAccessIssue("profile_load_failed");
        return;
      }

      if (!data) {
        setOriginalProfile(null);
        setAccessIssue("profile_not_found");
        return;
      }

      const nextProfile = data as Profile;
      setOriginalProfile(nextProfile);
      setAccessIssue(nextProfile.active ? null : "inactive");
      if (!nextProfile.active) setImpersonatedProfile(null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setOriginalProfile(null);
      setAccessIssue("profile_load_failed");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setAccessIssue(null);
      }
      setLoading(false);
    }).catch(err => {
      console.error("useAuth: getSession error:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setLoading(true);
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setOriginalProfile(null);
          setImpersonatedProfile(null);
          setAccessIssue(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const impersonate = (profileToImpersonate: Profile | null) => {
    if (profileToImpersonate && (
      originalProfile?.role !== "SUPERADMIN" ||
      !originalProfile.active ||
      !profileToImpersonate.active
    )) {
      return;
    }
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
