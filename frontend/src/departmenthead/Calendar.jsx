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
                    users!inner(name, email, d_uuid)
                `)
                .eq('users.d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (uploadError) throw uploadError;

            // Fetch shared files (files shared TO this department)
            const { data: sharedFiles, error: sharedError } = await supabase
                .from('file_department')
                .select(`
                    *,
                    file(*,
                        users(name, email)
                    )
                `)
                .eq('d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (sharedError) throw sharedError;

            // Fetch received files (files from other departments shared to this department)
            const { data: receivedFiles, error: receivedError } = await supabase
                .from('file_department')
                .select(`
                    *,
                    file(*,
                        users!inner(name, email, d_uuid)
                    ),
                    department(d_name)
                `)
                .eq('d_uuid', departmentId)
                .neq('file.users.d_uuid', departmentId)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59');

            if (receivedError) throw receivedError;

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
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: []
                        }
                    };
                }
                
                processedData[date].uploads++;
                processedData[date].users.add(file.users.name);
                processedData[date].files.uploaded.push({
                    id: file.f_uuid,
                    name: file.f_name,
                    size: file.f_size || 'Unknown',
                    time: new Date(file.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    user: file.users.name,
                    type: 'uploaded'
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
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: []
                        }
                    };
                }
                
                processedData[date].shared++;
                processedData[date].users.add(file.users?.name || 'Unknown');
                processedData[date].files.shared.push({
                    id: file.f_uuid,
                    name: file.f_name,
                    size: file.f_size || 'Unknown',
                    time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    sharedTo: 'Department',
                    type: 'shared'
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
                        users: new Set(),
                        files: {
                            uploaded: [],
                            shared: [],
                            received: []
                        }
                    };
                }
                
                processedData[date].received++;
                processedData[date].users.add(file.users?.name || 'Unknown');
                processedData[date].files.received.push({
                    id: file.f_uuid,
                    name: file.f_name,
                    size: file.f_size || 'Unknown',
                    time: new Date(fileRef.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    from: fileRef.department?.d_name || 'Unknown Department',
                    type: 'received'
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
            const dayData = filesData[date] || { uploads: 0, shared: 0, received: 0 };
            stats.push({
                day,
                uploads: dayData.uploads,
                shared: dayData.shared,
                received: dayData.received,
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
                        <div className="mt-1 space-y-1">
                            {dayData.uploads > 0 && (
                                <div className="flex items-center text-xs text-blue-600">
                                    <ArrowUpTrayIcon className="h-3 w-3 mr-1" />
                                    <span>{dayData.uploads}</span>
                                </div>
                            )}
                            {dayData.shared > 0 && (
                                <div className="flex items-center text-xs text-green-600">
                                    <ShareIcon className="h-3 w-3 mr-1" />
                                    <span>{dayData.shared}</span>
                                </div>
                            )}
                            {dayData.received > 0 && (
                                <div className="flex items-center text-xs text-purple-600">
                                    <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                                    <span>{dayData.received}</span>
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
        const files = dateData.files || { uploaded: [], shared: [], received: [] };
        
        const getFilteredFiles = () => {
            switch (fileFilter) {
                case 'uploaded':
                    return files.uploaded.map(file => ({ ...file, type: 'uploaded' }));
                case 'shared':
                    return files.shared.map(file => ({ ...file, type: 'shared' }));
                case 'received':
                    return files.received.map(file => ({ ...file, type: 'received' }));
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
                default:
                    return 'bg-gray-50 border-gray-200';
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
                            <div className="flex space-x-2">
                                {[
                                    { key: 'all', label: 'All Files', icon: DocumentTextIcon },
                                    { key: 'uploaded', label: 'Uploaded', icon: ArrowUpTrayIcon },
                                    { key: 'shared', label: 'Shared', icon: ShareIcon },
                                    { key: 'received', label: 'Received', icon: ArrowDownTrayIcon }
                                ].map(filter => {
                                    const Icon = filter.icon;
                                    return (
                                        <button
                                            key={filter.key}
                                            onClick={() => setFileFilter(filter.key)}
                                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                fileFilter === filter.key
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4 mr-1" />
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
                                                {getFileTypeIcon(file.type)}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                                        {file.name}
                                                    </h4>
                                                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                                        <span>{file.size}</span>
                                                        <span>{file.time}</span>
                                                        {file.user && <span>by {file.user}</span>}
                                                        {file.sharedTo && <span>shared to {file.sharedTo}</span>}
                                                        {file.from && <span>from {file.from}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    file.type === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                                                    file.type === 'shared' ? 'bg-green-100 text-green-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>
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
                                    <title>{`Day ${stat.day}: ${stat.total} files (${stat.uploads} uploads, ${stat.shared} shared)`}</title>
                                </circle>
                            );
                        })}
                    </svg>
                </div>
                
                {/* Legend */}
                <div className="flex justify-center mt-4 space-x-6">
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
                <div className="flex justify-center space-x-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
                        <span>Days with activity</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded mr-2"></div>
                        <span>Selected day</span>
                    </div>
                    <div className="flex items-center">
                        <ArrowUpTrayIcon className="h-4 w-4 text-blue-500 mr-1" />
                        <span>Uploaded</span>
                    </div>
                    <div className="flex items-center">
                        <ShareIcon className="h-4 w-4 text-green-500 mr-1" />
                        <span>Shared</span>
                    </div>
                    <div className="flex items-center">
                        <ArrowDownTrayIcon className="h-4 w-4 text-purple-500 mr-1" />
                        <span>Received</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 ml-1"></div>
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
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Monthly Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.uploads, 0)}
                        </p>
                        <p className="text-blue-600 text-sm">Total Uploads</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.shared, 0)}
                        </p>
                        <p className="text-green-600 text-sm">Total Shared</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-3xl font-bold text-purple-600">
                            {monthlyStats.reduce((sum, stat) => sum + stat.received, 0)}
                        </p>
                        <p className="text-purple-600 text-sm">Total Received</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">
                            {Math.round(monthlyStats.reduce((sum, stat) => sum + stat.total, 0) / monthlyStats.filter(stat => stat.total > 0).length) || 0}
                        </p>
                        <p className="text-orange-600 text-sm">Avg Daily Activity</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-gray-600">
                            {monthlyStats.filter(stat => stat.total > 0).length}
                        </p>
                        <p className="text-gray-600 text-sm">Active Days</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;