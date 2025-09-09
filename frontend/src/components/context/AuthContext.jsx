import { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../../supabaseClient.";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Sign up and insert user details
  const signUpNewUser = async (formData) => {
    const { email, password, fullName, phoneNumber, dob, gender, address } =
      formData;

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

    // 2. Insert into your "user" table
    if (data.user) {
      const { error: userError } = await supabase.from("user").insert([
        {
          u_id: data.user.id, // uuid from auth.users
          email,
          name: fullName,
          phone_number: phoneNumber,
          dob,
          gender,
          address,
          age: dob
            ? new Date().getFullYear() - new Date(dob).getFullYear()
            : null,
        },
      ]);

      if (userError) {
        console.error("Error inserting user details:", userError.message);
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
  const getUserProfile = async (u_id) => {
    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("u_id", u_id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error.message);
      return null;
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
