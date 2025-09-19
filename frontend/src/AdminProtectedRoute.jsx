import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './components/context/AuthContext';
import { supabase } from './supabaseClient';

const AdminProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setAdminLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('isAdmin')
                    .eq('uuid', user.id)
                    .single();

                if (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                } else {
                    setIsAdmin(data?.isAdmin || false);
                }
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(false);
            } finally {
                setAdminLoading(false);
            }
        };

        checkAdminStatus();
    }, [user]);

    if (loading || adminLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">You do not have permission to access the admin panel.</p>
                    <button 
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default AdminProtectedRoute;
