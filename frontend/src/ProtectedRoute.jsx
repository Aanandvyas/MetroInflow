import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './components/context/AuthContext'; // Correct path

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; 
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;