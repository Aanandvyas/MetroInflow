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
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recentFiles, setRecentFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecentFiles = async () => {
            setFilesLoading(true);
            let query = supabase
                .from('file')
                .select(`
                    uuid,
                    f_name,
                    language,
                    department:d_uuid(
                        d_name
                    )
                `)
                .order('uuid', { ascending: true })
                .limit(20);

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
                {/* Filters and Search */}
                <div className="flex flex-wrap gap-4 mb-4">
                    <select
                        className="border rounded px-3 py-2"
                        value={selectedDepartment}
                        onChange={e => setSelectedDepartment(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept.d_uuid} value={dept.d_uuid}>{dept.d_name}</option>
                        ))}
                    </select>
                    <select
                        className="border rounded px-3 py-2"
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                    >
                        <option value="">All Languages</option>
                        {/* Unique language options from files */}
                        {[...new Set(recentFiles.map(f => f.language).filter(Boolean))].map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                    <input
                        className="border rounded px-3 py-2"
                        type="text"
                        placeholder="Search files by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {recentFiles.map((file, idx) => (
                                        <tr key={file.uuid + '-' + idx} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                                                <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                                                <span className="font-medium text-gray-800 truncate max-w-xs" title={file.f_name}>{file.f_name}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.department?.d_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.language || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* Example action: View file (customize as needed) */}
                                                <button className="text-blue-600 hover:underline text-sm font-medium" onClick={() => navigate(`/file/${file.uuid}`)}>
                                                    View
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
}

export default HomePage;