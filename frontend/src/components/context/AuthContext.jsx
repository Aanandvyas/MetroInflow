import { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
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
        emailRedirectTo: process.env.REACT_APP_REDIRECT_URL || 'http://localhost:3000/login',
      },
    });

    if (error) {
      console.error("Error signing up:", error.message);
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
        console.error("Department not found:", deptError.message);
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
            ? new Date().getFullYear() - new Date(dob).getFullYear()
            : null,
        },
      ]);


      if (userError) {
        console.error("❌ Error inserting user details:", userError);
        return { success: false, error: userError };
      } else {
        console.log("✅ User profile inserted into DB!");
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
      console.error("Error signing in:", error.message);
      return { success: false, error };
    }
    return { success: true, data };
  };

  // ✅ Sign out
  const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    }
  };

  // ✅ Get profile from user table
  const getUserProfile = async (uuid) => {
    // Try to load enriched profile (department, role) if you already join them
    const { data, error } = await supabase
      .from("users")
      .select(`
        uuid, email, name, phone_number, address, dob, age, r_uuid, d_uuid,
        department:d_uuid ( d_uuid, d_name ),
        role:r_uuid ( r_uuid, r_name )
      `)
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) {
      console.error("getUserProfile error:", error);
      return null;
    }

    if (data) return data;

    // If not found, create a minimal profile
    const { data: authUser } = await supabase.auth.getUser();
    const fallback = {
      uuid,
      email: authUser?.user?.email || "",
      name:
        authUser?.user?.user_metadata?.name ||
        (authUser?.user?.email ? authUser.user.email.split("@")[0] : "User"),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("users")
      .insert(fallback)
      .select(
        `uuid, email, name, phone_number, address, dob, age, r_uuid, d_uuid,
         department:d_uuid ( d_uuid, d_name ),
         role:r_uuid ( r_uuid, r_name )`
      )
      .single();

    if (insertErr) {
      console.error("create missing profile failed:", insertErr);
      return null;
    }
    return inserted;
  };

  // ✅ Update user role
  const updateUserRole = async (uuid, r_uuid) => {
    const { error } = await supabase
      .from("users")
      .update({ r_uuid })
      .eq("uuid", uuid);   // <-- also here

    if (error) {
      console.error("Error updating role:", error.message);
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
      console.error("Error fetching roles:", error.message);
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
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
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
