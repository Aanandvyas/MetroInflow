import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase Configuration ---
// These should be set in your .env file and are loaded by the React build process.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Initialize the Supabase client once.
// Add a check to ensure variables are present before creating the client.
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;


/**
 * A custom hook to manage the user's authentication state.
 * It provides the current session and loading status.
 */
export function useAuth() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            console.error("Supabase URL or Anon Key is missing. Authentication is disabled.");
            setLoading(false);
            return;
        }

        // Check for an active session on initial load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for changes in authentication state (e.g., login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // Cleanup the subscription when the component unmounts
        return () => subscription.unsubscribe();
    }, []);

    return { session, loading };
}


/**
 * The Login component renders a form for users to sign in with their email and password.
 */
export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!supabase) {
            setError("Authentication is not configured. Please check your environment variables.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Login successful!');
            // The onAuthStateChange listener in useAuth will handle the session update
            // and trigger the App component to re-render with the Dashboard.
        }
        setLoading(false);
    };

    // This component only renders the form. The session check is done in App.jsx
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    
                    <h1 className="text-3xl font-bold text-gray-900">KMRL Hub Login</h1>
                    <p className="mt-2 text-gray-600">Access your document dashboard</p>
                </div>

                {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
                {message && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">{message}</div>}

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !supabase}
                            className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
                 <p className="text-xs text-center text-gray-500">
                    Note: For this demo, you can sign up directly through the Supabase dashboard.
                </p>
            </div>
        </div>
    );
}

// You can export the supabase client if other parts of your app need it,
// for instance, for the logout button in App.jsx
export { supabase };

