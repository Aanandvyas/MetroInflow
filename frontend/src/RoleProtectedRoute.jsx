import React, { useState, useEffect } from 'react';
import { useAuth } from './components/context/AuthContext';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, requiredPosition = null, restrictToPosition = null }) => {
  const { user, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id);
          setUserProfile(profile);
        } catch (error) {
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user, getUserProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If requiredPosition is specified, check if user has that position
  if (requiredPosition && userProfile?.position !== requiredPosition) {
    // Redirect to appropriate dashboard based on user position
    const redirectPath = userProfile?.position === 'head' ? '/head-dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  // If restrictToPosition is specified, check if user has that position
  if (restrictToPosition && userProfile?.position === restrictToPosition) {
    // Redirect non-head users away from head-only pages
    const redirectPath = userProfile?.position === 'head' ? '/head-dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default RoleProtectedRoute;