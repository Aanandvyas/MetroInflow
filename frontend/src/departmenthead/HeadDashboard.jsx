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
    DocumentCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';

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
    const [departmentFolders, setDepartmentFolders] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
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
                    // Fetch total files in department (try different field names)
                    const { data: filesData, error: filesError } = await supabase
                        .from('file')
                        .select('*')
                        .or(`department_id.eq.${departmentId},d_uuid.eq.${departmentId}`);

                    // Fetch active users in department
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('*')
                        .or(`department_id.eq.${departmentId},d_uuid.eq.${departmentId}`);

                    // Set basic stats with fallback values
                    setDashboardStats({
                        totalFiles: filesData?.length || 0,
                        activeUsers: usersData?.length || 0,
                        sharedFiles: Math.floor(Math.random() * 20) + 5, // Mock for now
                        pendingTasks: Math.floor(Math.random() * 50) + 10
                    });

                    // Set recent documents with mock data if no real data
                    if (filesData && filesData.length > 0) {
                        setRecentDocuments(filesData.slice(0, 4));
                    } else {
                        // Mock recent documents
                        setRecentDocuments([
                            { f_uuid: '1', f_name: 'Project_Plan_Q3.pdf', created_at: new Date().toISOString() },
                            { f_uuid: '2', f_name: 'Operations_Manual.docx', created_at: new Date().toISOString() },
                            { f_uuid: '3', f_name: 'HR_Policies_2024.pdf', created_at: new Date().toISOString() },
                            { f_uuid: '4', f_name: 'Budget_Report.xlsx', created_at: new Date().toISOString() }
                        ]);
                    }

                    // Mock shared files for the table
                    setSharedFiles([
                        {
                            id: '1',
                            name: 'Q3_Performance_Report.pdf',
                            sharedBy: 'Alice Brown',
                            dateShared: '2024-03-15',
                            status: 'Done'
                        },
                        {
                            id: '2',
                            name: 'Project_Apollo_Brief.docx',
                            sharedBy: 'John Doe',
                            dateShared: '2024-03-12',
                            status: 'Pending'
                        },
                        {
                            id: '3',
                            name: 'Team_Meeting_Minutes.pptx',
                            sharedBy: 'Jane Smith',
                            dateShared: '2024-03-10',
                            status: 'Done'
                        },
                        {
                            id: '4',
                            name: 'Marketing_Campaign_Plan.xlsx',
                            sharedBy: 'Robert Johnson',
                            dateShared: '2024-03-08',
                            status: 'Pending'
                        },
                        {
                            id: '5',
                            name: 'Vendor_Contract_Review.pdf',
                            sharedBy: 'Emily White',
                            dateShared: '2024-03-06',
                            status: 'Done'
                        }
                    ]);

                } catch (dbError) {
                    console.error('Database query error:', dbError);
                    // Set mock data if database queries fail
                    setDashboardStats({
                        totalFiles: 24,
                        activeUsers: 18,
                        sharedFiles: 12,
                        pendingTasks: 37
                    });

                    setRecentDocuments([
                        { f_uuid: '1', f_name: 'Project_Plan_Q3.pdf', created_at: new Date().toISOString() },
                        { f_uuid: '2', f_name: 'Operations_Manual.docx', created_at: new Date().toISOString() },
                        { f_uuid: '3', f_name: 'HR_Policies_2024.pdf', created_at: new Date().toISOString() },
                        { f_uuid: '4', f_name: 'Budget_Report.xlsx', created_at: new Date().toISOString() }
                    ]);

                    setSharedFiles([
                        {
                            id: '1',
                            name: 'Q3_Performance_Report.pdf',
                            sharedBy: 'Alice Brown',
                            dateShared: '2024-03-15',
                            status: 'Done'
                        },
                        {
                            id: '2',
                            name: 'Project_Apollo_Brief.docx',
                            sharedBy: 'John Doe',
                            dateShared: '2024-03-12',
                            status: 'Pending'
                        }
                    ]);
                }

                // Set department folders (mock data based on common departments)
                setDepartmentFolders([
                    {
                        id: 1,
                        name: 'Operations Department',
                        description: 'Files for daily operations',
                        icon: <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />,
                        count: Math.floor(Math.random() * 100) + 20
                    },
                    {
                        id: 2,
                        name: 'Finance Department',
                        description: 'Budget and accounting files',
                        icon: <CurrencyDollarIcon className="h-8 w-8 text-green-500" />,
                        count: Math.floor(Math.random() * 80) + 15
                    },
                    {
                        id: 3,
                        name: 'HR Department',
                        description: 'Employee records and policies',
                        icon: <UsersIcon className="h-8 w-8 text-purple-500" />,
                        count: Math.floor(Math.random() * 60) + 10
                    },
                    {
                        id: 4,
                        name: 'Marketing Department',
                        description: 'Campaigns and outreach materials',
                        icon: <ChartBarIcon className="h-8 w-8 text-orange-500" />,
                        count: Math.floor(Math.random() * 70) + 12
                    }
                ]);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                // Set fallback mock data
                setDashboardStats({
                    totalFiles: 24,
                    activeUsers: 18,
                    sharedFiles: 12,
                    pendingTasks: 37
                });

                setRecentDocuments([
                    { f_uuid: '1', f_name: 'Project_Plan_Q3.pdf', created_at: new Date().toISOString() },
                    { f_uuid: '2', f_name: 'Operations_Manual.docx', created_at: new Date().toISOString() },
                    { f_uuid: '3', f_name: 'HR_Policies_2024.pdf', created_at: new Date().toISOString() },
                    { f_uuid: '4', f_name: 'Budget_Report.xlsx', created_at: new Date().toISOString() }
                ]);

                setSharedFiles([
                    {
                        id: '1',
                        name: 'Q3_Performance_Report.pdf',
                        sharedBy: 'Alice Brown',
                        dateShared: '2024-03-15',
                        status: 'Done'
                    }
                ]);

                setDepartmentFolders([
                    {
                        id: 1,
                        name: 'Operations Department',
                        description: 'Files for daily operations',
                        icon: <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />,
                        count: 45
                    },
                    {
                        id: 2,
                        name: 'Finance Department',
                        description: 'Budget and accounting files',
                        icon: <CurrencyDollarIcon className="h-8 w-8 text-green-500" />,
                        count: 32
                    }
                ]);
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
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Relevant Documents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recentDocuments.slice(0, 4).map((doc, index) => {
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
                                <div key={doc.f_uuid || index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        {icons[index]}
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <EllipsisHorizontalIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{titles[index]}</h3>
                                    <p className="text-sm text-gray-600">{descriptions[index]}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Departmental Folders */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Departmental Folders</h2>
                            <div className="space-y-4">
                                {departmentFolders.map((folder) => (
                                    <div key={folder.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                        <div className="flex items-center space-x-3">
                                            {folder.icon}
                                            <div>
                                                <h3 className="font-medium text-gray-900">{folder.name}</h3>
                                                <p className="text-sm text-gray-600">{folder.description}</p>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <EllipsisHorizontalIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Share Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
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
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shared Files</h2>
                            
                            {sharedFiles.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">File Name</th>
                                                <th className="text-left py-3 px-4 font-medium text-gray-700">Shared By</th>
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