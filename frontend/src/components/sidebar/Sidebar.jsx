import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "../context/AuthContext"; 
import {
  HomeIcon,
  UsersIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ArchiveBoxIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth(); // ✅ get user

  // ✅ Base nav items
  const navItems = [
    { name: 'Dashboard', path: '/', icon: HomeIcon },
    { name: 'Assigned to me', path: '/assigned-to-me', icon: UsersIcon },
    { name: 'All Files', path: '/all-files', icon: PaperAirplaneIcon },
    { name: 'Notifications', path: '/notifications', icon: EnvelopeIcon },
    { name: 'Important', path: '/important', icon: ArchiveBoxIcon },
  ];
  
  // ✅ Add Admin Page only if user isAdmin
  if (user?.isAdmin) {
    navItems.push({ name: 'Admin Page', path: '/admin', icon: CogIcon });
  }

  return (
    <aside className="w-64 bg-white p-5 border-r border-gray-200 overflow-y-auto">
      <nav>
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.name} className="mb-2">
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon
                    className={`h-6 w-6 mr-3 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
