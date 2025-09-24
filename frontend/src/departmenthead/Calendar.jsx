import React, { useState, useEffect } from 'react';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    CalendarIcon, 
    DocumentTextIcon,
    ShareIcon,
    ChartBarIcon,
    UsersIcon,
    XMarkIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    InboxArrowDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [filesData, setFilesData] = useState({});
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [showFileModal, setShowFileModal] = useState(false);
    const [fileFilter, setFileFilter] = useState('all'); // 'all', 'uploaded', 'shared', 'received'
    const [loading, setLoading] = useState(true);
    const { user, getUserProfile } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    
    // Fetch files data from database
    const fetchFilesData = async (departmentId) => {
        try {
            setLoading(true);
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            // Format dates for SQL
            const startDate = startOfMonth.toISOString().split('T')[0];
            const endDate = endOfMonth.toISOString().split('T')[0];
            
           
            
            // Fetch uploaded files from the department
            const { data: uploadedFiles, error: uploadError } = await supabase
                .from('file')
                .select(`
                    *,
                    users(name, email, d_uuid)
                `)
                .eq('d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (uploadError) throw uploadError;
            
           

            // Fetch shared files (files shared TO this department)
            const { data: sharedFiles, error: sharedError } = await supabase
                .from('file_department')
                .select(`
                    *,
                    file(*),
                    department(d_name)
                `)
                .eq('d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (sharedError) throw sharedError;
            
            
            
            // Now get user information for these files in a separate query
            if (sharedFiles && sharedFiles.length > 0) {
                const fileIds = sharedFiles.filter(fileRef => fileRef.file).map(fileRef => fileRef.file.uuid);
                if (fileIds.length > 0) {
                    const { data: fileUsers } = await supabase
                        .from('users')
                        .select('uuid, name, email, position')
                        .in('uuid', fileIds);
                    
                   
                    
                    // Attach user info to the shared files
                    if (fileUsers && fileUsers.length > 0) {
                        sharedFiles.forEach(fileRef => {
                            if (fileRef.file && fileRef.file.uuid) {
                                const user = fileUsers.find(u => u.uuid === fileRef.file.uuid);
                                if (user) {
                                    fileRef.file.users = user;
                                }
                            }
                        });
                    }
                }
            }

            // Fetch received files (files from other departments shared to this department)
            const { data: receivedFiles, error: receivedError } = await supabase
                .from('file_department')
                .select(`
                    *,
                    file(*),
                    department(d_name)
                `)
                .eq('d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (receivedError) throw receivedError;
            
           
            
            // Filter files that are not from this department
            const filteredReceivedFiles = receivedFiles?.filter(fileRef => {
                if (!fileRef.file || !fileRef.file.d_uuid) return true; // Keep if we can't determine origin
                return fileRef.file.d_uuid !== departmentId; // Keep if from different department
            }) || [];
            
            // Get user information for these files
            if (filteredReceivedFiles.length > 0) {
                const fileUserIds = filteredReceivedFiles
                    .filter(fileRef => fileRef.file && fileRef.file.uuid)
                    .map(fileRef => fileRef.file.uuid);
                    
                if (fileUserIds.length > 0) {
                    const { data: fileUsers } = await supabase
                        .from('users')
                        .select('uuid, name, email, position, d_uuid')
                        .in('uuid', fileUserIds);
                        
                    
                    
                    // Attach user info to the received files
                    if (fileUsers && fileUsers.length > 0) {
                        filteredReceivedFiles.forEach(fileRef => {
                            if (fileRef.file && fileRef.file.uuid) {
                                const user = fileUsers.find(u => u.uuid === fileRef.file.uuid);
                                if (user) {
                                    fileRef.file.users = user;
                                }
                            }
                        });
                    }
                }
            }

            // Process and organize data by date
            const processedData = {};
            
            // Process uploaded files
            uploadedFiles?.forEach(file => {
                const date = file.created_at.split('T')[0];
                if (!processedData[date]) {
                    processedData[date] = {
                        uploads: 0,
                        shared: 0,
                        received: 0,
                        internal: 0,
                        external: 0,
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: [],
                            internal: [],
                            external: []
                        }
                    };
                }
                
                processedData[date].uploads++;
                // Add null check for users
                if (file.users && file.users.name) {
                    processedData[date].users.add(file.users.name);
                } else {
                    processedData[date].users.add('Unknown User');
                }
                
                // Get user name safely
                const userName = file.users?.name || 'Unknown User';
                
                // Determine if this is an internal notification (within the department)
                const isInternal = true; // Uploads are always considered internal
                if (isInternal) {
                    processedData[date].internal++;
                    processedData[date].files.internal.push({
                        id: file.f_uuid,
                        name: file.f_name,
                        size: file.f_size || 'Unknown',
                        time: new Date(file.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }),
                        user: userName,
                        type: 'internal',
                        action: 'uploaded'
                    });
                }
                
                processedData[date].files.uploaded.push({
                    id: file.f_uuid,
                    name: file.f_name,
                    size: file.f_size || 'Unknown',
                    time: new Date(file.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    user: userName,
                    type: 'uploaded',
                    notificationType: 'internal'
                });
            });

            // Process shared files
            sharedFiles?.forEach(fileRef => {
                const file = fileRef.file;
                const date = fileRef.created_at.split('T')[0];
                if (!processedData[date]) {
                    processedData[date] = {
                        uploads: 0,
                        shared: 0,
                        received: 0,
                        internal: 0,
                        external: 0,
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: [],
                            internal: [],
                            external: []
                        }
                    };
                }
                
                processedData[date].shared++;
                
                // Add null check for file and users
                if (file && file.users && file.users.name) {
                    processedData[date].users.add(file.users.name);
                } else {
                    processedData[date].users.add('Unknown User');
                }
                
                // Get user name safely
                const userName = file?.users?.name || 'Unknown User';
                
                // Determine if this is an internal notification (within the department)
                // A file shared by this department to another department is internal from our perspective
                const isInternal = true; // Shared files are outgoing from this department
                if (isInternal) {
                    processedData[date].internal++;
                    processedData[date].files.internal.push({
                        id: file?.f_uuid || fileRef.f_uuid,
                        name: file?.f_name || 'Unnamed File',
                        size: file?.f_size || 'Unknown',
                        time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }),
                        user: userName,
                        sharedTo: 'Department',
                        type: 'internal',
                        action: 'shared'
                    });
                }
                
                processedData[date].files.shared.push({
                    id: file?.f_uuid || fileRef.f_uuid,
                    name: file?.f_name || 'Unnamed File',
                    size: file?.f_size || 'Unknown',
                    time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    sharedTo: 'Department',
                    user: userName,
                    type: 'shared',
                    notificationType: 'internal'
                });
            });

            // Process received files
            receivedFiles?.forEach(fileRef => {
                const file = fileRef.file;
                const date = fileRef.created_at.split('T')[0];
                if (!processedData[date]) {
                    processedData[date] = {
                        uploads: 0,
                        shared: 0,
                        received: 0,
                        internal: 0,
                        external: 0,
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: [],
                            internal: [],
                            external: []
                        }
                    };
                }
                
                processedData[date].received++;
                
                // Add null check for file and users
                if (file && file.users && file.users.name) {
                    processedData[date].users.add(file.users.name);
                } else {
                    processedData[date].users.add('Unknown User');
                }
                
                // Get user name safely
                const userName = file?.users?.name || 'Unknown User';
                const deptName = fileRef.department?.d_name || 'Unknown Department';
                
                // Determine if this is an external notification (from another department)
                // Files received from other departments are always external
                const isExternal = true; // Received files are incoming from other departments
                if (isExternal) {
                    processedData[date].external++;
                    processedData[date].files.external.push({
                        id: file?.f_uuid || fileRef.f_uuid,
                        name: file?.f_name || 'Unnamed File',
                        size: file?.f_size || 'Unknown',
                        time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }),
                        user: userName,
                        from: deptName,
                        type: 'external',
                        action: 'received'
                    });
                }
                
                processedData[date].files.received.push({
                    id: file?.f_uuid || fileRef.f_uuid,
                    name: file?.f_name || 'Unnamed File',
                    size: file?.f_size || 'Unknown',
                    time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    user: userName,
                    from: deptName,
                    type: 'received',
                    notificationType: 'external'
                });
            });

            // Convert Sets to Arrays
            Object.keys(processedData).forEach(date => {
                processedData[date].users = Array.from(processedData[date].users);
            });

            setFilesData(processedData);
            
        } catch (error) {
            console.error('Error fetching files data:', error);
            setFilesData({});
            // You could add a toast notification here or show an error message to the user
        } finally {
            setLoading(false);
        }
    };

    // Generate monthly statistics for line graph
    const generateMonthlyStats = () => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const stats = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = filesData[date] || { uploads: 0, shared: 0, received: 0, internal: 0, external: 0 };
            stats.push({
                day,
                uploads: dayData.uploads,
                shared: dayData.shared,
                received: dayData.received,
                internal: dayData.internal,
                external: dayData.external,
                total: dayData.uploads + dayData.shared + dayData.received
            });
        }
        return stats;
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user?.id) {
                try {
                    const profile = await getUserProfile(user.id);
                    setUserProfile(profile);
                    
                    // Only fetch files data if user is a department head and has a department
                    if (profile?.position === 'head' && profile?.d_uuid) {
                        await fetchFilesData(profile.d_uuid);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                }
            }
        };
        fetchUserProfile();
    }, [user, getUserProfile, currentDate]);

    useEffect(() => {
        // Generate monthly stats whenever filesData changes
        setMonthlyStats(generateMonthlyStats());
    }, [filesData, currentDate]);

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();
    
    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
        setShowFileModal(false);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
        setShowFileModal(false);
    };

    const handleDateClick = (day) => {
        const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(date);
        if (filesData[date] && (filesData[date].uploads > 0 || filesData[date].shared > 0 || filesData[date].received > 0)) {
            setShowFileModal(true);
            setFileFilter('all');
        }
    };

    const renderDays = () => {
        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24"></div>);
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = filesData[date] || { uploads: 0, shared: 0, received: 0, users: [] };
            const isSelected = selectedDate === date;
            const isToday = new Date().toDateString() === new Date(date).toDateString();
            const hasActivity = dayData.uploads > 0 || dayData.shared > 0 || dayData.received > 0;
            
            days.push(
                <div 
                    key={day} 
                    onClick={() => handleDateClick(day)}
                    className={`h-24 p-2 border rounded-lg transition-all duration-200 cursor-pointer relative ${
                        isSelected 
                            ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-400' 
                            : hasActivity
                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${isToday ? 'ring-2 ring-orange-400' : ''}`}
                >
                    <div className={`font-bold text-sm ${isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                        {day}
                    </div>
                    
                    {hasActivity && (
                        <div className="mt-1 grid grid-cols-2 gap-y-1 gap-x-0.5">
                            {dayData.uploads > 0 && (
                                <div className="flex items-center text-xs text-blue-600">
                                    <div className="min-w-[16px] flex justify-center">
                                        <ArrowUpTrayIcon className="h-3 w-3" />
                                    </div>
                                    <span className="ml-0.5">{dayData.uploads}</span>
                                </div>
                            )}
                            {dayData.shared > 0 && (
                                <div className="flex items-center text-xs text-green-600">
                                    <div className="min-w-[16px] flex justify-center">
                                        <ShareIcon className="h-3 w-3" />
                                    </div>
                                    <span className="ml-0.5">{dayData.shared}</span>
                                </div>
                            )}
                            {dayData.received > 0 && (
                                <div className="flex items-center text-xs text-purple-600">
                                    <div className="min-w-[16px] flex justify-center">
                                        <ArrowDownTrayIcon className="h-3 w-3" />
                                    </div>
                                    <span className="ml-0.5">{dayData.received}</span>
                                </div>
                            )}
                            {dayData.internal > 0 && (
                                <div className="flex items-center text-xs text-amber-600">
                                    <div className="min-w-[16px] flex justify-center">
                                        <InboxArrowDownIcon className="h-3 w-3" />
                                    </div>
                                    <span className="ml-0.5">{dayData.internal}</span>
                                </div>
                            )}
                            {dayData.external > 0 && (
                                <div className="flex items-center text-xs text-red-600">
                                    <div className="min-w-[16px] flex justify-center">
                                        <FunnelIcon className="h-3 w-3" />
                                    </div>
                                    <span className="ml-0.5">{dayData.external}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {isToday && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
                    )}
                </div>
            );
        }
        
        return days;
    };

    // File Modal Component
    const FileModal = () => {
        if (!showFileModal || !selectedDate || !filesData[selectedDate]) return null;
        
        const dateData = filesData[selectedDate];
        const files = dateData.files || { uploaded: [], shared: [], received: [], internal: [], external: [] };
        
        const getFilteredFiles = () => {
            switch (fileFilter) {
                case 'uploaded':
                    return files.uploaded.map(file => ({ ...file, type: 'uploaded' }));
                case 'shared':
                    return files.shared.map(file => ({ ...file, type: 'shared' }));
                case 'received':
                    return files.received.map(file => ({ ...file, type: 'received' }));
                case 'internal':
                    return files.internal.map(file => ({ ...file, type: 'internal' }));
                case 'external':
                    return files.external.map(file => ({ ...file, type: 'external' }));
                default:
                    return [
                        ...files.uploaded.map(file => ({ ...file, type: 'uploaded' })),
                        ...files.shared.map(file => ({ ...file, type: 'shared' })),
                        ...files.received.map(file => ({ ...file, type: 'received' }))
                    ].sort((a, b) => a.time.localeCompare(b.time));
            }
        };
        
        const filteredFiles = getFilteredFiles();
        
        const getFileTypeIcon = (type) => {
            switch (type) {
                case 'uploaded':
                    return <ArrowUpTrayIcon className="h-5 w-5 text-blue-500" />;
                case 'shared':
                    return <ShareIcon className="h-5 w-5 text-green-500" />;
                case 'received':
                    return <ArrowDownTrayIcon className="h-5 w-5 text-purple-500" />;
                case 'internal':
                    return <InboxArrowDownIcon className="h-5 w-5 text-amber-500" />;
                case 'external':
                    return <FunnelIcon className="h-5 w-5 text-red-500" />;
                default:
                    return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
            }
        };
        
        const getFileTypeColor = (type) => {
            switch (type) {
                case 'uploaded':
                    return 'bg-blue-50 border-blue-200';
                case 'shared':
                    return 'bg-green-50 border-green-200';
                case 'received':
                    return 'bg-purple-50 border-purple-200';
                case 'internal':
                    return 'bg-amber-50 border-amber-200';
                case 'external':
                    return 'bg-red-50 border-red-200';
                default:
                    return 'bg-gray-50 border-gray-200';
            }
        };
        
        const getFileTypeBadgeColor = (type) => {
            switch (type) {
                case 'uploaded':
                    return 'bg-blue-100 text-blue-700';
                case 'shared':
                    return 'bg-green-100 text-green-700';
                case 'received':
                    return 'bg-purple-100 text-purple-700';
                case 'internal':
                    return 'bg-amber-100 text-amber-700';
                case 'external':
                    return 'bg-red-100 text-red-700';
                default:
                    return 'bg-gray-100 text-gray-700';
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Files for {new Date(selectedDate).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowFileModal(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center space-x-4">
                            <FunnelIcon className="h-5 w-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Filter by:</span>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'all', label: 'All Files', icon: DocumentTextIcon },
                                    { key: 'uploaded', label: 'Uploaded', icon: ArrowUpTrayIcon },
                                    { key: 'shared', label: 'Shared', icon: ShareIcon },
                                    { key: 'received', label: 'Received', icon: ArrowDownTrayIcon },
                                    { key: 'internal', label: 'Internal', icon: InboxArrowDownIcon },
                                    { key: 'external', label: 'External', icon: FunnelIcon }
                                ].map(filter => {
                                    const Icon = filter.icon;
                                    const isActive = fileFilter === filter.key;
                                    
                                    let buttonClass = 'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ';
                                    let iconBgClass = 'w-5 h-5 rounded-full mr-2 flex items-center justify-center ';
                                    let iconClass = 'h-3 w-3 ';
                                    
                                    // Set appropriate colors based on filter type
                                    if (isActive) {
                                        if (filter.key === 'all') {
                                            buttonClass += 'bg-gray-100 text-gray-700 border border-gray-300 shadow-sm';
                                            iconBgClass += 'bg-gray-500';
                                            iconClass += 'text-white';
                                        } else if (filter.key === 'uploaded') {
                                            buttonClass += 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm';
                                            iconBgClass += 'bg-blue-500';
                                            iconClass += 'text-white';
                                        } else if (filter.key === 'shared') {
                                            buttonClass += 'bg-green-100 text-green-700 border border-green-300 shadow-sm';
                                            iconBgClass += 'bg-green-500';
                                            iconClass += 'text-white';
                                        } else if (filter.key === 'received') {
                                            buttonClass += 'bg-purple-100 text-purple-700 border border-purple-300 shadow-sm';
                                            iconBgClass += 'bg-purple-500';
                                            iconClass += 'text-white';
                                        } else if (filter.key === 'internal') {
                                            buttonClass += 'bg-amber-100 text-amber-700 border border-amber-300 shadow-sm';
                                            iconBgClass += 'bg-amber-500';
                                            iconClass += 'text-white';
                                        } else if (filter.key === 'external') {
                                            buttonClass += 'bg-red-100 text-red-700 border border-red-300 shadow-sm';
                                            iconBgClass += 'bg-red-500';
                                            iconClass += 'text-white';
                                        }
                                    } else {
                                        buttonClass += 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50';
                                        if (filter.key === 'all') {
                                            iconBgClass += 'bg-gray-100';
                                            iconClass += 'text-gray-500';
                                        } else if (filter.key === 'uploaded') {
                                            iconBgClass += 'bg-blue-100';
                                            iconClass += 'text-blue-500';
                                        } else if (filter.key === 'shared') {
                                            iconBgClass += 'bg-green-100';
                                            iconClass += 'text-green-500';
                                        } else if (filter.key === 'received') {
                                            iconBgClass += 'bg-purple-100';
                                            iconClass += 'text-purple-500';
                                        } else if (filter.key === 'internal') {
                                            iconBgClass += 'bg-amber-100';
                                            iconClass += 'text-amber-500';
                                        } else if (filter.key === 'external') {
                                            iconBgClass += 'bg-red-100';
                                            iconClass += 'text-red-500';
                                        }
                                    }
                                    
                                    return (
                                        <button
                                            key={filter.key}
                                            onClick={() => setFileFilter(filter.key)}
                                            className={buttonClass}
                                        >
                                            <div className={iconBgClass}>
                                                <Icon className={iconClass} />
                                            </div>
                                            {filter.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    {/* Files List */}
                    <div className="p-6 max-h-96 overflow-y-auto">
                        {filteredFiles.length > 0 ? (
                            <div className="space-y-3">
                                {filteredFiles.map(file => (
                                    <div 
                                        key={file.id}
                                        className={`p-4 rounded-lg border ${getFileTypeColor(file.type)} hover:shadow-sm transition-shadow`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                                <div className={`w-8 h-8 rounded-full ${getFileTypeColor(file.type)} flex items-center justify-center`}>
                                                    {getFileTypeIcon(file.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                                        {file.name}
                                                    </h4>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                                        <span>{file.size}</span>
                                                        <span>{file.time}</span>
                                                        {file.user && <span>by {file.user}</span>}
                                                        {file.sharedTo && <span>shared to {file.sharedTo}</span>}
                                                        {file.from && <span>from {file.from}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getFileTypeBadgeColor(file.type)}`}>
                                                    {file.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No files found for the selected filter.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Simple line graph component
    const LineGraph = () => {
        const maxValue = Math.max(...monthlyStats.map(stat => stat.total));
        const graphHeight = 200;
        const graphWidth = 600;
        
        const points = monthlyStats.map((stat, index) => {
            const x = (index / (monthlyStats.length - 1)) * graphWidth;
            const y = graphHeight - ((stat.total / maxValue) * graphHeight);
            return `${x},${y}`;
        }).join(' ');
        
        const uploadPoints = monthlyStats.map((stat, index) => {
            const x = (index / (monthlyStats.length - 1)) * graphWidth;
            const y = graphHeight - ((stat.uploads / maxValue) * graphHeight);
            return `${x},${y}`;
        }).join(' ');
        
        const sharedPoints = monthlyStats.map((stat, index) => {
            const x = (index / (monthlyStats.length - 1)) * graphWidth;
            const y = graphHeight - ((stat.shared / maxValue) * graphHeight);
            return `${x},${y}`;
        }).join(' ');
        
        const internalPoints = monthlyStats.map((stat, index) => {
            const x = (index / (monthlyStats.length - 1)) * graphWidth;
            const y = graphHeight - ((stat.internal / maxValue) * graphHeight);
            return `${x},${y}`;
        }).join(' ');
        
        const externalPoints = monthlyStats.map((stat, index) => {
            const x = (index / (monthlyStats.length - 1)) * graphWidth;
            const y = graphHeight - ((stat.external / maxValue) * graphHeight);
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                    <ChartBarIcon className="h-6 w-6 text-purple-500 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Monthly File Activity</h3>
                </div>
                
                <div className="flex justify-center">
                    <svg width={graphWidth + 40} height={graphHeight + 40} className="border border-gray-200 rounded">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map(percent => {
                            const y = graphHeight - ((percent / 100) * graphHeight);
                            return (
                                <g key={percent}>
                                    <line x1="20" y1={y + 20} x2={graphWidth + 20} y2={y + 20} stroke="#e5e7eb" strokeWidth="1" />
                                    <text x="10" y={y + 24} fontSize="10" fill="#6b7280">{Math.round((maxValue * percent) / 100)}</text>
                                </g>
                            );
                        })}
                        
                        {/* Total files line */}
                        <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            points={points.split(' ').map(point => {
                                const [x, y] = point.split(',');
                                return `${parseInt(x) + 20},${parseInt(y) + 20}`;
                            }).join(' ')}
                        />
                        
                        {/* Uploads line */}
                        <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            points={uploadPoints.split(' ').map(point => {
                                const [x, y] = point.split(',');
                                return `${parseInt(x) + 20},${parseInt(y) + 20}`;
                            }).join(' ')}
                        />
                        
                        {/* Shared files line */}
                        <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            points={sharedPoints.split(' ').map(point => {
                                const [x, y] = point.split(',');
                                return `${parseInt(x) + 20},${parseInt(y) + 20}`;
                            }).join(' ')}
                        />
                        
                        {/* Internal notifications line */}
                        <polyline
                            fill="none"
                            stroke="#d97706"
                            strokeWidth="2"
                            strokeDasharray="4"
                            points={internalPoints.split(' ').map(point => {
                                const [x, y] = point.split(',');
                                return `${parseInt(x) + 20},${parseInt(y) + 20}`;
                            }).join(' ')}
                        />
                        
                        {/* External notifications line */}
                        <polyline
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="4"
                            points={externalPoints.split(' ').map(point => {
                                const [x, y] = point.split(',');
                                return `${parseInt(x) + 20},${parseInt(y) + 20}`;
                            }).join(' ')}
                        />
                        
                        {/* Data points */}
                        {monthlyStats.map((stat, index) => {
                            const x = (index / (monthlyStats.length - 1)) * graphWidth + 20;
                            const y = graphHeight - ((stat.total / maxValue) * graphHeight) + 20;
                            return (
                                <circle
                                    key={index}
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill="#3b82f6"
                                    className="cursor-pointer"
                                >
                                    <title>{`Day ${stat.day}: ${stat.total} files (${stat.uploads} uploads, ${stat.shared} shared, ${stat.internal} internal, ${stat.external} external)`}</title>
                                </circle>
                            );
                        })}
                    </svg>
                </div>
                
                {/* Legend */}
                <div className="flex justify-center mt-4 flex-wrap gap-4">
                    <div className="flex items-center">
                        <div className="w-4 h-1 bg-blue-500 mr-2"></div>
                        <span className="text-sm text-gray-600">Total Files</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-1 bg-green-500 mr-2"></div>
                        <span className="text-sm text-gray-600">Uploads</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-1 bg-yellow-500 mr-2"></div>
                        <span className="text-sm text-gray-600">Shared</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-1 bg-amber-500 mr-2 border-t border-dashed border-amber-500"></div>
                        <span className="text-sm text-gray-600">Internal</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-1 bg-red-500 mr-2 border-t border-dashed border-red-500"></div>
                        <span className="text-sm text-gray-600">External</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto mt-8 mb-8 p-6 space-y-6">
            {/* File Modal */}
            <FileModal />
            
            {/* Loading State */}
            {loading && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                        <span className="text-gray-600">Loading calendar data...</span>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <CalendarIcon className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">
                                Department Calendar
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Track file uploads and sharing activity - Click on any date to view files
                            </p>
                            {userProfile?.department && (
                                <p className="text-sm text-blue-600 mt-1">
                                    {userProfile.department.d_name} Department
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={prevMonth}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                            Previous
                        </button>
                        <button 
                            onClick={nextMonth}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            Next
                            <ChevronRightIcon className="h-4 w-4 ml-1" />
                        </button>
                    </div>
                </div>
                
                <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">
                    {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center">
                            <div className="font-bold text-sm text-gray-700 py-2 bg-gray-50 rounded">
                                {day}
                            </div>
                        </div>
                    ))}
                    
                    {!loading && renderDays()}
                </div>
                
                {/* No Data Message */}
                {!loading && Object.keys(filesData).length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No file activity found for this month.</p>
                        <p className="text-sm text-gray-500 mt-2">Files will appear here once your department starts uploading or sharing documents.</p>
                    </div>
                )}
                
                {/* Legend */}
                <div className="flex justify-center flex-wrap gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                        <span>Days with activity</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded mr-2"></div>
                        <span>Selected day</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center mr-1">
                            <ArrowUpTrayIcon className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <span>Uploaded</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center mr-1">
                            <ShareIcon className="h-3.5 w-3.5 text-green-500" />
                        </div>
                        <span>Shared</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-purple-50 rounded-full flex items-center justify-center mr-1">
                            <ArrowDownTrayIcon className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        <span>Received</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-amber-50 rounded-full flex items-center justify-center mr-1">
                            <InboxArrowDownIcon className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <span>Internal</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center mr-1">
                            <FunnelIcon className="h-3.5 w-3.5 text-red-500" />
                        </div>
                        <span>External</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-2.5 h-2.5 bg-orange-400 rounded-full mr-2"></div>
                        <span>Today</span>
                    </div>
                </div>
            </div>

            {/* Line Graph */}
            <LineGraph />

            {/* Selected Date Details */}
            {selectedDate && filesData[selectedDate] && !showFileModal && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-blue-500 mr-2" />
                        Activity for {new Date(selectedDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Statistics Cards */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <ArrowUpTrayIcon className="h-8 w-8 text-blue-500 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-blue-700">
                                        {filesData[selectedDate].uploads}
                                    </p>
                                    <p className="text-blue-600 text-sm">Files Uploaded</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <ShareIcon className="h-8 w-8 text-green-500 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-green-700">
                                        {filesData[selectedDate].shared}
                                    </p>
                                    <p className="text-green-600 text-sm">Files Shared</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <ArrowDownTrayIcon className="h-8 w-8 text-purple-500 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-purple-700">
                                        {filesData[selectedDate].received || 0}
                                    </p>
                                    <p className="text-purple-600 text-sm">Files Received</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <UsersIcon className="h-8 w-8 text-orange-500 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-orange-700">
                                        {filesData[selectedDate].users.length}
                                    </p>
                                    <p className="text-orange-600 text-sm">Active Users</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* View Files Button */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setShowFileModal(true)}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            <DocumentTextIcon className="h-5 w-5 mr-2" />
                            View All Files
                        </button>
                    </div>
                    
                    {/* Active Users List */}
                    {filesData[selectedDate].users.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-3">Active Users</h4>
                            <div className="flex flex-wrap gap-2">
                                {filesData[selectedDate].users.map((user, index) => (
                                    <span 
                                        key={index}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                    >
                                        {user}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Monthly Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                    <ChartBarIcon className="h-6 w-6 text-gray-600 mr-2" />
                    Monthly Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                            <ArrowUpTrayIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.uploads, 0)}
                        </p>
                        <p className="text-blue-600 text-sm mt-1">Total Uploads</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <ShareIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.shared, 0)}
                        </p>
                        <p className="text-green-600 text-sm mt-1">Total Shared</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                            <ArrowDownTrayIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.received, 0)}
                        </p>
                        <p className="text-purple-600 text-sm mt-1">Total Received</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-2">
                            <InboxArrowDownIcon className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-amber-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.internal, 0)}
                        </p>
                        <p className="text-amber-600 text-sm mt-1">Internal Notifications</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-2">
                            <FunnelIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.external, 0)}
                        </p>
                        <p className="text-red-600 text-sm mt-1">External Notifications</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                            <ChartBarIcon className="h-5 w-5 text-orange-600" />
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                            {Math.round(monthlyStats.reduce((sum, stat) => sum + stat.total, 0) / monthlyStats.filter(stat => stat.total > 0).length) || 0}
                        </p>
                        <p className="text-orange-600 text-sm mt-1">Avg Daily Activity</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                        <div className="w-10 h-10 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <CalendarIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-600">
                            {monthlyStats.filter(stat => stat.total > 0).length}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">Active Days</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;