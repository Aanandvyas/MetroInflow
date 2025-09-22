import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const UserRegistrationForm = ({ onUserAdded }) => {
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
    position: "regular", // Default position
  });
  
  const [registrationStatus, setRegistrationStatus] = useState({
    loading: false,
    success: false,
    error: null
  });
  
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch departments for dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      const { data, error } = await supabase
        .from("department")
        .select("d_name, d_uuid");
        
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

  // Handle form change
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
  
  // Handle registration submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setRegistrationStatus({
        loading: false,
        success: false,
        error: "Passwords do not match."
      });
      return;
    }

    if (formData.departmentName && formData.position !== "head" && !formData.roleUuid) {
      setRegistrationStatus({
        loading: false,
        success: false,
        error: "Please select a role for the department."
      });
      return;
    }

    setRegistrationStatus({
      loading: true,
      success: false,
      error: null
    });

    try {
      const {
        email,
        password,
        fullName,
        phoneNumber,
        dob,
        gender,
        address,
        departmentName,
        roleUuid,
        position,
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
        throw new Error(error.message);
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
          throw new Error(deptError.message);
        }

        d_uuid = deptData?.d_uuid || null;
      }

      // 3. Insert into "user" table
      if (data.user) {
        const { error: userError } = await supabase.from("users").insert([
          {
            uuid: data.user.id,
            email,
            name: fullName,
            phone_number: phoneNumber,
            dob,
            gender,
            address,
            d_uuid,
            r_uuid: position === "head" ? null : (roleUuid || null),
            position,
            age: dob
              ? new Date().getFullYear() - new Date(dob).getFullYear()
              : null,
          },
        ]);

        if (userError) {
          throw new Error(userError.message);
        }
      }

      // Success
      setRegistrationStatus({
        loading: false,
        success: true,
        error: null
      });
      
      // Reset form
      setFormData({
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
        position: "regular",
      });
      
      // Notify parent component
      if (onUserAdded && typeof onUserAdded === 'function') {
        onUserAdded();
      }
      
    } catch (err) {
      console.error("Registration error:", err);
      setRegistrationStatus({
        loading: false,
        success: false,
        error: err.message || "Unexpected error. Please try again."
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Register New User</h3>
      
      {registrationStatus.success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md">
          User registered successfully! They will receive an email to confirm their account.
        </div>
      )}
      
      {registrationStatus.error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {registrationStatus.error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
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
          <label className="block text-sm font-medium text-gray-700">Email</label>
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
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
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
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            name="dob"
            required
            value={formData.dob}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 border rounded-md"
          />
        </div>
        
        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <select
            name="departmentName"
            value={formData.departmentName}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 border rounded-md"
            disabled={loadingDepartments}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.uuid} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Position */}
        {formData.departmentName && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md"
            >
              <option value="regular">Regular Staff</option>
              <option value="head">Department Head</option>
            </select>
          </div>
        )}
        
        {/* Role - Only show if not department head */}
        {formData.departmentName && formData.position !== "head" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="roleUuid"
              value={formData.roleUuid}
              onChange={handleChange}
              disabled={loadingRoles}
              className={`w-full px-3 py-2 mt-1 border rounded-md ${
                loadingRoles ? "bg-gray-100" : ""
              }`}
            >
              <option value="">
                {loadingRoles ? "Loading roles..." : "Select a role"}
              </option>
              {roles.map((role) => (
                <option key={role.r_uuid} value={role.r_uuid}>
                  {role.r_name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
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
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
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
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </label>
            ))}
          </div>
        </div>
        
        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea
            name="address"
            rows="3"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 mt-1 border rounded-md"
          ></textarea>
        </div>
        
        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={registrationStatus.loading}
            className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none disabled:opacity-75"
          >
            {registrationStatus.loading ? "Registering..." : "Register User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserRegistrationForm;