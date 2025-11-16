import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  PaperAirplaneIcon,
  TagIcon,
  EnvelopeIcon,
  CogIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ShieldCheckIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import Calendar from '../../departmenthead/Calendar';
import { CalendarIcon } from '@heroicons/react/20/solid';

// ✅ Navigation items for regular users
const regularNavItems = [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  { name: 'Assigned to me', path: '/assigned-to-me', icon: UsersIcon },
  { name: 'All Files', path: '/all-files', icon: PaperAirplaneIcon },
  { name: 'Notifications', path: '/notifications', icon: EnvelopeIcon },
  { name: 'Important', path: '/important', icon: ArchiveBoxIcon },
];

// ✅ Navigation items for department heads
const headNavItems = [
  { name: 'Head Dashboard', path: '/head-dashboard', icon: HomeIcon },
  { name: 'All Files', path: '/all-files', icon: PaperAirplaneIcon },
  { name: 'Shared Files', path: '/shared-files', icon: ShareIcon },
  { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
  { name: 'Notifications', path: '/notifications', icon: EnvelopeIcon },
  { name: 'Important', path: '/important', icon: ArchiveBoxIcon },
  { name: 'Confidential', path: '/confidential', icon: ShieldCheckIcon },
  
];

const Sidebar = () => {
  const location = useLocation(); // ✅ Hook to get the current URL path
  const { user, getUserProfile } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile to determine position
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user, getUserProfile]);

  // Determine which navigation items to show based on user position
  const navItems = userProfile?.position === 'head' ? headNavItems : regularNavItems;

  if (loading) {
    return (
      <aside className="w-64 bg-white p-5 border-r border-gray-200 overflow-y-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white p-5 border-r border-gray-200 overflow-y-auto">
      <nav>
        <ul>
          {navItems.map((item) => {
            // ✅ Determine if the link is active by comparing its path to the current URL
            const isActive = location.pathname === item.path;

            return (
              <li key={item.name} className="mb-2">
                {/* ✅ Replaced <a> with <Link> */}
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
                    aria-hidden="true"
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