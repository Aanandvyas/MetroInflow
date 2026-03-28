import { createContext, useEffect, useState, useContext, useCallback } from "react";
import { supabase } from "../../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);    // cached DB profile (with department/role joins)
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const PROFILE_TIMEOUT_MS = 15000;

  const withTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      ),
    ]);

  // ── helpers ──────────────────────────────────────────────

  /** Whether the current user's email is verified */
  const isEmailVerified = !!user?.email_confirmed_at;

  // ── Sign up (used by admin registration form) ──────────
  // Profile fields are passed via options.data → stored in auth.users.raw_user_meta_data
  // The Postgres trigger `handle_new_user` auto-creates the public.users row
  const signUpNewUser = async (formData) => {
    const {
      email,
      password,
      fullName,
      phoneNumber,
      dob,
      gender,
      address,
      departmentUuid,  // d_uuid resolved by caller
      roleUuid,        // r_uuid resolved by caller
      position,        // 'regular' | 'head'
    } = formData;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000/login",
        data: {
          name: fullName,
          phone_number: phoneNumber,
          dob: dob || null,
          gender: gender || null,
          address: address || null,
          d_uuid: departmentUuid || null,
          r_uuid: roleUuid || null,
          position: position || "regular",
        },
      },
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  };

  // ── Sign in ────────────────────────────────────────────
  const signInUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error };
    }

    // Update state immediately to avoid route-guard redirect races right after sign-in.
    const currentSession = data?.session ?? null;
    const currentUser = data?.user ?? null;
    setSession(currentSession);
    setUser(currentUser);

    if (currentUser?.id) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfileWithRetry(currentUser.id);
        setUserProfile(profile);
      } catch (profileErr) {
        console.error("signIn profile fetch failed:", profileErr);
        setUserProfile(null);
      } finally {
        setProfileLoading(false);
      }
    } else {
      setUserProfile(null);
    }

    return { success: true, data };
  };

  // ── Sign out ───────────────────────────────────────────
  const signOutUser = async () => {
    // Clear local auth state first so UI responds immediately.
    setSession(null);
    setUser(null);
    setUserProfile(null);

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("signOutUser error:", error);
      return { success: false, error };
    }

    return { success: true };
  };

  // ── Profile fetching (DB: users + department + role joins) ──
  const getUserProfile = useCallback(async (uuid) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *, 
          department(d_name, d_uuid),
          role(r_name, r_uuid)
        `)
        .eq("uuid", uuid)
        .maybeSingle();

      if (error) {
        console.error("getUserProfile error:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("getUserProfile exception:", err);
      return null;
    }
  }, []);

  const getUserProfileWithRetry = useCallback(async (uuid) => {
    try {
      const first = await withTimeout(
        getUserProfile(uuid),
        PROFILE_TIMEOUT_MS,
        "getUserProfile (attempt 1)"
      );
      if (first) return first;
    } catch (err) {
      console.error("getUserProfile attempt 1 failed:", err);
    }

    try {
      return await withTimeout(
        getUserProfile(uuid),
        PROFILE_TIMEOUT_MS,
        "getUserProfile (attempt 2)"
      );
    } catch (err) {
      console.error("getUserProfile attempt 2 failed:", err);
      return null;
    }
  }, [getUserProfile]);

  /** Force-refresh the cached userProfile from the DB */
  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) return null;
    setProfileLoading(true);
    try {
      const profile = await getUserProfileWithRetry(user.id);
      setUserProfile(profile);
      return profile;
    } catch (err) {
      console.error("refreshUserProfile failed:", err);
      setUserProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, getUserProfileWithRetry]);

  // ── Update user role ───────────────────────────────────
  const updateUserRole = async (uuid, r_uuid) => {
    const { error } = await supabase
      .from("users")
      .update({ r_uuid })
      .eq("uuid", uuid);

    if (error) {
      return { success: false, error };
    }
    return { success: true };
  };

  // ── Fetch available roles ──────────────────────────────
  const getRoles = async () => {
    const { data, error } = await supabase
      .from("role")
      .select("r_uuid, r_name");

    if (error) {
      return [];
    }
    return data;
  };

  // ── Session management ─────────────────────────────────
  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    const applySession = async (nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      const currentUser = nextSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        setProfileLoading(true);
        try {
          const profile = await getUserProfileWithRetry(currentUser.id);
          if (isMounted) {
            setUserProfile(profile);
          }
        } catch (err) {
          console.error("applySession profile fetch failed:", err);
        } finally {
          if (isMounted) {
            setProfileLoading(false);
          }
        }
      } else {
        setUserProfile(null);
      }
    };

    const getSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        await applySession(currentSession ?? null);
      } catch (err) {
        console.error("Auth bootstrap failed:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await applySession(session ?? null);
      } catch (err) {
        console.error("Auth state change handling failed:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [getUserProfileWithRetry]);

  const value = {
    session,
    user,
    userProfile,       // cached profile with department/role
    profileLoading,
    isEmailVerified,
    loading,
    signUpNewUser,
    signInUser,
    signOutUser,
    getUserProfile,    // still available for one-off lookups of other users
    refreshUserProfile,
    updateUserRole,
    getRoles,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div className="p-6 text-center text-gray-600">Loading...</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};