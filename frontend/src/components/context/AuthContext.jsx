import { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [dUuid, setDUuid] = useState(null);
  const [departmentName, setDepartmentName] = useState(null);
  const [rUuid, setRUuid] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
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
        emailRedirectTo: "http://localhost:3000/login", // change for production
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
    const { data, error } = await supabase
      .from("users")
      .select("*, department(d_name)")
      .eq("uuid", uuid)   // <-- use "uuid" instead of "u_id"
      .maybeSingle();

    console.log("Fetching profile for:", uuid, "result:", data, "error:", error);

    if (error) {
      console.error("Error fetching user profile:", error.message);
      return null;
    }
    return data;
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
    let logoutTimeout = null;

    const fetchUserDetails = async (uuid) => {
      if (!uuid) {
        setDUuid(null);
        setDepartmentName(null);
        setRUuid(null);
        setPhoneNumber(null);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("d_uuid, r_uuid, phone_number")
        .eq("uuid", uuid)
        .maybeSingle();
      if (error || !data) {
        setDUuid(null);
        setDepartmentName(null);
        setRUuid(null);
        setPhoneNumber(null);
      } else {
        setDUuid(data.d_uuid || null);
        setRUuid(data.r_uuid || null);
        setPhoneNumber(data.phone_number || null);
        // Fetch department name from department table
        if (data.d_uuid) {
          const { data: dept, error: deptError } = await supabase
            .from("department")
            .select("d_name")
            .eq("d_uuid", data.d_uuid)
            .maybeSingle();
          setDepartmentName(dept?.d_name || null);
        } else {
          setDepartmentName(null);
        }
      }
    };

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      await fetchUserDetails(session?.user?.id);
      // Set logout timer if session exists
      if (session && session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = session.expires_at - now;
        if (expiresIn > 0) {
          logoutTimeout = setTimeout(() => {
            setSession(null);
            setUser(null);
            setDUuid(null);
            setDepartmentName(null);
            setRUuid(null);
            setPhoneNumber(null);
          }, expiresIn * 1000);
        }
      }
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      await fetchUserDetails(session?.user?.id);
      // Reset logout timer
      if (logoutTimeout) clearTimeout(logoutTimeout);
      if (session && session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = session.expires_at - now;
        if (expiresIn > 0) {
          logoutTimeout = setTimeout(() => {
            setSession(null);
            setUser(null);
            setDUuid(null);
            setDepartmentName(null);
            setRUuid(null);
            setPhoneNumber(null);
          }, expiresIn * 1000);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
      if (logoutTimeout) clearTimeout(logoutTimeout);
    };
  }, []);


  // Helper to get the current session's access token (JWT)
  const getAccessToken = () => session?.access_token || null;

  const value = {
    session,
    user,
    dUuid,
    departmentName,
    rUuid,
    phoneNumber,
    loading,
    signUpNewUser,
    signInUser,
    signOutUser,
    getUserProfile,
    updateUserRole,
    getRoles,
    getAccessToken,
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
