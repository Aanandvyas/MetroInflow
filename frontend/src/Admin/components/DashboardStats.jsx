import React from 'react';
import { UsersIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const DashboardStats = ({ users, departments }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Total Users</h3>
          <UsersIcon className="h-8 w-8 text-indigo-500" />
        </div>
        <p className="text-3xl font-bold mt-2">{users.length}</p>
        <p className="text-sm text-gray-500 mt-1">Registered users</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Departments</h3>
          <DocumentTextIcon className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-3xl font-bold mt-2">{departments.length}</p>
        <p className="text-sm text-gray-500 mt-1">Active departments</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Recent Updates</h3>
          <ChartBarIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="mt-2">
          <p className="text-sm text-gray-500">No recent updates</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;