import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchableDropdown from "./SearchableDropdown";
import { supabase } from "../../supabaseClient";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dob: "",
    gender: "",
    address: "",
    password: "",
    confirmPassword: "",
    departmentName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const { } = useAuth();
  const navigate = useNavigate();

  // Fetch department names for dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("department").select("d_name");
      if (error) {
        console.error("Error loading departments:", error);
        setDepartments([]);
      } else {
        setDepartments((data || []).map((d) => d.d_name));
      }
      setLoadingDepartments(false);
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calcAge = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { email, password, fullName } = formData;

    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: fullName?.trim() || "" } },
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }

    const uid = data?.user?.id;

    // Try to resolve department UUID from the selected department name
    let deptUuid = null;
    if (formData.departmentName) {
      const { data: deptRow } = await supabase
        .from("department")
        .select("d_uuid")
        .eq("d_name", formData.departmentName)
        .maybeSingle();
      deptUuid = deptRow?.d_uuid || null;
    }

    // Only upsert profile when session exists (no session in email-confirm flow)
    if (uid && data?.session) {
      const profile = {
        uuid: uid,
        email,
        name: fullName?.trim() || email,
        phone_number: formData.phoneNumber || null,
        address: formData.address || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        age: calcAge(formData.dob),
        ...(deptUuid ? { d_uuid: deptUuid } : {}),
      };

      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(profile, { onConflict: "uuid" });
      if (upsertErr) {
        console.warn("Profile upsert failed (will retry on first login):", upsertErr.message);
      }
    }

    setLoading(false);

    if (data.session) {
      navigate("/profile");
    } else {
      // Email confirmation flow — user will create profile on first login via AuthContext fallback
      navigate("/login");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-white border border-gray-200 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Create an Account</h1>
          <p className="mt-2 text-gray-500">
            Join us by filling out the information below
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                required
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Department Searchable Dropdown */}
            <SearchableDropdown
              value={formData.departmentName}
              onChange={handleChange}
              options={departments}
              loading={loadingDepartments}
            />

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>

            {/* Gender */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <div className="flex gap-4 mt-2">
                {["male", "female", "other"].map((g) => (
                  <label key={g} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={formData.gender === g}
                      onChange={handleChange}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                name="address"
                rows="3"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 mt-1 border rounded-md"
              />
            </div>
          </div>

          {error && (
            <div className="p-2 mt-4 text-sm text-red-600 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 mt-6 font-semibold text-white bg-indigo-600 rounded-md disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
