import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
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
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [role, setRole] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState({ r_name: "", d_uuid: "", permission_level: 1 });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    dob: "",
    gender: "",
    address: "",
    password: "",
    confirmPassword: "",
    departmentName: "",
    isAdmin: false,
  });

  const [newDept, setNewDept] = useState({ d_name: "" });
  const [status, setStatus] = useState({ message: "", type: "" });

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
        .select("r_uuid, r_name, permission_level");
      if (usersError) setStatus({ message: "Error loading users: " + usersError.message, type: "error" });
      if (deptError) setStatus({ message: "Error loading departments: " + deptError.message, type: "error" });
      if (rolesError) setStatus({ message: "Error loading role: " + rolesError.message, type: "error" });
      setUsers(usersData || []);
      setDepartments(deptData || []);
      setRole(rolesData || []);
      setLoading(false);
    };
    fetchData();
  }, [status]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setStatus({ message: "Passwords do not match.", type: "error" });
      return;
    }
    setStatus({ message: "Creating user...", type: "loading" });

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (signUpError) {
        setStatus({ message: "Auth error: " + signUpError.message, type: "error" });
        return;
      }
      const userId = signUpData?.user?.id;
      if (!userId) {
        setStatus({ message: "Could not get user ID after sign up.", type: "error" });
        return;
      }
      let d_uuid = null;
      if (formData.departmentName) {
        const dept = departments.find((d) => d.d_name === formData.departmentName);
        d_uuid = dept ? dept.d_uuid : null;
      }
      const { error: dbError } = await supabase.from("users").insert({
        uuid: userId,
        email: formData.email,
        name: formData.name,
        phone_number: formData.phone_number,
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address,
        isAdmin: formData.isAdmin,
        d_uuid,
      });
      if (dbError) {
        setStatus({ message: "DB error: " + dbError.message, type: "error" });
        return;
      }
      setStatus({ message: "User created!", type: "success" });
      setFormData({
        name: "",
        email: "",
        phone_number: "",
        dob: "",
        gender: "",
        address: "",
        password: "",
        confirmPassword: "",
        departmentName: "",
        isAdmin: false,
      });
    } catch (err) {
      setStatus({ message: "Unexpected error: " + err.message, type: "error" });
    }
  };

  const handleDeleteUser = async (uuid) => {
    if (!window.confirm("Delete this user?")) return;
    await supabase.from("users").delete().eq("uuid", uuid);
    setStatus({ message: "User deleted.", type: "success" });
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
      <span className="absolute right-3 top-3 pointer-events-none text-gray-400">
        ▼
      </span>
    </div>
  );

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
          <input type="text" name="name" placeholder="Full Name" className="p-2 border rounded" value={formData.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" className="p-2 border rounded" value={formData.email} onChange={handleChange} required />
          <input type="tel" name="phone_number" placeholder="Phone Number" className="p-2 border rounded" value={formData.phone_number} onChange={handleChange} required />
          <input type="date" name="dob" placeholder="Date of Birth" className="p-2 border rounded" value={formData.dob} onChange={handleChange} required />
          <select name="gender" className="p-2 border rounded" value={formData.gender} onChange={handleChange} required>
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input type="text" name="address" placeholder="Address" className="p-2 border rounded" value={formData.address} onChange={handleChange} required />
          <DepartmentDropdown />
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
                    <td className="px-4 py-2 border-b">{u.isAdmin ? "Yes" : "No"}</td>
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