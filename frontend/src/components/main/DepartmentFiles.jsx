import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DocumentTextIcon, ArrowLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import KebabMenu from '../assign-to-me/common/KebabMenu';
import { useAuth } from '../context/AuthContext';
import { markNotificationAsSeen } from '../../utils/notificationUtils';

const DepartmentFiles = () => {
    const { d_uuid } = useParams();
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [department, setDepartment] = useState(null);
    const [isOwnDepartment, setIsOwnDepartment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [impBusy, setImpBusy] = useState({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const btnRefs = useRef(new Map());
    const observer = useRef();
    const FILES_PER_PAGE = 12;

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
            setFiles((prev) => prev.map(f => f.f_uuid === f_uuid ? { ...f, is_favorite: true } : f));
        } catch (e) {
            console.error('Mark Important failed:', e);
        } finally {
            setImpBusy((s) => ({ ...s, [f_uuid]: false }));
            setOpenMenuId(null);
        }
    };

    // Handle file viewing
    const handleFileView = async (fileUuid) => {
        if (user?.id) {
            try {
                await markNotificationAsSeen(fileUuid, user.id);
            } catch (err) {
                console.error("Error marking notification as seen:", err);
            }
        }
        window.open(`/file/${fileUuid}`, "_blank", "noopener,noreferrer");
    };

    // Fetch department details
    useEffect(() => {
        const fetchDepartmentData = async () => {
            if (!d_uuid || !user?.id) return;
            
            try {
                // Get department info
                const { data: deptData, error: deptError } = await supabase
                    .from("department")
                    .select("d_name")
                    .eq("d_uuid", d_uuid)
                    .single();
                    
                if (deptError) {
                    console.error("Department fetch error:", deptError);
                    setError("Could not fetch department details.");
                    return;
                }
                
                // Get user's department to check if this is their own
                const { data: userProfile, error: userError } = await supabase
                    .from("users")
                    .select("d_uuid")
                    .eq("uuid", user.id)
                    .single();
                
                if (!userError && userProfile) {
                    setIsOwnDepartment(d_uuid === userProfile.d_uuid);
                }
                
                setDepartment(deptData);
            } catch (err) {
                console.error("Error fetching department:", err);
                setError("Could not fetch department details.");
            }
        };

        fetchDepartmentData();
    }, [d_uuid, user?.id]);

    // Fetch files with pagination - now supports collaboration files
    const fetchFiles = useCallback(async (pageNum = 1, append = false) => {
        if (!d_uuid || !user?.id) return;
        
        if (pageNum === 1) {
            setLoading(true);
            setError('');
        } else {
            setLoadingMore(true);
        }

        // Get current user's department and profile
        const { data: userProfile, error: userError } = await supabase
            .from("users")
            .select("d_uuid, position")
            .eq("uuid", user.id)
            .single();
            
        if (userError || !userProfile?.d_uuid) {
            setError("Could not determine your department.");
            setLoading(false);
            setLoadingMore(false);
            return;
        }

        const from = (pageNum - 1) * FILES_PER_PAGE;
        const to = from + FILES_PER_PAGE - 1;

        try {
            let filesData, filesError, count;

            if (d_uuid === userProfile.d_uuid) {
                // User's own department - show files uploaded by same department employees
                const result = await supabase
                    .from("file")
                    .select(`
                        f_uuid, f_name, language, file_path, created_at, uuid,
                        uploader:uuid(name, d_uuid),
                        file_department!inner (
                          d_uuid,
                          is_approved
                        )
                    `, { count: 'exact' })
                    .eq("file_department.d_uuid", userProfile.d_uuid)
                    .eq("uploader.d_uuid", userProfile.d_uuid)
                    .eq("file_department.is_approved", "approved")
                    .order("created_at", { ascending: false })
                    .range(from, to);
                    
                filesData = result.data;
                filesError = result.error;
                count = result.count;
            } else {
                // Other department folder - show approved collaboration files from that specific department
                const { data: collabData, error: collabError, count: collabCount } = await supabase
                    .from('file_department')
                    .select(`
                        fd_uuid,
                        f_uuid,
                        d_uuid,
                        is_approved,
                        created_at,
                        file:f_uuid (
                            f_uuid,
                            f_name,
                            language,
                            file_path,
                            created_at,
                            uuid,
                            users:uuid (
                                uuid,
                                name,
                                position,
                                d_uuid
                            )
                        )
                    `, { count: 'exact' })
                    .eq('d_uuid', userProfile.d_uuid) // Files received by user's department
                    .eq('is_approved', 'approved') // Only approved files
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (collabError) {
                    filesError = collabError;
                } else {
                    // Filter to only show files from the selected department
                    const filteredFiles = (collabData || [])
                        .filter(item => {
                            // Check if file was sent from the selected department
                            return item.file && item.file.users?.d_uuid === d_uuid;
                        })
                        .map(item => ({
                            // Map collaboration file structure to match regular file structure
                            f_uuid: item.file.f_uuid,
                            f_name: item.file.f_name,
                            language: item.file.language,
                            file_path: item.file.file_path,
                            created_at: item.created_at, // Use collaboration date
                            uuid: item.file.uuid,
                            uploader: {
                                name: item.file.users?.name,
                                d_uuid: item.file.users?.d_uuid
                            },
                            file_department: {
                                d_uuid: item.d_uuid,
                                is_approved: item.is_approved
                            },
                            // Additional collaboration info
                            fd_uuid: item.fd_uuid,
                            shared_at: item.created_at,
                            original_created_at: item.file.created_at,
                            sender_name: item.file.users?.name,
                            sender_position: item.file.users?.position,
                            is_collaboration: true
                        }));

                    filesData = filteredFiles;
                    count = filteredFiles.length; // Approximate count for filtered results
                }
            }

            if (filesError) {
                console.error("Files fetch error:", filesError);
                if (pageNum === 1) {
                    setError("Could not fetch files for this department.");
                }
                return;
            }

            // Check if there are more files to load
            const totalCount = count || 0;
            setHasMore(totalCount > to + 1);

            if (append) {
                setFiles(prev => [...prev, ...(filesData || [])]);
            } else {
                setFiles(filesData || []);
            }
        } catch (err) {
            console.error("Error fetching files:", err);
            if (pageNum === 1) {
                setError("Could not fetch files for this department.");
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [d_uuid, user?.id, FILES_PER_PAGE]);

    // Load more files when page changes
    const loadMoreFiles = useCallback(() => {
        if (hasMore && !loading && !loadingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFiles(nextPage, true);
        }
    }, [page, hasMore, loading, loadingMore, fetchFiles]);

    // Initial fetch and reset when department changes
    useEffect(() => {
        setPage(1);
        setFiles([]);
        setHasMore(true);
        setError('');
        fetchFiles(1, false);
    }, [d_uuid, fetchFiles]);

    // Set up intersection observer for infinite scroll
    const lastFileElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMoreFiles();
            }
        }, { threshold: 0.1 });
        
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, loadMoreFiles]);

    if (loading && page === 1) {
        return (
            <div className="p-8">
                <Link to="/" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-6">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <div className="text-center">Loading documents...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link to="/" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-6">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Dashboard
            </Link>
            
            {error ? (
                <div className="text-center text-red-500 mb-4">{error}</div>
            ) : null}
            
            <h1 className="text-3xl font-bold text-gray-800 mb-8">
                {isOwnDepartment 
                    ? `${department ? department.d_name : 'Department'} Files`
                    : `Files from ${department ? department.d_name : 'Department'}`
                }
            </h1>

            {files.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {files.map((file, index) => (
                            <div 
                                key={file.f_uuid} 
                                ref={index === files.length - 1 ? lastFileElementRef : null}
                                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-start"
                            >
                                <DocumentTextIcon className="h-10 w-10 text-indigo-500 mb-3" aria-hidden="true" />
                                <h3 className="font-semibold text-gray-800 truncate mb-1" title={file.f_name}>
                                    {file.f_name}
                                </h3>
                                <p className="text-sm text-gray-500 mb-2">{file.language}</p>
                                
                                {/* Show collaboration info if it's a shared file */}
                                {file.is_collaboration && (
                                    <div className="text-xs text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded">
                                        Shared by {file.sender_name}
                                        {file.sender_position === 'head' && ' (Department Head)'}
                                    </div>
                                )}
                                
                                {/* Show sharing date for collaboration files */}
                                {file.is_collaboration && file.shared_at && (
                                    <p className="text-xs text-gray-400 mb-2">
                                        Shared: {new Date(file.shared_at).toLocaleDateString()}
                                    </p>
                                )}
                                
                                <div className="mt-auto flex items-center gap-2 w-full">
                                    <button
                                        type="button"
                                        onClick={() => handleFileView(file.f_uuid)}
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
                    
                    {loadingMore && (
                        <div className="flex justify-center py-6 mt-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700">
                        {isOwnDepartment ? "No Documents Found" : "No Collaboration Files"}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {isOwnDepartment 
                            ? "There are no files uploaded by your department yet."
                            : `No approved files have been shared from ${department?.d_name || 'this department'} to your department yet.`
                        }
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {isOwnDepartment 
                            ? "Files uploaded by your department appear here automatically."
                            : `When the head of ${department?.d_name || 'this department'} shares files with your department and your department head approves them, they will appear here.`
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default DepartmentFiles;