import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const DepartmentFiles = () => {
    const { d_uuid } = useParams(); // Gets the department UUID from the URL
    const [files, setFiles] = useState([]);
    const [department, setDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDepartmentData = async () => {
            if (!d_uuid) return;
            setLoading(true);
            
            // Fetch department details (like its name)
            const { data: deptData, error: deptError } = await supabase
                .from('department')
                .select('d_name')
                .eq('d_uuid', d_uuid)
                .single();

            if (deptError) {
                setError('Could not fetch department details.');
                console.error(deptError);
            } else {
                setDepartment(deptData);
            }

            // Fetch files belonging to this department
            const { data: filesData, error: filesError } = await supabase
                .from('file')
                .select('f_uuid, f_name, language')
                .eq('d_uuid', d_uuid);

            if (filesError) {
                setError('Could not fetch files for this department.');
                console.error(filesError);
            } else {
                setFiles(filesData);
            }
            
            setLoading(false);
        };

        fetchDepartmentData();
    }, [d_uuid]);

    if (loading) {
        return <div className="p-8 text-center">Loading documents...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="p-8">
            <Link to="/" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-6">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
                {department ? department.d_name : 'Department'} Files
            </h1>
            
            {files.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {files.map(file => (
                        <div key={file.f_uuid} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-start">
                            <DocumentTextIcon className="h-10 w-10 text-indigo-500 mb-3" aria-hidden="true" />
                            <h3 className="font-semibold text-gray-800 truncate mb-1" title={file.f_name}>
                                {file.f_name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">{file.language}</p>
                            <div className="mt-auto flex space-x-2 w-full">
                                <button
                                    type="button"
                                    onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                                >
                                    View
                                </button>
                                <Link
                                    to="/summary"
                                    className="inline-block px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-800"
                                >
                                    Summary
                                </Link>
                                <Link
                                    to="/archive"
                                    className="inline-block px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-700"
                                >
                                    Archive
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700">No Documents Found</h2>
                    <p className="text-gray-500 mt-2">There are no files uploaded to this department yet.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentFiles;