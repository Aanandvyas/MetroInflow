import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user, getUserProfile, getRoles, updateUserRole } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    if (user) {
      console.log("Auth user id:", user.id);

      // ✅ Fetch user profile
      getUserProfile(user.id).then((res) => {
        console.log("Profile result:", res);
        setProfile(res);
      });

      // ✅ Fetch all roles
      getRoles().then(setRoles);
    }
  }, [user]);

  const handleRoleUpdate = async () => {
    if (!selectedRole) return;

    const result = await updateUserRole(user.id, selectedRole);
    if (result.success) {
      alert("Role updated successfully!");
      getUserProfile(user.id).then(setProfile); // refresh profile
    } else {
      alert("Failed to update role");
    }
  };

  if (!profile) return <p>Loading profile...</p>;

  // ✅ Map current role name from roles
  const currentRoleName =
    roles.find((role) => role.r_uuid === profile.r_uuid)?.r_name ||
    "Not assigned";

  return (
    <div className="max-w-md p-6 mx-auto mt-10 bg-white rounded shadow">
      <h2 className="mb-4 text-xl font-bold">My Profile</h2>

      <p>
        <strong>Name:</strong> {profile.name}
      </p>
      <p>
        <strong>Email:</strong> {profile.email}
      </p>
      <p>
        <strong>Department UUID:</strong> {profile.d_uuid}
      </p>
      <p>
        <strong>Current Role:</strong> {currentRoleName}
      </p>

      {/* Role Dropdown */}
      <div className="mt-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Select Role
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Select Role --</option>
          {roles.map((role) => (
            <option key={role.r_uuid} value={role.r_uuid}>
              {role.r_name}
            </option>
          ))}
        </select>

        <button
          onClick={handleRoleUpdate}
          className="w-full px-4 py-2 mt-3 text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Update Role
        </button>
      </div>
    </div>
  );
};

export default Profile;
