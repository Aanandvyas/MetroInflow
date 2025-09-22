import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

const Profile = () => {
    const { user, getUserProfile, signOutUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            // Wait for auth to finish loading
            if (authLoading) return;
            
            // If no user after auth loading is complete, redirect to login
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const profileData = await getUserProfile(user.id);
                if (profileData) {
                    setProfile(profileData);
                } else {
                    setError("Could not load profile data.");
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile data.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user, getUserProfile, navigate, authLoading]);

    const handleSignOut = async () => {
        await signOutUser();
        navigate('/login');
    };

    // Show loading while auth is loading
    if (authLoading || loading) {
        return <p className="text-center p-10">Loading profile...</p>;
    }
    
    // Show error if there's an error
    if (error) {
        return (
            <div className="text-center p-10">
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={() => navigate('/login')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Go to Login
                </button>
            </div>
        );
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
                        <input 
                            type="text" 
                            value={profile.position === 'head' 
                                ? `Head of ${profile.department?.d_name || 'Department'}` 
                                : (profile.role?.r_name || 'N/A')} 
                            disabled 
                            className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" 
                        />
                    </div>
                </div>

                {/* No action buttons needed as editing is removed */}
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