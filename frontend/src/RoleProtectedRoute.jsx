import React, { useState, useEffect } from 'react';
import { useAuth } from './components/context/AuthContext';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, requiredPosition = null, restrictToPosition = null }) => {
  const { user, getUserProfile, signOutUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id);
          if (profile) {
            setUserProfile(profile);
            setLoading(false);
          } else {
            // Profile missing - stale session
            console.warn('Profile missing in RoleProtectedRoute. Signing out.');
            await signOutUser();
            // The redirection to login will be handled by ProtectedRoute or AuthContext state change
          }
        } catch (error) {
          console.error('Failed to fetch user profile for role check:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, getUserProfile, signOutUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If requiredPosition is specified, only allow users WITH that position
  if (requiredPosition && userProfile?.position !== requiredPosition) {
    // User doesn't have the required position — redirect them to their appropriate home
    const redirectPath = userProfile?.position === 'head' ? '/head-dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  // If restrictToPosition is specified, BLOCK users who have that position
  // e.g. restrictToPosition="head" means heads are NOT allowed on this page
  if (restrictToPosition && userProfile?.position === restrictToPosition) {
    // User has the restricted position — redirect them away
    if (restrictToPosition === 'head') {
      return <Navigate to="/head-dashboard" replace />;
    }
    // For any other restricted position, send to home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoute;