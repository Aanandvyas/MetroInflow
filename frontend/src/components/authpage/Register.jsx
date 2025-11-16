import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SearchableDropdown from "./SearchableDropdown";
import { getSupabase } from "../../supabaseClient";
const supabase = getSupabase();

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
    roleUuid: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const { signUpNewUser } = useAuth();
  const navigate = useNavigate();

  // Fetch department names for dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase.from("department").select("d_name, d_uuid");
      if (error) {
        console.error("Error loading departments:", error);
        setDepartments([]);
      } else {
        setDepartments(data.map((d) => ({ name: d.d_name, uuid: d.d_uuid })));
      }
      setLoadingDepartments(false);
    };
    fetchDepartments();
  }, []);

  // Fetch roles for a given department
  const fetchRolesForDepartment = async (departmentUuid) => {
    if (!departmentUuid) {
      setRoles([]);
      return;
    }
    
    setLoadingRoles(true);
    const { data, error } = await supabase
      .from("role")
      .select("r_uuid, r_name")
      .eq("d_uuid", departmentUuid)
      .order("r_name", { ascending: true });
    
    if (error) {
      console.error("Error loading roles:", error);
      setRoles([]);
    } else {
      setRoles(data || []);
    }
    setLoadingRoles(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If department changed, fetch roles for that department and reset the current role
    if (name === "departmentName" && value) {
      const selectedDept = departments.find(dept => dept.name === value);
      if (selectedDept) {
        fetchRolesForDepartment(selectedDept.uuid);
        // Reset selected role when department changes
        setFormData(prev => ({ ...prev, roleUuid: "" }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.departmentName && !formData.roleUuid) {
      setError("Please select a role for your department.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { success, error } = await signUpNewUser(formData);

      if (!success) {
        setError(error.message);
      } else {
        alert("Registration successful! Please check your email.");
        navigate("/login");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="mt-8">
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
              options={departments.map(dept => dept.name)}
              loading={loadingDepartments}
            />

            {/* Role Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                name="roleUuid"
                value={formData.roleUuid}
                onChange={handleChange}
                disabled={!formData.departmentName || loadingRoles || roles.length === 0}
                className={`w-full px-3 py-2 mt-1 border rounded-md ${
                  !formData.departmentName || loadingRoles || roles.length === 0
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                }`}
              >
                <option value="">
                  {!formData.departmentName
                    ? "Select a department first"
                    : loadingRoles
                    ? "Loading roles..."
                    : roles.length === 0
                    ? "No roles found for this department"
                    : "Select a role"}
                </option>
                {roles.map((role) => (
                  <option key={role.r_uuid} value={role.r_uuid}>
                    {role.r_name}
                  </option>
                ))}
              </select>
            </div>

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
              ></textarea>
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