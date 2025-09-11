import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Mock data - Replace with data fetched from your database
const mockAssignments = {
    '1': [{ title: 'Review Q2 Financial Report', assignedBy: 'Finance Dept.', color: 'bg-green-100 border-green-200' }],
    '4': [{ title: 'Submit Final Project Blueprints', assignedBy: 'Engineering Dept.', color: 'bg-red-100 border-red-200' }],
    '6': [{ title: 'Approve new remote work policy', assignedBy: 'HR Department', color: 'bg-blue-100 border-blue-200' }],
    '8': [{ title: 'Update server security protocols', assignedBy: 'IT Department', color: 'bg-yellow-100 border-yellow-200' }],
    '14': [{ title: 'Onboard new marketing intern', assignedBy: 'HR Department', color: 'bg-pink-100 border-pink-200' }],
    '18': [{ title: 'Resolve ticket #8872', assignedBy: 'Customer Relations', color: 'bg-pink-100 border-pink-200' }],
    '20': [{ title: 'Finalize vendor contract', assignedBy: 'Legal Department', color: 'bg-yellow-100 border-yellow-200' }],
    '23': [{ title: 'Prepare presentation for board meeting', assignedBy: 'Operations Dept.', color: 'bg-green-100 border-green-200' }],
    '26': [{ title: 'Audit end-of-year security logs', assignedBy: 'Security Department', color: 'bg-red-100 border-red-200' }],
    '29': [{ title: 'Pay invoice #INV-2025-09-012', assignedBy: 'Finance Dept.', color: 'bg-yellow-100 border-yellow-200' }],
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
const monthDays = Array.from({ length: 30 }, (_, i) => i + 1); // For a 30-day month

const AssignToMe = () => {
    return (
        <div className="p-8 bg-white rounded-lg shadow-md">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">September 2025</h1>
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <button className="px-4 py-2 text-sm font-semibold text-gray-700 border rounded-lg hover:bg-gray-50">
                        Today
                    </button>
                    <button className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px">
                {/* Day Headers */}
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 pb-2">
                        {day}
                    </div>
                ))}

                {/* Day Cells */}
                {monthDays.map(day => (
                    <div key={day} className="relative h-32 bg-white border-t border-l border-gray-200 p-2">
                        <span className="text-sm font-medium text-gray-700">{day}</span>
                        {mockAssignments[day] && (
                            <div className="mt-1 space-y-1">
                                {mockAssignments[day].map((assignment, index) => (
                                    <div 
                                        key={index}
                                        className={`p-2 rounded-md border text-xs cursor-pointer ${assignment.color}`}
                                    >
                                        <p className="font-semibold text-gray-800">{assignment.title}</p>
                                        <p className="text-gray-600">{assignment.assignedBy}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AssignToMe;