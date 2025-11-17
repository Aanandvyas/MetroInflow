import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { safeLocalStorage } from '../utils/localStorage';

// Icons
import { 
  UserIcon, 
  BellIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

// Components
import DashboardStats from './components/DashboardStats';
import UserRegistrationForm from './components/UserRegistrationForm';
import UserManagement from './components/UserManagement';
import AdminAllFiles from './components/AdminAllFiles';
import DepartmentManagement from './components/DepartmentManagement';
import RoleManagement from './components/RoleManagement';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Data for the dashboard stats
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Admin authentication check
  useEffect(() => {
    const adminSession = safeLocalStorage.getItem('adminSession');
    
    if (!adminSession) {
      navigate('/login');
      return;
    }
    
    const sessionData = JSON.parse(adminSession);
    setAdminInfo(sessionData);
    
    // Load initial data
    fetchDashboardData();
  }, [navigate]);
  
  // Fetch data for dashboard
  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch users count
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select('uuid');
      
    if (!usersError) {
      setUsers(usersData || []);
    }
    
    // Fetch departments
    const { data: deptsData, error: deptsError } = await supabase
      .from("department")
      .select("d_uuid, d_name");
      
    if (!deptsError) {
      setDepartments(deptsData || []);
    }
    
    setLoading(false);
  };

  // Handle user registration refresh
  const handleUserAdded = () => {
    fetchDashboardData();
  };
  
  // Handle admin logout
  const handleLogout = () => {
    safeLocalStorage.removeItem('adminSession');
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-800 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-indigo-200 mt-1">Manage your application</p>
        </div>
        
        <nav className="mt-6">
          <div 
            className={`flex items-center px-6 py-3 cursor-pointer ${activeTab === 'dashboard' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="h-5 w-5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <span>Dashboard</span>
          </div>
          
          <div 
            className={`flex items-center px-6 py-3 cursor-pointer ${activeTab === 'register' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
            onClick={() => setActiveTab('register')}
          >
            <div className="h-5 w-5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
            </div>
            <span>Register User</span>
          </div>
          
          <div 
            className={`flex items-center px-6 py-3 cursor-pointer ${activeTab === 'users' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
            onClick={() => setActiveTab('users')}
          >
            <div className="h-5 w-5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <span>Users</span>
          </div>
          
          <div 
            className={`flex items-center px-6 py-3 cursor-pointer ${activeTab === 'files' ? 'bg-indigo-900' : 'hover:bg-indigo-700'}`}
            onClick={() => setActiveTab('files')}
          >
            <div className="h-5 w-5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
            </div>
            <span>Files</span>
          </div>
          
          <div 
            className="flex items-center px-6 py-3 cursor-pointer text-red-300 hover:bg-red-900 hover:text-red-100 mt-auto"
            onClick={handleLogout}
          >
            <div className="h-5 w-5 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </div>
            <span>Logout</span>
          </div>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'register' && 'Register New User'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'files' && 'All Files'}
            </h2>
            
            <div className="flex items-center space-x-4">
              <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none">
                <BellIcon className="h-6 w-6" />
              </button>
              
              <div className="relative">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="bg-indigo-500 p-2 rounded-full">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{adminInfo?.username}</span>
                      <ChevronDownIcon className="h-4 w-4 ml-1 text-gray-500" />
                    </div>
                    <span className="text-xs text-gray-500">Administrator</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <DashboardStats users={users} departments={departments} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                    <h3 className="text-lg font-semibold text-indigo-900">Department Management</h3>
                  </div>
                  <div className="p-4">
                    <DepartmentManagement />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                    <h3 className="text-lg font-semibold text-indigo-900">Role Management</h3>
                  </div>
                  <div className="p-4">
                    <RoleManagement />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Register User Tab */}
          {activeTab === 'register' && (
            <UserRegistrationForm onUserAdded={handleUserAdded} />
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <UserManagement />
          )}
          
          {/* Files Tab */}
          {activeTab === 'files' && (
            <AdminAllFiles />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
