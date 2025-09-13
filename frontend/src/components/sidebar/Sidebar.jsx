import React from 'react';
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
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// ✅ Added a 'path' property to each navigation item
const navItems = [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  { name: 'Assigned to me', path: '/assigned-to-me', icon: UsersIcon },
  { name: 'All Files', path: '/all-files', icon: PaperAirplaneIcon },
  { name: 'Mails', path: '/mails', icon: EnvelopeIcon },
  { name: 'Favourite', path: '/favourite', icon: ArchiveBoxIcon },
];

const Sidebar = () => {
  const location = useLocation(); // ✅ Hook to get the current URL path

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