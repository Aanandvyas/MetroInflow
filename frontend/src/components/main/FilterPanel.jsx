
import React, { useState, useEffect } from 'react';
import { useFilter } from '../context/FilterContext';
import { supabase } from '../../supabaseClient';
import { XMarkIcon } from '@heroicons/react/24/solid';

const FilterPanel = () => {
    const { 
        showFilterPanel, 
        setShowFilterPanel,
        selectedDepartment,
        setSelectedDepartment,
        selectedUser,
        setSelectedUser,
        dateRange,
        setDateRange,
        clearFilters,
    } = useFilter();

    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            try {
                const { data: deptData, error: deptErr } = await supabase.from('department').select('d_uuid, d_name');
                if (deptErr) throw deptErr;
                const { data: userData, error: userErr } = await supabase.from('users').select('uuid, name');
                if (userErr) throw userErr;
                if (mounted) {
                    setDepartments(deptData || []);
                    setUsers(userData || []);
                }
            } catch (err) {
                console.error('FilterPanel fetch error:', err);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, []);

    const handleDateChange = (e, field) => {
        setDateRange(prev => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-30 z-30 transition-opacity ${showFilterPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowFilterPanel(false)}
        >
            <div
                className={`fixed inset-y-0 left-0 bg-white w-80 shadow-lg p-6 transform transition-transform duration-300 ease-in-out z-40 ${showFilterPanel ? 'translate-x-0' : '-translate-x-full'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-hidden={!showFilterPanel}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Filters</h2>
                    <button onClick={() => setShowFilterPanel(false)} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    <div>
                        <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700">Department</label>
                        <select
                            id="department-filter"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-md"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.d_uuid} value={dept.d_uuid}>{dept.d_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">User</label>
                        <select
                            id="user-filter"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="mt-1 w-full p-2 border rounded-md"
                        >
                            <option value="all">All Users</option>
                            {users.map(user => (
                                <option key={user.uuid} value={user.uuid}>{user.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date Range</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="date"
                                value={dateRange.from || ''}
                                onChange={(e) => handleDateChange(e, 'from')}
                                className="w-full p-2 border rounded-md"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                value={dateRange.to || ''}
                                onChange={(e) => handleDateChange(e, 'to')}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={() => { clearFilters(); setShowFilterPanel(false); }}
                            className="text-sm text-gray-600 hover:text-black"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setShowFilterPanel(false)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;
