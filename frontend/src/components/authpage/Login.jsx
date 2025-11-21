import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Ensure this path is correct
import { supabase } from '../../supabaseClient';
import { safeLocalStorage } from '../../utils/localStorage';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signInUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAdminLogin) {
        // Admin login
        const { data, error } = await supabase
          .from('admin')
          .select()
          .eq('a_username', username)
          .single();

        if (error) {
          setError('Admin username not found');
        } else if (data && data.a_pass === password) {
          // Store admin session in localStorage
          safeLocalStorage.setItem('adminSession', JSON.stringify({
            isAdmin: true,
            username: data.a_username,
            adminId: data.a_uuid
          }));
          navigate('/admin-dashboard');
        } else {
          setError('Invalid admin credentials');
        }
      } else {
        // Regular user login
        const { error: signInError } = await signInUser(email, password);

        if (signInError) {
          setError(signInError.message);
        } else {
        
          navigate('/'); // Correctly navigate to the root protected route
        }
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 m-4 bg-white border border-gray-200 rounded-lg shadow-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="mt-1 text-gray-500">Please sign in to access your account</p>
          
          {/* Login Type Toggle */}
          <div className="flex justify-center mt-4 space-x-4">
            <button
              type="button"
              onClick={() => setIsAdminLogin(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                !isAdminLogin
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              User Login
            </button>
            <button
              type="button"
              onClick={() => setIsAdminLogin(true)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isAdminLogin
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              Admin Login
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {isAdminLogin ? (
            /* Admin Login Fields */
            <>
              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Admin Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin"
                />
              </div>
            </>
          ) : (
            /* User Login Fields */
            <>
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required={!isAdminLogin}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
            </>
          )}

          {/* Password Input */}
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
              className="w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          {/* Remember Me & Forgot Password (UI only) */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="remember-me" className="ml-2 text-gray-600">
                Remember me
              </label>
            </div>
            <div>
              <button type="button" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 font-semibold text-white transition duration-200 bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : isAdminLogin ? 'Admin Sign In' : 'User Sign In'}
            </button>
          </div>
        </form>

        {/* Footer - only show for non-admin login */}
        {!isAdminLogin && (
          <p className="mt-8 text-sm text-center text-gray-500">
            Contact your administrator to create an account.
          </p>
        )}

      </div>
    </div>
  );
};

export default Login;