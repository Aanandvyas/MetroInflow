import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FolderIcon, PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recentFiles, setRecentFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [recentNotifications, setRecentNotifications] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecentFiles = async () => {
            setFilesLoading(true);
            let query = supabase
                .from('file')
                .select(`
                    f_uuid,
                    f_name,
                    language,
                    created_at,
                    department:d_uuid(
                        d_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (selectedDepartment) {
                query = query.eq('d_uuid', selectedDepartment);
            }
            if (selectedLanguage) {
                query = query.eq('language', selectedLanguage);
            }
            if (searchTerm) {
                query = query.ilike('f_name', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching recent files:', error);
                setRecentFiles([]);
            } else {
                setRecentFiles(data || []);
            }
            setFilesLoading(false);
        };
        fetchRecentFiles();
    }, [selectedDepartment, selectedLanguage, searchTerm]);

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

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from("file")
                .select("f_uuid, f_name, created_at")
                .order("created_at", { ascending: false })
                .limit(5);
            if (!error && data) {
                setRecentNotifications(data);
            }
        };
        fetchNotifications();
        // Optionally, poll every 30s for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 bg-gray-50/50">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
                <button 
                    onClick={() => navigate('/upload-document')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                    title="Under construction"
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
                            <Link key={dept.d_uuid} to={`/department/${dept.d_uuid}`} className="block" title="Under construction">
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition cursor-pointer group h-full">
                                    <div className="flex items-center justify-between">
                                        <FolderIcon className="h-8 w-8 text-blue-500 group-hover:text-blue-600" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-gray-800">{dept.d_name}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
            <section className="mt-12">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Files</h2>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    {filesLoading ? (
                        <div>Loading recent files...</div>
                    ) : recentFiles.length === 0 ? (
                        <div>No recent files found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {recentFiles.map((file, idx) => (
                                        <tr key={file.f_uuid + '-' + idx} className="hover:bg-gray-50 transition" title="Under construction">
                                            <td
                                                className="px-6 py-4 whitespace-nowrap flex items-center gap-3 cursor-pointer"
                                                onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                                                title="Under construction"
                                            >
                                                <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                                                <span className="font-medium text-blue-600 truncate max-w-xs hover:underline">
                                                    {file.f_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.department?.d_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.language || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                {file.created_at
                                                    ? new Date(file.created_at).toLocaleString()
                                                    : 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    className="text-white bg-blue-600 rounded px-3 py-1 text-sm font-medium hover:bg-blue-700"
                                                    onClick={() => window.open('/summary', 'noopener,noreferrer')}
                                                >
                                                    Summary
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
            <section className="mt-12">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Notifications</h2>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {recentNotifications.length === 0 ? (
                            <li className="py-4 text-gray-500">No notifications.</li>
                        ) : (
                            recentNotifications.map((file) => (
                                <li key={file.f_uuid} className="flex items-start gap-4 py-4" title="Under construction">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                                        <span className="h-5 w-5 text-blue-600 font-bold">✅</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-800">
                                            <span className="font-semibold">{file.f_name}</span> was added
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {file.created_at ? new Date(file.created_at).toLocaleString() : ""}
                                        </p>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </section>
        </div>
    );
}

export default HomePage;