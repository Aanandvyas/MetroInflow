import { createContext, useEffect, useState, useContext, useCallback } from "react";
import { supabase } from "../../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Sign up a new user
  const signUpNewUser = async (formData) => {
    const {
      email,
      password,
      fullName,
      phoneNumber,
      dob,
      gender,
      address,
      departmentName,
    } = formData;

    // 1. Create account in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000/login",
      },
    });

    if (error) {
      return { success: false, error };
    }

    let d_uuid = null;

    // 2. Get department uuid from department table
    if (departmentName) {
      const { data: deptData, error: deptError } = await supabase
        .from("department")
        .select("d_uuid")
        .ilike("d_name", departmentName)
        .single();

      if (deptError) {
        return { success: false, error: deptError };
      }

      d_uuid = deptData?.d_uuid || null;
    }

    // 3. Insert into your "user" table
    if (data.user) {
      const { error: userError } = await supabase.from("users").insert([
        {
          uuid: data.user.id,   // <-- FIXED
          email,
          name: fullName,
          phone_number: phoneNumber,
          dob,
          gender,
          address,
          d_uuid,
          age: dob
            ? (() => {
              const today = new Date();
              const birth = new Date(dob);
              let age = today.getFullYear() - birth.getFullYear();
              const monthDiff = today.getMonth() - birth.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
              }
              return age;
            })()
            : null,
        },
      ]);


      if (userError) {
        return { success: false, error: userError };
      }
    }

    return { success: true, data };
  };

  // ✅ Sign in
  const signInUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error };
    }
    return { success: true, data };
  };

  // ✅ Sign out
  const signOutUser = async () => {
    await supabase.auth.signOut();
  };

  // ✅ Get profile from user table (memoized to avoid re-render loops)
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
        console.error('getUserProfile error:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('getUserProfile exception:', err);
      return null;
    }
  }, []);

  // ✅ Update user role
  const updateUserRole = async (uuid, r_uuid) => {
    const { error } = await supabase
      .from("users")
      .update({ r_uuid })
      .eq("uuid", uuid);   // <-- also here

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  };


  // ✅ Fetch available roles
  const getRoles = async () => {
    const { data, error } = await supabase
      .from("role")
      .select("r_uuid, r_name");

    if (error) {
      return [];
    }
    return data;
  };

  // ✅ Session management
  useEffect(() => {
    setLoading(true);

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profile = await getUserProfile(currentUser.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const profile = await getUserProfile(currentUser.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    userProfile,
    loading,
    signUpNewUser,
    signInUser,
    signOutUser,
    getUserProfile,
    updateUserRole,
    getRoles,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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