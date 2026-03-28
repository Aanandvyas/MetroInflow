import React, { useEffect } from 'react';
import { useAuth } from './components/context/AuthContext';
import { Navigate } from 'react-router-dom';

const RoleProtectedRoute = ({ children, requiredPosition = null, restrictToPosition = null }) => {
  const { user, userProfile, profileLoading, signOutUser } = useAuth();

  // If user is logged in but profile is missing, sign out (stale session)
  // useEffect to avoid calling setState during render of another component
  useEffect(() => {
    if (user && !userProfile && !profileLoading) {
      signOutUser();
    }
  }, [user, userProfile, profileLoading, signOutUser]);

  // If still loading, show spinner
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user is logged in but profile is missing, show loading while signOut happens
  if (user && !userProfile) {
    return null;
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