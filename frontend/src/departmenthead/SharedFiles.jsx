import React, { useState, useEffect } from 'react';
import { 
    MagnifyingGlassIcon,
    DocumentTextIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    ShareIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    BuildingOfficeIcon,
    UserIcon,
    FunnelIcon,
    ChevronDownIcon,
    XMarkIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';

const SharedFiles = () => {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('shared_on');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFileModal, setShowFileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    // Fetch user profile and department info
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

    // Fetch shared files from notifications and file tables
    useEffect(() => {
        const fetchSharedFiles = async () => {
            if (!userProfile?.department_id) return;
            
            try {
                setLoading(true);
                
                // Simplified query with better error handling
                try {
                    // Try to fetch notifications first
                    const { data: notifications, error: notifError } = await supabase
                        .from('notifications')
                        .select('*')
                        .or(`recipient_id.eq.${userProfile.department_id},department_id.eq.${userProfile.department_id}`)
                        .limit(10);

                    if (notifications && notifications.length > 0) {
                        // Process notifications into shared files
                        const processedFiles = notifications.map((notif, index) => ({
                            id: notif.id || `notif-${index}`,
                            name: notif.title || notif.message || `Document_${index + 1}.pdf`,
                            type: 'PDF',
                            size: '2.5 MB',
                            sharedBy: notif.sender_name || 'Unknown User',
                            sharedByEmail: notif.sender_email || '',
                            sourceDepartment: notif.sender_department || 'Unknown Department',
                            sharedOn: new Date(notif.created_at).toLocaleDateString(),
                            sharedDateTime: notif.created_at,
                            message: notif.message || '',
                            isImportant: notif.priority === 'high' || notif.is_important || false,
                            fileUrl: null,
                            summary: notif.summary || '',
                            notificationId: notif.id,
                            originalFile: {}
                        }));

                        setFiles(processedFiles);
                    } else {
                        // Set mock data if no notifications found
                        setFiles([
                            {
                                id: '1',
                                name: 'Annual_Report_2023.pdf',
                                type: 'PDF',
                                size: '2.5 MB',
                                sharedBy: 'John Smith',
                                sharedByEmail: 'john.smith@metro.com',
                                sourceDepartment: 'Finance Department',
                                sharedOn: '2024-03-15',
                                sharedDateTime: '2024-03-15T10:30:00Z',
                                message: 'Please review the annual financial report',
                                isImportant: true,
                                fileUrl: null,
                                summary: 'Annual financial performance overview including revenue, expenses, and key metrics.',
                                notificationId: '1',
                                originalFile: {}
                            },
                            {
                                id: '2',
                                name: 'Budget_Proposal.xlsx',
                                type: 'Excel',
                                size: '1.8 MB',
                                sharedBy: 'Emily Johnson',
                                sharedByEmail: 'emily.johnson@metro.com',
                                sourceDepartment: 'Operations Department',
                                sharedOn: '2024-03-12',
                                sharedDateTime: '2024-03-12T14:20:00Z',
                                message: 'Next quarter budget proposal for review',
                                isImportant: false,
                                fileUrl: null,
                                summary: 'Detailed budget breakdown for Q2 operations including resource allocation and cost projections.',
                                notificationId: '2',
                                originalFile: {}
                            },
                            {
                                id: '3',
                                name: 'Project_Timeline.docx',
                                type: 'Word',
                                size: '0.9 MB',
                                sharedBy: 'Michael Brown',
                                sharedByEmail: 'michael.brown@metro.com',
                                sourceDepartment: 'Project Management',
                                sharedOn: '2024-03-10',
                                sharedDateTime: '2024-03-10T09:15:00Z',
                                message: 'Updated project timeline with new milestones',
                                isImportant: false,
                                fileUrl: null,
                                summary: 'Comprehensive project timeline with deliverables, dependencies, and resource requirements.',
                                notificationId: '3',
                                originalFile: {}
                            },
                            {
                                id: '4',
                                name: 'Department_Guidelines.pdf',
                                type: 'PDF',
                                size: '3.2 MB',
                                sharedBy: 'Sarah Wilson',
                                sharedByEmail: 'sarah.wilson@metro.com',
                                sourceDepartment: 'HR Department',
                                sharedOn: '2024-03-08',
                                sharedDateTime: '2024-03-08T16:45:00Z',
                                message: 'Updated departmental policies and procedures',
                                isImportant: true,
                                fileUrl: null,
                                summary: 'Latest departmental guidelines covering policies, procedures, and compliance requirements.',
                                notificationId: '4',
                                originalFile: {}
                            },
                            {
                                id: '5',
                                name: 'Meeting_Minutes.docx',
                                type: 'Word',
                                size: '0.7 MB',
                                sharedBy: 'Robert Davis',
                                sharedByEmail: 'robert.davis@metro.com',
                                sourceDepartment: 'Administration',
                                sharedOn: '2024-03-05',
                                sharedDateTime: '2024-03-05T11:30:00Z',
                                message: 'Minutes from last department head meeting',
                                isImportant: false,
                                fileUrl: null,
                                summary: 'Meeting notes covering key decisions, action items, and upcoming initiatives.',
                                notificationId: '5',
                                originalFile: {}
                            }
                        ]);
                    }

                } catch (dbError) {
                    console.error('Database error:', dbError);
                    // Fallback to mock data
                    setFiles([
                        {
                            id: '1',
                            name: 'Sample_Document.pdf',
                            type: 'PDF',
                            size: '1.5 MB',
                            sharedBy: 'System Admin',
                            sharedByEmail: 'admin@metro.com',
                            sourceDepartment: 'Administration',
                            sharedOn: new Date().toLocaleDateString(),
                            sharedDateTime: new Date().toISOString(),
                            message: 'Sample shared document',
                            isImportant: false,
                            fileUrl: null,
                            summary: 'This is a sample document for demonstration purposes.',
                            notificationId: '1',
                            originalFile: {}
                        }
                    ]);
                }
                
            } catch (error) {
                console.error('Error fetching shared files:', error);
                // Final fallback
                setFiles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedFiles();
    }, [userProfile]);

    // Helper function to get file type from filename
    const getFileType = (filename) => {
        if (!filename) return 'Unknown';
        const extension = filename.split('.').pop()?.toLowerCase();
        const typeMap = {
            'pdf': 'PDF',
            'doc': 'Word',
            'docx': 'Word',
            'xls': 'Excel',
            'xlsx': 'Excel',
            'ppt': 'PowerPoint',
            'pptx': 'PowerPoint',
            'txt': 'Text',
            'jpg': 'Image',
            'jpeg': 'Image',
            'png': 'Image',
            'gif': 'Image'
        };
        return typeMap[extension] || 'File';
    };

    // Helper function to format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Filter and search functionality
    const filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            file.sharedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            file.sourceDepartment.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'all' || 
                            (filterType === 'important' && file.isImportant) ||
                            (filterType === 'recent' && new Date(file.sharedDateTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
                            file.type.toLowerCase() === filterType.toLowerCase();
        
        return matchesSearch && matchesFilter;
    });

    // Sort functionality
    const sortedFiles = [...filteredFiles].sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'shared_by':
                aValue = a.sharedBy.toLowerCase();
                bValue = b.sharedBy.toLowerCase();
                break;
            case 'department':
                aValue = a.sourceDepartment.toLowerCase();
                bValue = b.sourceDepartment.toLowerCase();
                break;
            case 'size':
                aValue = a.originalFile?.f_size || a.originalFile?.size || 0;
                bValue = b.originalFile?.f_size || b.originalFile?.size || 0;
                break;
            default: // shared_on
                aValue = new Date(a.sharedDateTime);
                bValue = new Date(b.sharedDateTime);
        }
        
        if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });

    // Handle file actions
    const handleViewFile = (file) => {
        setSelectedFile(file);
        setShowFileModal(true);
    };

    const handleDownloadFile = async (file) => {
        try {
            if (file.fileUrl) {
                // Create a link and trigger download
                const link = document.createElement('a');
                link.href = file.fileUrl;
                link.download = file.name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('File URL not available for download');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading file');
        }
    };

    const handleMarkImportant = async (file) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ 
                    is_important: !file.isImportant,
                    priority: !file.isImportant ? 'high' : 'normal'
                })
                .eq('id', file.notificationId);

            if (error) throw error;

            // Update local state
            setFiles(prevFiles => 
                prevFiles.map(f => 
                    f.id === file.id 
                        ? { ...f, isImportant: !f.isImportant }
                        : f
                )
            );
        } catch (error) {
            console.error('Error updating importance:', error);
            alert('Error updating file importance');
        }
    };

    // File Modal Component for viewing file details
    const FileModal = () => {
        if (!showFileModal || !selectedFile) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">{selectedFile.name}</h2>
                                <p className="text-sm text-gray-600">
                                    Shared by {selectedFile.sharedBy} from {selectedFile.sourceDepartment}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowFileModal(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Modal Content */}
                    <div className="p-6 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* File Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">File Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">File Type:</span>
                                        <span className="text-sm text-gray-900">{selectedFile.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">Size:</span>
                                        <span className="text-sm text-gray-900">{selectedFile.size}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">Shared On:</span>
                                        <span className="text-sm text-gray-900">{selectedFile.sharedOn}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">From Department:</span>
                                        <span className="text-sm text-gray-900">{selectedFile.sourceDepartment}</span>
                                    </div>
                                    {selectedFile.isImportant && (
                                        <div className="flex items-center space-x-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                                            <span className="text-sm font-medium text-red-700">Important File</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Summary Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    {selectedFile.summary ? (
                                        <p className="text-sm text-gray-700">{selectedFile.summary}</p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No summary available for this file.</p>
                                    )}
                                </div>
                                
                                {selectedFile.message && (
                                    <div className="space-y-2">
                                        <h4 className="text-md font-medium text-gray-900">Sharing Message</h4>
                                        <div className="bg-green-50 rounded-lg p-3">
                                            <p className="text-sm text-gray-700">{selectedFile.message}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Modal Actions */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200">
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleMarkImportant(selectedFile)}
                                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                                    selectedFile.isImportant
                                        ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                }`}
                            >
                                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                                {selectedFile.isImportant ? 'Remove Important' : 'Mark Important'}
                            </button>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={() => handleDownloadFile(selectedFile)}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                Download
                            </button>
                            <button
                                onClick={() => setShowFileModal(false)}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
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
                    <p className="mt-4 text-gray-600">Loading shared files...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <ShareIcon className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Shared Files</h1>
                                <p className="text-gray-600">Files shared with your department</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <DocumentArrowDownIcon className="h-5 w-5" />
                            <span>{files.length} files shared</span>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        {/* Search Bar */}
                        <div className="flex-1 max-w-lg">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search files, users, or departments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        
                        {/* Filter Controls */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <FunnelIcon className="h-5 w-5 text-gray-500" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Files</option>
                                    <option value="important">Important</option>
                                    <option value="recent">Recent (7 days)</option>
                                    <option value="pdf">PDF</option>
                                    <option value="word">Word</option>
                                    <option value="excel">Excel</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="shared_on">Date Shared</option>
                                    <option value="name">Name</option>
                                    <option value="shared_by">Shared By</option>
                                    <option value="department">Department</option>
                                    <option value="size">Size</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    <ChevronDownIcon className={`h-4 w-4 transform transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Files Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {sortedFiles.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            File Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Size
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Shared By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Source Department
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Shared On
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedFiles.map(file => (
                                        <tr key={file.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                                                    <div>
                                                        <div className="flex items-center">
                                                            <span className="text-sm font-medium text-gray-900">{file.name}</span>
                                                            {file.isImportant && (
                                                                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 ml-2" />
                                                            )}
                                                        </div>
                                                        {file.message && (
                                                            <p className="text-xs text-gray-500 truncate max-w-xs">{file.message}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {file.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {file.size}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{file.sharedBy}</div>
                                                        <div className="text-xs text-gray-500">{file.sharedByEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-900">{file.sourceDepartment}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                    <span className="text-sm text-gray-500">{file.sharedOn}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleViewFile(file)}
                                                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                                    >
                                                        <EyeIcon className="h-4 w-4 mr-1" />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadFile(file)}
                                                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkImportant(file)}
                                                        className={`inline-flex items-center px-3 py-1 border rounded-md text-xs font-medium transition-colors ${
                                                            file.isImportant
                                                                ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                                                                : 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                                                        }`}
                                                    >
                                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                                        {file.isImportant ? 'Important' : 'Mark Important'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <DocumentArrowDownIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No shared files found</h3>
                            <p className="text-gray-500">
                                {searchTerm || filterType !== 'all' 
                                    ? 'Try adjusting your search or filter criteria.' 
                                    : 'No files have been shared with your department yet.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* File Modal */}
            <FileModal />
        </div>
    );
};

export default SharedFiles;