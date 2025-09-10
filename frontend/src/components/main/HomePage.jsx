import React from "react";
import { useAuth } from "../context/AuthContext"; // Correct path
import { useNavigate } from "react-router-dom";

const HomePage = () => {
    const { session, signOutUser } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOutUser();
            navigate("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>
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