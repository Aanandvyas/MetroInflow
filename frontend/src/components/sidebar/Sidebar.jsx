import React from 'react';
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

const navItems = [
  { name: 'Dashboard', icon: HomeIcon, current: true },
  { name: 'Shared with me', icon: UsersIcon, current: false },
  { name: 'Recent', icon: ClockIcon, current: false },
  { name: 'Correspondant', icon: PaperAirplaneIcon, current: false },
  { name: 'Tags', icon: TagIcon, current: false },
  { name: 'Mails', icon: EnvelopeIcon, current: false },
  { name: 'Custom Fields', icon: CogIcon, current: false },
  { name: 'Document Types', icon: DocumentDuplicateIcon, current: false },
  { name: 'Archive', icon: ArchiveBoxIcon, current: false },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white p-5 border-r border-gray-200 overflow-y-auto">
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.name} className="mb-2">
              <a
                href="#"
                className={`flex items-center p-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon
                  className={`h-6 w-6 mr-3 ${
                    item.current ? 'text-blue-600' : 'text-gray-500'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
