import React, { useState, useEffect } from 'react';
import {
    DocumentTextIcon,
    UserGroupIcon,
    ClockIcon,
    ChartBarIcon,
    ShareIcon,
    FolderIcon,
    BuildingOfficeIcon,
    PlusIcon,
    EllipsisHorizontalIcon,
    MagnifyingGlassIcon,
    BellIcon,
    ArrowUpTrayIcon,
    EyeIcon,
    DocumentArrowDownIcon,
    UsersIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    XMarkIcon,
    DocumentCheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';
import CollabFolders from './CollabFolders';

const HeadDashboard = () => {
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState({
        totalFiles: 0,
        activeUsers: 0,
        sharedFiles: 0,
        pendingTasks: 0
    });
    const [recentDocuments, setRecentDocuments] = useState([]);
    const [importantDocuments, setImportantDocuments] = useState([]);
    const [departmentFolders, setDepartmentFolders] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Upload modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [files, setFiles] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ message: "", type: "" });
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [loadingDepartments, setLoadingDepartments] = useState(true);

    // Horizontal scrolling states
    const [documentsScrollIndex, setDocumentsScrollIndex] = useState(0);
    const [foldersScrollIndex, setFoldersScrollIndex] = useState(0);
    const ITEMS_PER_VIEW = 4;

    // Fetch user profile and department data
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user) {
                try {
                    // Try different approaches for user profile
                    let userData = null;
                    
                    // Method 1: Try with department relation
                    try {
                        const { data, error } = await supabase
                            .from('users')
                            .select('*, department(*)')
                            .eq('id', user.id)
                            .single();
                        
                        if (!error && data) {
                            userData = data;
                        }
                    } catch (err) {
                        console.log('Method 1 failed, trying alternative...');
                    }

                    // Method 2: Try simple user query
                    if (!userData) {
                        try {
                            const { data, error } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', user.id)
                                .single();
                            
                            if (!error && data) {
                                userData = data;
                            }
                        } catch (err) {
                            console.log('Method 2 failed, using fallback...');
                        }
                    }

                    // Method 3: Create mock user profile
                    if (!userData) {
                        userData = {
                            id: user.id,
                            email: user.email,
                            department_id: 'mock-dept-1',
                            position: 'head',
                            full_name: user.email?.split('@')[0] || 'Department Head',
                            department: {
                                id: 'mock-dept-1',
                                d_name: 'Administration',
                                description: 'Administrative Department'
                            }
                        };
                    }

                    setUserProfile(userData);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    // Set fallback profile
                    setUserProfile({
                        id: user.id,
                        email: user.email,
                        department_id: 'fallback-dept',
                        position: 'head',
                        full_name: 'Department Head',
                        department: {
                            id: 'fallback-dept',
                            d_name: 'Administration'
                        }
                    });
                }
            }
        };

        fetchUserProfile();
    }, [user]);

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userProfile?.department_id) return;
            
            try {
                setLoading(true);
                const departmentId = userProfile.department_id;

                // Simplified queries with error handling
                try {
                    // Get user's department ID
                    const departmentId = userProfile.department_id;

                    // Fetch total files in department using proper relationships
                    const { data: departmentFiles, error: filesError } = await supabase
                        .from('file')
                        .select('f_uuid')
                        .eq('d_uuid', departmentId);

                    // Fetch active users in department
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('uuid')
                        .eq('d_uuid', departmentId);

                    // Fetch shared files (files that have been shared with this department)
                    const { data: notificationFilesData, error: sharedError } = await supabase
                        .from('notifications')
                        .select('f_uuid, file:f_uuid(f_name, created_at, users:uuid(name))')
                        .eq('uuid', user.id)
                        .eq('is_seen', false);

                    // Fetch pending notifications as tasks
                    const { data: pendingNotifications, error: notifError } = await supabase
                        .from('notifications')
                        .select('notif_id')
                        .eq('uuid', user.id)
                        .eq('is_seen', false);

                    // Set real stats
                    setDashboardStats({
                        totalFiles: departmentFiles?.length || 0,
                        activeUsers: usersData?.length || 0,
                        sharedFiles: notificationFilesData?.length || 0,
                        pendingTasks: pendingNotifications?.length || 0
                    });

                    // Fetch recent documents from file table
                    const { data: recentFiles, error: recentError } = await supabase
                        .from('file')
                        .select('f_uuid, f_name, created_at, language, users:uuid(name)')
                        .eq('d_uuid', departmentId)
                        .order('created_at', { ascending: false })
                        .limit(4);

                    if (recentFiles && recentFiles.length > 0) {
                        setRecentDocuments(recentFiles);
                    } else {
                        setRecentDocuments([]);
                    }

                    // Fetch real shared files - files shared WITH this department FROM other departments
                    const { data: sharedFilesData, error: sharedFilesError } = await supabase
                        .from('file_department')
                        .select(`
                            f_uuid,
                            created_at,
                            status,
                            file:f_uuid (
                                f_name,
                                created_at,
                                d_uuid,
                                users:uuid (
                                    name,
                                    d_uuid,
                                    department:d_uuid (
                                        d_name
                                    )
                                )
                            )
                        `)
                        .eq('d_uuid', departmentId)
                        .order('created_at', { ascending: false });

                    if (sharedFilesData && sharedFilesData.length > 0) {
                        // Filter out self-shares (files uploaded by the same department)
                        const externalShares = sharedFilesData.filter(item => {
                            const uploaderDepartment = item.file?.users?.d_uuid;
                            const targetDepartment = departmentId;
                            
                            // Only include if uploader is from a different department
                            return uploaderDepartment && uploaderDepartment !== targetDepartment;
                        });

                        // Separate pending and approved files
                        const pendingFilesList = externalShares
                            .filter(item => !item.status || item.status === 'pending')
                            .map((item) => ({
                                id: item.f_uuid,
                                name: item.file?.f_name || 'Unknown File',
                                sharedBy: item.file?.users?.name || 'Unknown User',
                                dateShared: new Date(item.created_at).toLocaleDateString(),
                                status: 'Pending',
                                uploaderDepartment: item.file?.users?.d_uuid,
                                fromDepartment: item.file?.users?.department?.d_name || 'Unknown Department'
                            }));

                        const approvedFilesList = externalShares
                            .filter(item => item.status === 'approved')
                            .map((item) => ({
                                id: item.f_uuid,
                                name: item.file?.f_name || 'Unknown File',
                                sharedBy: item.file?.users?.name || 'Unknown User',
                                dateShared: new Date(item.created_at).toLocaleDateString(),
                                status: 'Approved',
                                uploaderDepartment: item.file?.users?.d_uuid,
                                fromDepartment: item.file?.users?.department?.d_name || 'Unknown Department'
                            }));

                        setPendingFiles(pendingFilesList);
                        setSharedFiles(approvedFilesList);
                    } else {
                        setPendingFiles([]);
                        setSharedFiles([]);
                    }

                } catch (dbError) {
                    console.error('Database query error:', dbError);
                    // Set empty arrays if database queries fail
                    setDashboardStats({
                        totalFiles: 0,
                        activeUsers: 0,
                        sharedFiles: 0,
                        pendingTasks: 0
                    });

                    setRecentDocuments([]);
                    setSharedFiles([]);
                }

                // Fetch real departments and their file counts
                try {
                    const { data: allDepartments, error: deptError } = await supabase
                        .from('department')
                        .select('d_uuid, d_name');

                    if (allDepartments && allDepartments.length > 0) {
                        // Get file counts for each department
                        const departmentWithCounts = await Promise.all(
                            allDepartments.map(async (dept) => {
                                const { count, error } = await supabase
                                    .from('file')
                                    .select('f_uuid', { count: 'exact' })
                                    .eq('d_uuid', dept.d_uuid);

                                return {
                                    id: dept.d_uuid,
                                    name: dept.d_name,
                                    description: `Files and documents for ${dept.d_name}`,
                                    icon: <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />,
                                    count: count || 0
                                };
                            })
                        );

                        setDepartmentFolders(departmentWithCounts);
                    } else {
                        setDepartmentFolders([]);
                    }
                } catch (deptError) {
                    console.error('Error fetching departments:', deptError);
                    setDepartmentFolders([]);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                // Set empty data on error instead of mock data
                setDashboardStats({
                    totalFiles: 0,
                    activeUsers: 0,
                    sharedFiles: 0,
                    pendingTasks: 0
                });

                setRecentDocuments([]);
                setSharedFiles([]);
                setDepartmentFolders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [userProfile]);

    // Fetch departments for upload modal
    useEffect(() => {
        const fetchDepartments = async () => {
            const { data, error } = await supabase
                .from("department")
                .select("d_uuid, d_name");
            if (error) {
                console.error("Could not load departments:", error);
            } else {
                setDepartments(data || []);
            }
            setLoadingDepartments(false);
        };
        fetchDepartments();
    }, []);

    // Fetch top 10 important-marked documents for the current user
    useEffect(() => {
        const fetchImportantDocuments = async () => {
            if (!user?.id) return;
            try {
                // Get favorite documents for this user, newest first
                const { data: favoriteData, error: favoriteError } = await supabase
                    .from('favorites')
                    .select('f_uuid, created_at')
                    .eq('uuid', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (favoriteError) throw favoriteError;

                if (!favoriteData || favoriteData.length === 0) {
                    setImportantDocuments([]);
                    return;
                }

                // Get the file UUIDs from favorites
                const ids = favoriteData.map(fav => fav.f_uuid);                // Fetch file metadata for these ids
                const { data: filesData, error: filesError } = await supabase
                    .from('file')
                    .select('f_uuid, f_name, created_at')
                    .in('f_uuid', ids);

                if (filesError) throw filesError;

                // Order files according to favorites recency
                const byId = new Map((filesData || []).map(f => [f.f_uuid, f]));
                const ordered = ids
                    .map(id => byId.get(id))
                    .filter(Boolean);

                setImportantDocuments(ordered);
            } catch (e) {
                console.error('Error fetching favorite documents:', e);
                setImportantDocuments([]);
            }
        };

        fetchImportantDocuments();
    }, [user?.id]);

    // Ensure scroll index stays within bounds when important documents change
    useEffect(() => {
        setDocumentsScrollIndex(prev => {
            const maxIndex = Math.max(0, importantDocuments.length - ITEMS_PER_VIEW);
            return Math.min(prev, maxIndex);
        });
    }, [importantDocuments.length]);

    // Upload functionality
    const mergeFiles = (current, incoming) => {
        const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
        const map = new Map(current.map((f) => [key(f), f]));
        incoming.forEach((f) => map.set(key(f), f));
        return Array.from(map.values());
    };

    const handleFileChange = (e) => {
        const list = Array.from(e.target.files || []);
        if (list.length === 0) return;
        setFiles((prev) => mergeFiles(prev, list));
        setUploadStatus({ message: "", type: "" });
        e.target.value = "";
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const list = Array.from(e.dataTransfer.files || []);
        if (list.length > 0) {
            const newFiles = mergeFiles(files, list);
            setFiles(newFiles);
            
            // Clear title if multiple files are selected
            if (newFiles.length > 1) {
                setTitle("");
            }
            
            setUploadStatus({ message: "", type: "" });
        }
    };

    const removeFileAt = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // Additional function aliases for modal compatibility
    const handleFileSelect = (e) => {
        const list = Array.from(e.target.files || []);
        if (list.length === 0) return;
        const newFiles = mergeFiles(files, list);
        setFiles(newFiles);
        
        // Clear title if multiple files are selected
        if (newFiles.length > 1) {
            setTitle("");
        }
        
        setUploadStatus({ message: "", type: "" });
        e.target.value = "";
    };

    const removeFile = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        
        // If removing files results in only one file, user can edit title again
        // Title remains cleared for them to optionally set
    };

    const filteredDepartments = departments.filter(dept => 
        dept && dept.d_name && 
        dept.d_name.toLowerCase().includes(departmentSearch.toLowerCase()) &&
        !selectedDepartments.find(selected => selected.d_uuid === dept.d_uuid)
    );

    const addDepartment = (dept) => {
        setSelectedDepartments(prev => [...prev, dept]);
        setDepartmentSearch('');
    };

    const removeDepartment = (deptId) => {
        setSelectedDepartments(prev => 
            prev.filter(dept => dept.d_uuid !== deptId)
        );
    };

    // Horizontal scrolling navigation functions
    const scrollDocumentsLeft = () => {
        setDocumentsScrollIndex(prev => Math.max(0, prev - 1));
    };

    const scrollDocumentsRight = () => {
        const maxIndex = Math.max(0, importantDocuments.length - ITEMS_PER_VIEW);
        setDocumentsScrollIndex(prev => Math.min(maxIndex, prev + 1));
    };

    const scrollFoldersLeft = () => {
        setFoldersScrollIndex(prev => Math.max(0, prev - 1));
    };

    const scrollFoldersRight = () => {
        const maxIndex = Math.max(0, departmentFolders.length - ITEMS_PER_VIEW);
        setFoldersScrollIndex(prev => Math.min(maxIndex, prev + 1));
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setUploadStatus({ message: "You must be logged in to upload.", type: "error" });
            return;
        }
        if (files.length === 0 || selectedDepartments.length === 0 || !language) {
            setUploadStatus({
                message: "Please choose file(s), language and at least one department.",
                type: "error",
            });
            return;
        }

        setUploading(true);
        setUploadStatus({ message: "Uploading document(s)...", type: "loading" });

        try {
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("uuid")
                .eq("uuid", user.id)
                .single();
            
            if (userError || !userData) {
                throw new Error(userError?.message || "Could not find user profile.");
            }

            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const fileName = `${Date.now()}_${i}_${f.name}`;
                const filePath = `shared/${fileName}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase
                    .storage
                    .from("file_storage")
                    .upload(filePath, f, {
                        upsert: false,
                        contentType: f.type || undefined,
                    });
                
                if (uploadError) throw uploadError;

                // Insert into file table
                const displayName = files.length === 1 && title.trim().length > 0 ? title.trim() : f.name;

                const { data: insertedFile, error: insertFileError } = await supabase
                    .from("file")
                    .insert({
                        f_name: displayName,
                        language,
                        uuid: userData.uuid,
                        file_path: filePath,
                        created_at: new Date().toISOString(),
                    })
                    .select("f_uuid")
                    .single();
                
                if (insertFileError) throw insertFileError;

                // Link to departments
                const joinRows = selectedDepartments.map((dept) => ({
                    f_uuid: insertedFile.f_uuid,
                    d_uuid: dept.d_uuid,
                    created_at: new Date().toISOString(),
                }));
                
                const { error: joinError } = await supabase
                    .from("file_department")
                    .insert(joinRows);
                
                if (joinError) throw joinError;

                // Notify users in departments
                const { data: usersInDepartments, error: usersError } = await supabase
                    .from("users")
                    .select("uuid")
                    .in("d_uuid", selectedDepartments.map(d => d.d_uuid));

                if (usersInDepartments && usersInDepartments.length > 0) {
                    const notificationRows = usersInDepartments.map(u => ({
                        uuid: u.uuid,
                        f_uuid: insertedFile.f_uuid,
                        is_seen: false,
                        created_at: new Date().toISOString(),
                    }));
                    await supabase.from("notifications").insert(notificationRows);
                }
            }

            // Send all files to backend for processing in a single request
            try {
                const formData = new FormData();
                
                // Add all files
                files.forEach((file) => {
                    formData.append("files", file);
                });
                
                // Add metadata
                formData.append("title", title.trim() || files[0]?.name || "Untitled Document");
                formData.append("language", language);
                
                // Add department UUIDs as comma-separated string
                const departmentUuids = selectedDepartments.map(dept => dept.d_uuid).join(",");
                if (departmentUuids) {
                    formData.append("d_uuids", departmentUuids);
                }

                const response = await fetch(
                    process.env.SUMMARY_BACKEND_URL || "http://localhost:8080/v1/documents",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

                if (!response.ok) {
                    console.error("Backend summary request failed.");
                }
            } catch (backendErr) {
                console.error("Error sending files to summary backend:", backendErr);
            }

            setUploadStatus({
                message: "Upload successful!",
                type: "success",
            });

            // Reset form
            setFiles([]);
            setSelectedDepartments([]);
            setTitle("");
            setLanguage("");
            setDepartmentSearch("");

            // Close modal after a short delay
            setTimeout(() => {
                setShowUploadModal(false);
                setUploadStatus({ message: "", type: "" });
                // Refresh dashboard data
                window.location.reload();
            }, 1500);

        } catch (error) {
            setUploadStatus({ message: `Upload failed: ${error.message}`, type: "error" });
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileTypeIcon = (filename) => {
        const extension = filename?.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return <DocumentTextIcon className="h-6 w-6 text-red-500" />;
            case 'doc':
            case 'docx':
                return <DocumentTextIcon className="h-6 w-6 text-blue-500" />;
            case 'xls':
            case 'xlsx':
                return <DocumentTextIcon className="h-6 w-6 text-green-500" />;
            default:
                return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
        }
    };

    // Upload Modal Component
    const UploadModal = () => {
        if (!showUploadModal) return null;

        const isMultiFile = files.length > 1;

        const renderDepartmentSelect = () => (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Departments
                </label>
                
                {/* Selected departments */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedDepartments.map(dept => (
                        <span 
                            key={dept.d_uuid}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                        >
                            {dept.d_name}
                            <button
                                type="button"
                                onClick={() => removeDepartment(dept.d_uuid)}
                                className="ml-2 text-blue-500 hover:text-blue-700"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>

                {/* Department search input */}
                <div className="relative">
                    <input
                        type="text"
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        placeholder="Search departments..."
                        className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    
                    {/* Dropdown for filtered departments */}
                    {departmentSearch && filteredDepartments.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                            {filteredDepartments.map(dept => (
                                <button
                                    key={dept.d_uuid}
                                    type="button"
                                    onClick={() => addDepartment(dept)}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                                >
                                    {dept.d_name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <ArrowUpTrayIcon className="h-8 w-8 text-blue-500" />
                            <h2 className="text-xl font-semibold text-gray-900">Upload New Document</h2>
                        </div>
                        <button 
                            onClick={() => setShowUploadModal(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Modal Content */}
                    <div className="p-6 max-h-96 overflow-y-auto">
                        <form onSubmit={handleUploadSubmit} className="space-y-6">
                            {/* File Input Area */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Document File(s)
                                </label>

                                <div
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-md transition-colors ${
                                        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                                    }`}
                                >
                                    <div className="space-y-3 w-full max-w-xl">
                                        <input
                                            id="modal-file-input"
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />

                                        {files.length === 0 ? (
                                            <div className="text-center">
                                                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                                                <div className="flex justify-center text-sm text-gray-600">
                                                    <label
                                                        htmlFor="modal-file-input"
                                                        className="cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                                                    >
                                                        <span>Click to upload</span>
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">PDF, DOCX, PNG, etc.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-semibold text-gray-700">
                                                        {files.length} file{files.length > 1 ? "s" : ""} selected
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById("modal-file-input")?.click()}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                        title="Add more files"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <ul className="mt-2 space-y-2 max-h-40 overflow-auto">
                                                    {files.map((f, idx) => (
                                                        <li
                                                            key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                                                            className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm text-gray-800" title={f.name}>
                                                                    {f.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {(f.size / 1024).toFixed(2)} KB
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFileAt(idx)}
                                                                className="ml-3 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                                                                title="Remove file"
                                                            >
                                                                ×
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="modal-title" className="block text-sm font-medium text-gray-700">
                                        Document Title
                                    </label>
                                    <input
                                        type="text"
                                        id="modal-title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={isMultiFile}
                                        className={`mt-1 w-full p-3 border border-gray-300 rounded-lg ${
                                            isMultiFile ? "bg-gray-100 cursor-not-allowed" : ""
                                        }`}
                                        placeholder={
                                            isMultiFile
                                                ? "Using each file name as the document title"
                                                : "Optional: enter a title (default is filename)"
                                        }
                                    />
                                </div>
                                <div>
                                    <label htmlFor="modal-language" className="block text-sm font-medium text-gray-700">
                                        Language
                                    </label>
                                    <select
                                        id="modal-language"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        required
                                        className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
                                    >
                                        <option value="" disabled>Select a language</option>
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Malayalam">Malayalam</option>
                                    </select>
                                </div>
                            </div>

                            {renderDepartmentSelect()}

                            {/* Status Message */}
                            {uploadStatus.message && (
                                <div className={`p-3 rounded-lg ${
                                    uploadStatus.type === "success"
                                        ? "bg-green-100 text-green-700"
                                        : uploadStatus.type === "error"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}>
                                    {uploadStatus.message}
                                </div>
                            )}
                        </form>
                    </div>
                    
                    {/* Modal Actions */}
                    <div className="flex items-center justify-end p-6 border-t border-gray-200 space-x-3">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUploadSubmit}
                            disabled={uploading || loadingDepartments}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        >
                            {uploading ? "Uploading..." : "Upload & Save"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Approval functions for pending files
    const handleApproveFile = async (fileId) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ status: 'approved' })
                .eq('f_uuid', fileId)
                .eq('d_uuid', userProfile?.department_id);

            if (error) throw error;

            // Move file from pending to shared files
            setPendingFiles(prev => prev.filter(file => file.id !== fileId));
            
            // Refresh shared files to include the newly approved file
            const approvedFile = pendingFiles.find(file => file.id === fileId);
            if (approvedFile) {
                setSharedFiles(prev => [...prev, { ...approvedFile, status: 'Approved' }]);
            }

            // Show success message
            alert('File approved successfully!');
        } catch (error) {
            console.error('Error approving file:', error);
            alert('Error approving file. Please try again.');
        }
    };

    const handleRejectFile = async (fileId) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ status: 'rejected' })
                .eq('f_uuid', fileId)
                .eq('d_uuid', userProfile?.department_id);

            if (error) throw error;

            // Remove file from pending files
            setPendingFiles(prev => prev.filter(file => file.id !== fileId));

            // Show success message
            alert('File rejected successfully!');
        } catch (error) {
            console.error('Error rejecting file:', error);
            alert('Error rejecting file. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            

            <div className="p-6">
                {/* Dashboard Title */}
                <div className="mb-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">DH Dashboard</h1>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        Upload Document
                    </button>
                </div>

                {/* Relevant Documents Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Relevant Documents</h2>
                        {importantDocuments.length > ITEMS_PER_VIEW && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={scrollDocumentsLeft}
                                    disabled={documentsScrollIndex === 0}
                                    className={`p-2 rounded-full border ${
                                        documentsScrollIndex === 0 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={scrollDocumentsRight}
                                    disabled={documentsScrollIndex >= importantDocuments.length - ITEMS_PER_VIEW}
                                    className={`p-2 rounded-full border ${
                                        documentsScrollIndex >= importantDocuments.length - ITEMS_PER_VIEW
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                                >
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {importantDocuments
                            .slice(documentsScrollIndex, documentsScrollIndex + ITEMS_PER_VIEW)
                            .map((doc, index) => {
                                const actualIndex = documentsScrollIndex + index;
                                const titles = ['Project Plans', 'Operational Guidelines', 'HR Policies', 'Budget Reports'];
                                const descriptions = [
                                    'Access all ongoing project documents',
                                    'Standard operating procedures',
                                    'Human resources related documents',
                                    'Quarterly and annual financial reports'
                                ];
                                const icons = [
                                    <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />,
                                    <DocumentTextIcon className="h-8 w-8 text-teal-500" />,
                                    <UsersIcon className="h-8 w-8 text-purple-500" />,
                                    <ChartBarIcon className="h-8 w-8 text-green-500" />
                                ];
                                
                                return (
                                    <div key={doc.f_uuid || actualIndex} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            {icons[actualIndex % icons.length]}
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <EllipsisHorizontalIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-2">
                                            {actualIndex < titles.length ? titles[actualIndex] : doc.f_name}
                                        </h3>
                                        <p className="text-sm text-gray-600">
    
                                            {actualIndex < descriptions.length ? descriptions[actualIndex] : `Document: ${doc.f_name}`}
                                        </p>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Collab Folders Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Collab Folders</h2>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        {/* Head collab folders: received and sent with status and actions */}
                        <CollabFolders />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Quick Share */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Share</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">By Department</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                        <option>Select Department</option>
                                        <option>Operations</option>
                                        <option>Finance</option>
                                        <option>HR</option>
                                        <option>Marketing</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Train Operations</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                        <option>Select Operation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select file to share</label>
                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                        <option>Choose file</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Add a personal message...</label>
                                    <textarea 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 h-20"
                                        placeholder="Add a personal message..."
                                    ></textarea>
                                </div>
                                <button className="w-full bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg font-medium">
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Shared Files */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Shared Files</h2>
                                {sharedFiles.length > 5 && (
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {sharedFiles.length} files • Scroll to see more
                                    </span>
                                )}
                            </div>
                            
                            {sharedFiles.length > 0 ? (
                                <div className={`overflow-x-auto ${sharedFiles.length > 5 ? 'max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100' : ''}`}>
                                    <table className="min-w-full">
                                        <thead className="sticky top-0 bg-white">
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">File Name</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">Shared By</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">From Department</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">Date Shared</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sharedFiles.map((file) => (
                                                <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center space-x-3">
                                                            {getFileTypeIcon(file.name)}
                                                            <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">{file.sharedBy}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                            {file.fromDepartment}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">{file.dateShared}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            file.status === 'Done' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {file.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium">
                                                            Summary
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <DocumentArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">No shared files found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Upload Form */}
                            <form onSubmit={handleUploadSubmit} className="space-y-6">
                                {/* Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Document Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={files.length > 1}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            files.length > 1 ? 'bg-gray-100 cursor-not-allowed' : ''
                                        }`}
                                        placeholder={files.length > 1 ? "Multiple files - using individual file names" : "Enter document title"}
                                        required={files.length === 1}
                                    />
                                    {files.length > 1 && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            When multiple files are selected, each file will use its own filename as the title
                                        </p>
                                    )}
                                </div>

                                {/* Language Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Language
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select Language</option>
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Urdu">Urdu</option>
                                        <option value="Bengali">Bengali</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Telugu">Telugu</option>
                                        <option value="Marathi">Marathi</option>
                                        <option value="Gujarati">Gujarati</option>
                                        <option value="Kannada">Kannada</option>
                                        <option value="Malayalam">Malayalam</option>
                                        <option value="Punjabi">Punjabi</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* File Upload Area */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Files
                                    </label>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-6 text-center ${
                                            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                        }`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="file-upload"
                                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-lg font-medium text-gray-900 mb-2">
                                                Drop files here or click to browse
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Supports: PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB each)
                                            </p>
                                        </label>
                                    </div>

                                    {/* Selected Files */}
                                    {files.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                Selected Files ({files.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {files.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <div className="flex items-center">
                                                            <DocumentCheckIcon className="h-4 w-4 text-green-500 mr-2" />
                                                            <span className="text-sm text-gray-700">{file.name}</span>
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <XMarkIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Department Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Share with Departments
                                    </label>
                                    
                                    {/* Department Search */}
                                    <div className="relative mb-3">
                                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search departments..."
                                            value={departmentSearch}
                                            onChange={(e) => setDepartmentSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Department List */}
                                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                                        {loadingDepartments ? (
                                            <div className="p-4 text-center text-gray-500">Loading departments...</div>
                                        ) : (
                                            filteredDepartments.map((dept) => (
                                                <label key={dept.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDepartments.some(d => d.d_uuid === dept.d_uuid)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedDepartments([...selectedDepartments, dept]);
                                                            } else {
                                                                setSelectedDepartments(selectedDepartments.filter(d => d.d_uuid !== dept.d_uuid));
                                                            }
                                                        }}
                                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">{dept.d_name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>

                                    {/* Selected Departments */}
                                    {selectedDepartments.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-medium text-gray-700 mb-2">
                                                Selected ({selectedDepartments.length}):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedDepartments.map((dept) => (
                                                    <span
                                                        key={dept.d_uuid}
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {dept.d_name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDepartments(selectedDepartments.filter(d => d.d_uuid !== dept.d_uuid))}
                                                            className="ml-1 text-blue-600 hover:text-blue-800"
                                                        >
                                                            <XMarkIcon className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Status Message */}
                                {uploadStatus.message && (
                                    <div className={`p-3 rounded-md ${
                                        uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                    }`}>
                                        {uploadStatus.message}
                                    </div>
                                )}

                                {/* Submit Buttons */}
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading || files.length === 0}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                                                Upload Files
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeadDashboard;