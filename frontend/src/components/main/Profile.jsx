import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../supabaseClient"; // ADD

const Profile = () => {
    const { user, getUserProfile, updateUserRole, signOutUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

    const fetchRolesForDept = async (d_uuid) => {
        if (!d_uuid) {
            setRoles([]);
            return;
        }
        const { data, error } = await supabase
            .from("role")
            .select("r_uuid, r_name, d_uuid")
            .eq("d_uuid", d_uuid)
            .order("r_name", { ascending: true });
        if (error) {
            setRoles([]);
            return;
        }
        setRoles(data || []);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                const profileData = await getUserProfile(user.id);
                setProfile(profileData);
                setSelectedRole(profileData?.r_uuid || "");
                await fetchRolesForDept(profileData?.d_uuid);
            }
            setLoading(false);
        };
        fetchData();
    }, [user, getUserProfile]);

    // If department changes later, reload roles list
    useEffect(() => {
        if (profile?.d_uuid) fetchRolesForDept(profile.d_uuid);
    }, [profile?.d_uuid]);

    const handleSaveChanges = async () => {
        if (!selectedRole) {
            setStatusMessage({ text: 'Please select a role.', type: 'error' });
            return;
        }
        setStatusMessage({ text: 'Saving...', type: 'loading' });
        const result = await updateUserRole(user.id, selectedRole);
        if (result.success) {
            const updatedProfile = await getUserProfile(user.id);
            setProfile(updatedProfile);
            setStatusMessage({ text: 'Profile updated successfully!', type: 'success' });
        } else {
            setStatusMessage({ text: 'Failed to update role. Please try again.', type: 'error' });
        }
        setIsEditing(false);
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
    };

    const handleSignOut = async () => {
        await signOutUser();
        navigate('/login');
    };

    if (loading) {
        return <p className="text-center p-10">Loading profile...</p>;
    }
    
    if (!profile) {
        return <p className="text-center p-10">Could not load profile data.</p>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <UserCircleIcon className="h-16 w-16 text-gray-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{profile.name}</h1>
                        <p className="text-gray-500">{profile.email}</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                    >
                        Edit
                    </button>
                )}
            </div>

            {/* Profile Form Section */}
            <div className="bg-white p-8 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Full Name */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Full Name</label>
                        <input type="text" value={profile.name} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Department */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Department</label>
                         <input type="text" value={profile.department?.d_name || 'N/A'} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Phone Number */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                        <input type="text" value={profile.phone_number} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>
                    
                    {/* Role */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            disabled={!isEditing || roles.length === 0 || !profile?.d_uuid}
                            className={`mt-1 w-full p-3 border rounded-lg ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                        >
                           <option value="">
                             {profile?.d_uuid
                               ? (roles.length ? 'Select role' : 'No roles in this department')
                               : 'Assign department first'}
                           </option>
                           {roles.map((role) => (
                                <option key={role.r_uuid} value={role.r_uuid}>
                                    {role.r_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                    <div className="flex items-center justify-end gap-4 mt-8 border-t pt-6">
                         {statusMessage.text && (
                            <p className={`text-sm ${
                                statusMessage.type === 'success' ? 'text-green-600' :
                                statusMessage.type === 'error' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                                {statusMessage.text}
                            </p>
                        )}
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setSelectedRole(profile.r_uuid || ""); // Reset changes
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
             {/* Logout Button */}
             <div className="mt-10 flex justify-center">
                 <button 
                     onClick={handleSignOut}
                     className="flex items-center gap-2 px-6 py-3 text-red-600 font-semibold bg-red-50 rounded-lg hover:bg-red-100 transition"
                 >
                     <ArrowRightOnRectangleIcon className="h-5 w-5"/>
                     Log Out
                 </button>
             </div>
        </div>
    );
};

export default Profile;