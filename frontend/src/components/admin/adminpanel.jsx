import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { PlusIcon, TrashIcon, UserPlusIcon, BuildingOffice2Icon, DocumentCheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const AccordionSection = ({ title, icon, open, setOpen, children }) => (
  <div className="mb-6 bg-white rounded-lg shadow border">
    <button
      type="button"
      className="w-full flex items-center justify-between px-6 py-4 text-lg font-semibold text-gray-800 focus:outline-none"
      onClick={() => setOpen((prev) => !prev)}
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
      </span>
      <ChevronDownIcon
        className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
    <div className={`transition-all duration-300 overflow-hidden ${open ? "max-h-[2000px] py-4 px-6" : "max-h-0 px-6 py-0"}`}>
      {open && children}
    </div>
  </div>
);

const AdminPanel = () => {
  const { signUpNewUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [role, setRole] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState({ r_name: "", d_uuid: "", permission_level: 1 });

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
    roleId: "",
    isAdmin: false,
  });

  const [newDept, setNewDept] = useState({ d_name: "" });
  const [status, setStatus] = useState({ message: "", type: "" });
  const [pendingAdminChanges, setPendingAdminChanges] = useState({});

  // Accordion open states
  const [openCreateUser, setOpenCreateUser] = useState(true);
  const [openUsers, setOpenUsers] = useState(false);
  const [openCreateDept, setOpenCreateDept] = useState(false);
  const [openDepartments, setOpenDepartments] = useState(false);
  const [openCreateRole, setOpenCreateRole] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("uuid, email, isAdmin, d_uuid, name");
      const { data: deptData, error: deptError } = await supabase
        .from("department")
        .select("d_uuid, d_name");
      const { data: rolesData, error: rolesError } = await supabase
        .from("role")
        .select("r_uuid, r_name, permission_level, d_uuid");
      if (usersError) setStatus({ message: "Error loading users: " + usersError.message, type: "error" });
      if (deptError) setStatus({ message: "Error loading departments: " + deptError.message, type: "error" });
      if (rolesError) setStatus({ message: "Error loading role: " + rolesError.message, type: "error" });
      
      console.log('Data loaded:', {
        users: usersData,
        departments: deptData,
        roles: rolesData,
        rolesError: rolesError
      });
      
      setUsers(usersData || []);
      setDepartments(deptData || []);
      setRole(rolesData || []);
      setLoading(false);
    };
    fetchData();
  }, [status]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      
      // Reset role when department changes
      if (name === "departmentName") {
        newData.roleId = "";
      }
      
      return newData;
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setStatus({ message: "Passwords do not match.", type: "error" });
      return;
    }
    setStatus({ message: "Creating user...", type: "loading" });

    try {
      // Create user using the same process as register.jsx but with custom logic for admin panel
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
        setStatus({ message: "Error creating user: " + error.message, type: "error" });
        return;
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
          setStatus({ message: "Department not found: " + deptError.message, type: "error" });
          return;
        }

        d_uuid = deptData?.d_uuid || null;
      }

      // 3. Insert into users table with role and admin status
      if (data.user) {
        const userData = {
          uuid: data.user.id,
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
        };

        // Add role and admin status if specified
        if (formData.roleId) {
          userData.r_uuid = formData.roleId;
        }
        if (formData.isAdmin) {
          userData.isAdmin = formData.isAdmin;
        }

        const { error: userError } = await supabase.from("users").insert([userData]);

        if (userError) {
          setStatus({ message: "Error inserting user details: " + userError.message, type: "error" });
          return;
        }
      }

      setStatus({ message: "User created successfully!", type: "success" });

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
        roleId: "",
        isAdmin: false,
      });

    } catch (err) {
      setStatus({ message: "Unexpected error: " + err.message, type: "error" });
    }
  };

  const handleDeleteUser = async (uuid) => {
    if (!window.confirm("Delete this user? This will permanently remove the user from both the database and authentication system.")) return;
    
    setStatus({ message: "Deleting user...", type: "loading" });
    
    try {
      // First, delete from the users table
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("uuid", uuid);

      if (dbError) {
        setStatus({ message: "Error deleting user from database: " + dbError.message, type: "error" });
        return;
      }

      // Then, delete from Supabase Auth using Admin API
      const { error: authError } = await supabase.auth.admin.deleteUser(uuid);

      if (authError) {
        console.warn("User deleted from database but failed to delete from auth:", authError.message);
        
        // Check if the error is because user doesn't exist in auth (already deleted)
        if (authError.message.includes('User not found') || authError.message.includes('not found')) {
          setStatus({ 
            message: "User deleted from database. User was not found in authentication system (may have been already deleted).", 
            type: "success" 
          });
        } else {
          setStatus({ 
            message: "User deleted from database, but there was an issue removing from authentication system. You may need to manually delete from Supabase dashboard.", 
            type: "error" 
          });
        }
        return;
      }

      // Update local state to remove the user from the list
      setUsers(users.filter(user => user.uuid !== uuid));
      setStatus({ message: "User completely deleted from both database and authentication system.", type: "success" });
      
    } catch (err) {
      setStatus({ message: "Error deleting user: " + err.message, type: "error" });
    }
  };

  const handleAdminStatusChange = (uuid, newStatus) => {
    setPendingAdminChanges(prev => ({
      ...prev,
      [uuid]: newStatus
    }));
  };

  const handleConfirmAdminStatus = async (uuid) => {
    const newStatus = pendingAdminChanges[uuid];
    if (newStatus === undefined) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ isAdmin: newStatus })
        .eq("uuid", uuid);

      if (error) {
        setStatus({ message: "Error updating admin status: " + error.message, type: "error" });
        return;
      }

      // Update the local users state
      setUsers(users.map(user => 
        user.uuid === uuid 
          ? { ...user, isAdmin: newStatus }
          : user
      ));

      // Remove from pending changes
      setPendingAdminChanges(prev => {
        const newPending = { ...prev };
        delete newPending[uuid];
        return newPending;
      });

      setStatus({ message: "Admin status updated successfully!", type: "success" });
    } catch (err) {
      setStatus({ message: "Error updating admin status: " + err.message, type: "error" });
    }
  };

  const handleCancelAdminChange = (uuid) => {
    setPendingAdminChanges(prev => {
      const newPending = { ...prev };
      delete newPending[uuid];
      return newPending;
    });
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDept.d_name) {
      setStatus({ message: "Department name required.", type: "error" });
      return;
    }
    const { error } = await supabase.from("department").insert({ d_name: newDept.d_name });
    if (error) {
      setStatus({ message: "DB error: " + error.message, type: "error" });
      return;
    }
    setStatus({ message: "Department created!", type: "success" });
    setNewDept({ d_name: "" });
  };

  const handleDeleteDept = async (d_uuid) => {
    if (!window.confirm("Delete this department?")) return;
    await supabase.from("department").delete().eq("d_uuid", d_uuid);
    setStatus({ message: "Department deleted.", type: "success" });
  };
  const handleCreateRole = async (e) => {
  e.preventDefault();
  if (!newRole.r_name || !newRole.d_uuid) {
    setStatus({ message: "Role name & department required.", type: "error" });
    return;
  }
  const { error } = await supabase.from("role").insert(newRole);
  if (error) {
    setStatus({ message: "DB error: " + error.message, type: "error" });
    return;
  }
  setStatus({ message: "Role created!", type: "success" });
  setNewRole({ r_name: "", d_uuid: "", permission_level: 1 });
};

// update role name / permission
const handleUpdateRole = async (r_uuid, field, value) => {
  const { error } = await supabase.from("role").update({ [field]: value }).eq("r_uuid", r_uuid);
  if (error) {
    setStatus({ message: "Update error: " + error.message, type: "error" });
    return;
  }
  setStatus({ message: "Role updated!", type: "success" });
};

//delete role
const handleDeleteRole = async (r_uuid) => {
  if (!window.confirm("Delete this role?")) return;
  await supabase.from("role").delete().eq("r_uuid", r_uuid);
  setStatus({ message: "Role deleted.", type: "success" });
};

  // Dropdown for departments in user creation
  const DepartmentDropdown = () => (
    <div className="relative">
      <select
        name="departmentName"
        className="p-2 border rounded w-full"
        value={formData.departmentName}
        onChange={handleChange}
        required
      >
        <option value="">Select Department</option>
        {departments.map((d) => (
          <option key={d.d_uuid} value={d.d_name}>
            {d.d_name}
          </option>
        ))}
      </select>
    </div>
  );

  // Dropdown for roles in user creation
  const RoleDropdown = () => {
    // Filter roles based on selected department
    const filteredRoles = formData.departmentName 
      ? role.filter(r => {
          const dept = departments.find(d => d.d_name === formData.departmentName);
          console.log('Filtering roles:', {
            selectedDept: formData.departmentName,
            dept: dept,
            role: r,
            matches: dept && r.d_uuid === dept.d_uuid
          });
          return dept && r.d_uuid === dept.d_uuid;
        })
      : [];

    console.log('RoleDropdown state:', {
      allRoles: role,
      filteredRoles: filteredRoles,
      selectedDept: formData.departmentName,
      departments: departments
    });

    return (
      <div className="relative">
        <select
          name="roleId"
          className="p-2 border rounded w-full"
          value={formData.roleId}
          onChange={handleChange}
          disabled={!formData.departmentName}
        >
          <option value="">
            {!formData.departmentName 
              ? "Select Department First" 
              : filteredRoles.length === 0 
                ? "No Roles Available" 
                : "Select Role"
            }
          </option>
          {filteredRoles.map((r) => (
            <option key={r.r_uuid} value={r.r_uuid}>
              {r.r_name} (Level {r.permission_level})
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Panel</h1>

      {status.message && (
        <div
          className={`mb-6 p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : status.type === "error"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Accordion: Create User */}
      <AccordionSection
        title="Create User"
        icon={<UserPlusIcon className="h-6 w-6 text-blue-500" />}
        open={openCreateUser}
        setOpen={setOpenCreateUser}
      >
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-blue-50 p-6 rounded-lg shadow">
          <input type="text" name="fullName" placeholder="Full Name" className="p-2 border rounded" value={formData.fullName} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" className="p-2 border rounded" value={formData.email} onChange={handleChange} required />
          <input type="tel" name="phoneNumber" placeholder="Phone Number" className="p-2 border rounded" value={formData.phoneNumber} onChange={handleChange} required />
          <input type="date" name="dob" placeholder="Date of Birth" className="p-2 border rounded" value={formData.dob} onChange={handleChange} required />
          <select name="gender" className="p-2 border rounded" value={formData.gender} onChange={handleChange} required>
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input type="text" name="address" placeholder="Address" className="p-2 border rounded" value={formData.address} onChange={handleChange} required />
          <DepartmentDropdown />
          <RoleDropdown />
          <input type="password" name="password" placeholder="Password" className="p-2 border rounded" value={formData.password} onChange={handleChange} required />
          <input type="password" name="confirmPassword" placeholder="Confirm Password" className="p-2 border rounded" value={formData.confirmPassword} onChange={handleChange} required />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isAdmin" checked={formData.isAdmin} onChange={handleChange} />
            Admin
          </label>
          <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <PlusIcon className="h-5 w-5" />
            Create
          </button>
        </form>
      </AccordionSection>

      {/* Accordion: Users */}
      <AccordionSection
        title="Users"
        icon={<DocumentCheckIcon className="h-6 w-6 text-blue-500" />}
        open={openUsers}
        setOpen={setOpenUsers}
      >
        {loading ? (
          <div>Loading users...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full bg-white border rounded">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-4 py-2 border-b">Full Name</th>
                  <th className="px-4 py-2 border-b">Email</th>
                  <th className="px-4 py-2 border-b">Admin</th>
                  <th className="px-4 py-2 border-b">Department</th>
                  <th className="px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uuid} className="hover:bg-blue-50">
                    <td className="px-4 py-2 border-b">{u.name || "-"}</td>
                    <td className="px-4 py-2 border-b">{u.email}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex items-center gap-2">
                        <select
                          value={pendingAdminChanges[u.uuid] !== undefined ? pendingAdminChanges[u.uuid] : u.isAdmin}
                          onChange={(e) => handleAdminStatusChange(u.uuid, e.target.value === 'true')}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value={false}>User</option>
                          <option value={true}>Admin</option>
                        </select>
                        {pendingAdminChanges[u.uuid] !== undefined && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleConfirmAdminStatus(u.uuid)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              title="Confirm change"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleCancelAdminChange(u.uuid)}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                              title="Cancel change"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b">
                      {departments.find((d) => d.d_uuid === u.d_uuid)?.d_name || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      <button
                        onClick={() => handleDeleteUser(u.uuid)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        title="Delete user"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionSection>

      {/* Accordion: Create Department */}
      <AccordionSection
        title="Create Department"
        icon={<BuildingOffice2Icon className="h-6 w-6 text-blue-500" />}
        open={openCreateDept}
        setOpen={setOpenCreateDept}
      >
        <form onSubmit={handleCreateDept} className="flex gap-4 items-end bg-blue-50 p-6 rounded-lg shadow">
          <input
            type="text"
            placeholder="Department Name"
            className="p-2 border rounded"
            value={newDept.d_name}
            onChange={(e) => setNewDept({ d_name: e.target.value })}
            required
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            Create
          </button>
        </form>
      </AccordionSection>

      {/* Accordion: Departments */}
      <AccordionSection
        title="Departments"
        icon={<BuildingOffice2Icon className="h-6 w-6 text-blue-500" />}
        open={openDepartments}
        setOpen={setOpenDepartments}
      >
        {loading ? (
          <div>Loading departments...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full bg-white border rounded">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-4 py-2 border-b">Name</th>
                  <th className="px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.d_uuid} className="hover:bg-blue-50">
                    <td className="px-4 py-2 border-b">{d.d_name}</td>
                    <td className="px-4 py-2 border-b">
                      <button
                        onClick={() => handleDeleteDept(d.d_uuid)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        title="Delete department"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionSection>
      {/* Accordion: Create Role */}
        <AccordionSection
        title="Create Role"
        icon={<DocumentCheckIcon className="h-6 w-6 text-blue-500" />}
        open={openCreateRole}
        setOpen={setOpenCreateRole}
        >
        <form onSubmit={handleCreateRole} className="flex gap-4 items-end bg-blue-50 p-6 rounded-lg shadow">
            <input
                type="text"
                placeholder="Role Name"
                className="p-2 border rounded"
                value={newRole.r_name}
                onChange={(e) => setNewRole((prev) => ({ ...prev, r_name: e.target.value }))}
                required
                />

                <select
                className="p-2 border rounded"
                value={newRole.d_uuid}
                onChange={(e) => setNewRole((prev) => ({ ...prev, d_uuid: e.target.value }))}
                required
                >
                <option value="">Select Department</option>
                {departments.map((d) => (
                    <option key={d.d_uuid} value={d.d_uuid}>
                    {d.d_name}
                    </option>
                ))}
                </select>


            <select
            className="p-2 border rounded"
            value={newRole.permission_level}
            onChange={(e) => setNewRole({ ...newRole, permission_level: parseInt(e.target.value) })}
            >
            {[1, 2, 3].map((lvl) => (
                <option key={lvl} value={lvl}>
                Permission {lvl}
                </option>
            ))}
            </select>
            <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
            <PlusIcon className="h-5 w-5" />
            Create
            </button>
        </form>
        </AccordionSection>
        {/* Accordion: Roles */}
        <AccordionSection
        title="Roles"
        icon={<DocumentCheckIcon className="h-6 w-6 text-blue-500" />}
        open={openRoles}
        setOpen={setOpenRoles}
        >
        {loading ? (
            <div>Loading role...</div>
        ) : (
            <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full bg-white border rounded">
                <thead className="bg-blue-100">
                <tr>
                    <th className="px-4 py-2 border-b">Role Name</th>
                    <th className="px-4 py-2 border-b">Department</th>
                    <th className="px-4 py-2 border-b">Permission Level</th>
                    <th className="px-4 py-2 border-b">Actions</th>
                </tr>
                </thead>
                <tbody>
                {role.map((r) => (
                    <tr key={r.r_uuid} className="hover:bg-blue-50">
                    <td className="px-4 py-2 border-b">
                        <input
                        className="p-1 border rounded w-full"
                        value={r.r_name}
                        onChange={(e) => handleUpdateRole(r.r_uuid, "r_name", e.target.value)}
                        />
                    </td>
                    <td className="px-4 py-2 border-b">
                        {departments.find((d) => d.d_uuid === r.d_uuid)?.d_name || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                        <select
                        className="p-1 border rounded"
                        value={r.permission_level}
                        onChange={(e) =>
                            handleUpdateRole(r.r_uuid, "permission_level", parseInt(e.target.value))
                        }
                        >
                        {[1, 2, 3].map((lvl) => (
                            <option key={lvl} value={lvl}>
                            {lvl}
                            </option>
                        ))}
                        </select>
                    </td>
                    <td className="px-4 py-2 border-b">
                        <button
                        onClick={() => handleDeleteRole(r.r_uuid)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        </AccordionSection>

    </div>
  );
};

export default AdminPanel;