import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

const Profile = () => {
    const { user, departmentName, phoneNumber, rUuid, getRoles, updateUserRole, signOutUser } = useAuth();
    const navigate = useNavigate();
    // Profile info is now derived from user and dUuid
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(rUuid || "");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchRoles = async () => {
            if (user) {
                const rolesData = await getRoles();
                setRoles(rolesData || []);
            }
            setLoading(false);
        };
        fetchRoles();
    }, [user, getRoles]);

    const handleSaveChanges = async () => {
        if (!selectedRole) {
            setStatusMessage({ text: 'Please select a role.', type: 'error' });
            return;
        }

        setStatusMessage({ text: 'Saving...', type: 'loading' });
        const result = await updateUserRole(user.id, selectedRole);

        if (result.success) {
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
    

    if (!user) {
        return <p className="text-center p-10">Could not load profile data.</p>;
    }

    // Compose profile info from user and context
    const profile = {
        name: user.user_metadata?.name || user.email,
        email: user.email,
        phone_number: phoneNumber || user.user_metadata?.phone_number || '',
        department: departmentName || '',
        r_uuid: rUuid || '',
    };

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
                        <input type="text" value={profile.department || 'N/A'} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Phone Number */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                        <input type="text" value={profile.phone_number || 'N/A'} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>
                    
                    {/* Role */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Role</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            disabled={!isEditing}
                            className={`mt-1 w-full p-3 border rounded-lg ${!isEditing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                        >
                            <option value="">{roles.find(r => r.r_uuid === profile.r_uuid)?.r_name || 'Not Assigned'}</option>
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