import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient.';
import { FolderIcon, PlusIcon, DocumentTextIcon, UserGroupIcon } from '@heroicons/react/24/outline';

// Mock data for notifications can remain for now
const recentNotifications = [
    { text: 'New policy on remote work updated by HR Department.', time: '2 hours ago', icon: DocumentTextIcon },
    { text: "Engineering Department shared 'Project Alpha Blueprints' with Public Relations.", time: '4 hours ago', icon: UserGroupIcon },
    { text: "Meeting invitation for 'Q2 Financial Review' sent by Finance Department.", time: '6 hours ago', icon: DocumentTextIcon },
];

const HomePage = () => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDepartments = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('department')
                .select('d_uuid, d_name');
            
            if (error) {
                console.error("Error fetching departments:", error);
            } else {
                setDepartments(data);
            }
            setLoading(false);
        };
        fetchDepartments();
    }, []);

    return (
        <div className="p-8 bg-gray-50/50">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
                <button 
                    onClick={() => navigate('/upload-document')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                >
                    <PlusIcon className="h-5 w-5" />
                    New
                </button>
            </div>
            
            <section>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Departments</h2>
                {loading ? (
                    <p>Loading departments...</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {departments.map((dept) => (
                            <Link key={dept.d_uuid} to={`/department/${dept.d_uuid}`} className="block">
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition cursor-pointer group h-full">
                                    <div className="flex items-center justify-between">
                                        <FolderIcon className="h-8 w-8 text-blue-500 group-hover:text-blue-600" />
                                        {/* Notification count would require a more complex query, so it's removed for now */}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-gray-800">{dept.d_name}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-12">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Notifications</h2>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {recentNotifications.map((notification, index) => (
                            <li key={index} className="flex items-start gap-4 py-4">
                                <div className="bg-gray-100 p-2 rounded-full mt-1">
                                    <notification.icon className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-gray-800">{notification.text}</p>
                                    <p className="text-sm text-gray-500 mt-1">{notification.time}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
};

export default HomePage;