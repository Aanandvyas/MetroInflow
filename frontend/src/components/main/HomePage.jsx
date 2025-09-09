import React from "react";
// FIX 1: Changed UserAuth to useAuth
import { useAuth } from "../context/AuthContext"; 
import { useNavigate } from "react-router-dom";

const HomePage = () => {
    // FIX 2: Changed UserAuth to useAuth and signOut to signOutUser
    const { session, signOutUser } = useAuth(); 
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            // FIX 3: Called signOutUser instead of signOut
            await signOutUser(); 
            navigate("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4">Welcome to the Home Page</h1>
                {session && (
                    <p className="mb-4">Logged in as: <span className="font-semibold">{session.user?.email}</span></p>
                )}
                <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default HomePage;