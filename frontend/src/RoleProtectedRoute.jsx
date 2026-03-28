import React, { useEffect, useState } from 'react';
import { useAuth } from './components/context/AuthContext';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, requiredPosition = null, restrictToPosition = null }) => {
  const { user, userProfile, profileLoading, refreshUserProfile } = useAuth();
  const [retriedProfile, setRetriedProfile] = useState(false);

  // If profile is temporarily unavailable, retry once instead of forcing logout.
  useEffect(() => {
    if (user && !userProfile && !profileLoading && !retriedProfile) {
      setRetriedProfile(true);
      refreshUserProfile();
    }
  }, [user, userProfile, profileLoading, retriedProfile, refreshUserProfile]);

  // If still loading, or after first retry attempt, show spinner.
  if (profileLoading || (user && !userProfile && !retriedProfile)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If profile is still unavailable after retry, do not force logout.
  // Allow general routes, but block role-specific routes that cannot be verified.
  if (user && !userProfile) {
    if (requiredPosition) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  // If requiredPosition is specified, only allow users WITH that position
  if (requiredPosition && userProfile?.position !== requiredPosition) {
    const redirectPath = userProfile?.position === 'head' ? '/head-dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  // If restrictToPosition is specified, BLOCK users who have that position
  if (restrictToPosition && userProfile?.position === restrictToPosition) {
    if (restrictToPosition === 'head') {
      return <Navigate to="/head-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoute;