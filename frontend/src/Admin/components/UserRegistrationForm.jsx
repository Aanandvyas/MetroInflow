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
    departmentUuid: "", // Add this to store department UUID
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
        // Reset selected role when department changes and store department UUID
        setFormData(prev => ({ 
          ...prev, 
          roleUuid: "", 
          departmentUuid: selectedDept.uuid 
        }));
      } else {
        // Clear department UUID if no department selected
        setFormData(prev => ({ 
          ...prev, 
          roleUuid: "", 
          departmentUuid: "" 
        }));
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
        error: "Not all fields are filled"
      });
      return;
    }

    // Only require role selection if department is selected and position is not head
    // Allow users without departments or heads without roles
    if (formData.departmentName && formData.position === "regular" && roles.length > 0 && !formData.roleUuid) {
      setRegistrationStatus({
        loading: false,
        success: false,
        error: "Not all fields are filled"
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
        departmentUuid,
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

      // Use the stored departmentUuid directly
      let d_uuid = departmentUuid || null;

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
        departmentUuid: "",
        roleUuid: "",
        position: "regular",
      });
      
      // Notify parent component
      if (onUserAdded && typeof onUserAdded === 'function') {
        onUserAdded();
      }
      
    } catch (err) {
      setRegistrationStatus({
        loading: false,
        success: false,
        error: "Not all fields are filled"
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Register New User</h3>
      
      {registrationStatus.success && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 border border-green-300 rounded-md">
          User registered successfully!
        </div>
      )}
      
      {registrationStatus.error && (
        <div className="mb-6 p-4 bg-red-100 text-red-800 border border-red-300 rounded-md">
          {registrationStatus.error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                {loadingRoles 
                  ? "Loading roles..." 
                  : roles.length === 0 
                  ? "No roles available for this department" 
                  : "Select a role (optional)"}
              </option>
              {roles.map((role) => (
                <option key={role.r_uuid} value={role.r_uuid}>
                  {role.r_name}
                </option>
              ))}
            </select>
            {roles.length === 0 && !loadingRoles && (
              <p className="text-xs text-gray-500 mt-1">
                No roles have been created for this department yet. User can be registered without a role.
              </p>
            )}
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
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={registrationStatus.loading}
            className="w-full flex justify-center items-center px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed transition duration-200"
          >
            {registrationStatus.loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </>
            ) : (
              "Register User"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserRegistrationForm;