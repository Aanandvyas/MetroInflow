import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowRightOnRectangleIcon, CheckBadgeIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const Profile = () => {
    const { user, userProfile, profileLoading, isEmailVerified, signOutUser, refreshUserProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            navigate('/login');
            return;
        }

        // If profile was not loaded yet (edge case), try to refresh
        if (!userProfile && !profileLoading) {
            refreshUserProfile().then(profile => {
                if (!profile) {
                    setError("Your profile could not be found. Signing out to refresh session...");
                    setTimeout(async () => {
                        await signOutUser();
                        navigate('/login', { replace: true });
                    }, 2000);
                }
            });
        }
    }, [user, userProfile, profileLoading, refreshUserProfile, navigate, authLoading, signOutUser]);

    const handleSignOut = async () => {
        await signOutUser();
        navigate('/login');
    };

    if (authLoading || profileLoading) {
        return <p className="text-center p-10">Loading profile...</p>;
    }

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

    if (!userProfile) {
        return <p className="text-center p-10">Could not load profile data.</p>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <UserCircleIcon className="h-16 w-16 text-gray-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{userProfile.name}</h1>
                        <p className="text-gray-500">{userProfile.email}</p>
                        {/* Verification badge */}
                        <div className="flex items-center gap-1 mt-1">
                            {isEmailVerified ? (
                                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                    <CheckBadgeIcon className="h-4 w-4" />
                                    Email verified
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                    Email not verified
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Form Section */}
            <div className="bg-white p-8 rounded-xl shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Full Name */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Full Name</label>
                        <input type="text" value={userProfile.name} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Department */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Department</label>
                        <input type="text" value={userProfile.department?.d_name || 'N/A'} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Phone Number */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Phone Number</label>
                        <input type="text" value={userProfile.phone_number || ''} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                    </div>

                    {/* Role */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600">Role</label>
                        <input
                            type="text"
                            value={userProfile.position === 'head'
                                ? `Head of ${userProfile.department?.d_name || 'Department'}`
                                : (userProfile.role?.r_name || 'N/A')}
                            disabled
                            className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
                        />
                    </div>

                    {/* Account info from Supabase Auth */}
                    {user?.last_sign_in_at && (
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-600">Last Sign In</label>
                            <input type="text" value={new Date(user.last_sign_in_at).toLocaleString()} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                        </div>
                    )}

                    {user?.created_at && (
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-600">Account Created</label>
                            <input type="text" value={new Date(user.created_at).toLocaleString()} disabled className="mt-1 w-full p-3 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed" />
                        </div>
                    )}
                </div>
            </div>
            {/* Logout Button */}
            <div className="mt-10 flex justify-center">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-6 py-3 text-red-600 font-semibold bg-red-50 rounded-lg hover:bg-red-100 transition"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default Profile;