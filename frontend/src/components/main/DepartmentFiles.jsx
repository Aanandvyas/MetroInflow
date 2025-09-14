import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DocumentTextIcon, ArrowLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import KebabMenu from '../assign-to-me/common/KebabMenu'; // adjust relative path if different
import { useAuth } from '../context/AuthContext';

const DepartmentFiles = () => {
    const { d_uuid } = useParams(); // Gets the department UUID from the URL
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [department, setDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [impBusy, setImpBusy] = useState({}); // <-- added
    const btnRefs = useRef(new Map());

    const setBtnRef = (id) => (el) => {
        const m = btnRefs.current;
        if (el) m.set(id, el);
        else m.delete(id);
    };

    // Mark Important
    const markImportant = async (f_uuid) => {
        if (!user?.id || !f_uuid || impBusy[f_uuid]) return;
        setImpBusy((s) => ({ ...s, [f_uuid]: true }));
        try {
            const { error } = await supabase
                .from('favorites')
                .upsert({ uuid: user.id, f_uuid }, { onConflict: 'uuid,f_uuid' });
            if (error) throw error;
            // Optional: reflect locally
            setFiles((prev) => prev.map(f => f.f_uuid === f_uuid ? { ...f, is_favorite: true } : f));
        } catch (e) {
            console.error('Mark Important failed:', e);
            alert('Could not mark Important. Please try again.');
        } finally {
            setImpBusy((s) => ({ ...s, [f_uuid]: false }));
            setOpenMenuId(null);
        }
    };

    useEffect(() => {
        const fetchDepartmentData = async () => {
            if (!d_uuid) return;
            setLoading(true);
            setError("");

            // Department details
            const { data: deptData, error: deptError } = await supabase
                .from("department")
                .select("d_name")
                .eq("d_uuid", d_uuid)
                .single();
            if (deptError) setError("Could not fetch department details.");
            setDepartment(deptData ?? null);

            // Files for this department through join table
            const { data: filesData, error: filesError } = await supabase
                .from("file")
                .select(`
                    f_uuid, f_name, language, file_path, created_at, uuid,
                    uploader:uuid(name),
                    file_department!inner (
                      d_uuid
                    )
                `)
                .eq("file_department.d_uuid", d_uuid)
                .order("created_at", { ascending: false });

            if (filesError) setError("Could not fetch files for this department.");
            setFiles(filesData ?? []);
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
                            <div className="mt-auto flex items-center gap-2 w-full">
                                <button
                                    type="button"
                                    onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                                >
                                    View
                                </button>

                                <button
                                    ref={setBtnRef(file.f_uuid)}
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={openMenuId === file.f_uuid}
                                    onClick={() => setOpenMenuId((p) => (p === file.f_uuid ? null : file.f_uuid))}
                                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600 ml-auto"
                                    title="More actions"
                                >
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                </button>

                                <KebabMenu
                                    open={openMenuId === file.f_uuid}
                                    anchorEl={btnRefs.current.get(file.f_uuid)}
                                    onClose={() => setOpenMenuId(null)}
                                >
                                    <Link
                                        to="/summary"
                                        role="menuitem"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => setOpenMenuId(null)}
                                    >
                                        Summary
                                    </Link>
                                    {/* Mark Important */}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => markImportant(file.f_uuid)}
                                        disabled={!file.f_uuid || !!impBusy[file.f_uuid]}
                                        className={`block w-full text-left px-4 py-2 text-sm ${
                                            impBusy[file.f_uuid]
                                                ? "text-gray-400 cursor-not-allowed"
                                                : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        Mark Important
                                    </button>
                                </KebabMenu>
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