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
    ChevronRightIcon,
    ArrowRightIcon,
    StarIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Department Grid Component for Collab Folders
const DepartmentGrid = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user, getUserProfile } = useAuth();
    const [userProfile, setUserProfile] = useState(null);

    // Get the current user's profile
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user?.id) return;
            try {
                const profile = await getUserProfile(user.id);
                setUserProfile(profile);
                
                // Test function to directly check for shared files
                if (profile?.d_uuid) {
                    testSharedFiles(profile.d_uuid);
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
            }
        };

        fetchUserProfile();
    }, [user?.id, getUserProfile]);
    
    // Test function to directly query for shared files
    const testSharedFiles = async (deptId) => {
        try {
            console.log("Testing shared files for department:", deptId);
            
            // Get all users to identify department ownership
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('uuid, name, d_uuid');
                
            if (usersError) {
                console.error("Error fetching users:", usersError);
            } else {
                console.log("Users data:", users);
            }
            
            // Get all departments
            const { data: allDepts, error: allDeptsError } = await supabase
                .from('department')
                .select('*');
                
            if (allDeptsError) {
                console.error("Error fetching departments:", allDeptsError);
            } else {
                console.log("All departments:", allDepts);
            }
            
            // Simple query to get all file_department entries
            const { data: allFileDepts, error: allFileDeptsError } = await supabase
                .from('file_department')
                .select('*');
                
            if (allFileDeptsError) {
                console.error("Error querying file_department:", allFileDeptsError);
            } else {
                console.log("All file_department entries:", allFileDepts);
                
                // Check if there are any entries at all for this department
                const entriesForThisDept = allFileDepts.filter(entry => entry.d_uuid === deptId);
                console.log(`Found ${entriesForThisDept.length} file_department entries for this department`);
            }
            
                // Check file table for actual files
                const { data: fileSample, error: fileSampleError } = await supabase
                    .from('file')
                    .select('*')
                    .limit(10);
                    
                if (fileSampleError) {
                    console.error("Error fetching files:", fileSampleError);
                } else {
                    console.log(`Found ${fileSample.length} files in the file table:`, fileSample);
                    
                    // Now let's check the file_department table to find out which files are shared with this dept
                    const { data: fileDeptShared, error: fileDeptError } = await supabase
                        .from('file_department')
                        .select('*')
                        .eq('d_uuid', deptId);
                        
                    if (fileDeptError) {
                        console.error("Error checking file_department:", fileDeptError);
                    } else {
                        console.log(`Found ${fileDeptShared.length} file_department entries for this department:`, fileDeptShared);
                        
                        if (fileDeptShared.length > 0) {
                            // Get all the file_department entries for the files shared with this department
                            // to determine their source departments
                            const sharedFileIds = fileDeptShared.map(fd => fd.f_uuid);
                            
                            const { data: allFileDeptEntries, error: allFDError } = await supabase
                                .from('file_department')
                                .select('*')
                                .in('f_uuid', sharedFileIds);
                                
                            if (allFDError) {
                                console.error("Error checking all file_department entries:", allFDError);
                            } else {
                                console.log("All file_department entries for shared files:", allFileDeptEntries);
                                
                                // Group the entries by file_uuid to see all departments each file is shared with
                                const fileSharing = {};
                                allFileDeptEntries.forEach(entry => {
                                    if (!fileSharing[entry.f_uuid]) {
                                        fileSharing[entry.f_uuid] = [];
                                    }
                                    fileSharing[entry.f_uuid].push(entry.d_uuid);
                                });
                                
                                console.log("File sharing map (which files are shared with which departments):", fileSharing);
                                
                                // For each file shared with this department, determine its source department
                                const { data: allDepts, error: allDeptsError } = await supabase
                                    .from('department')
                                    .select('*');
                                    
                                if (allDeptsError) {
                                    console.error("Error fetching departments:", allDeptsError);
                                } else {
                                    // Create lookup maps
                                    const deptMap = {};
                                    allDepts.forEach(d => deptMap[d.d_uuid] = d.d_name);
                                    
                                    const fileSourceDepts = {};
                                    
                                    // For each file, try to determine source department (not this department)
                                    Object.keys(fileSharing).forEach(fileId => {
                                        const deptIds = fileSharing[fileId];
                                        const sourceDeptId = deptIds.find(did => did !== deptId);
                                        if (sourceDeptId) {
                                            fileSourceDepts[fileId] = {
                                                deptId: sourceDeptId,
                                                deptName: deptMap[sourceDeptId] || "Unknown"
                                            };
                                        }
                                    });
                                    
                                    console.log("Determined source departments for shared files:", fileSourceDepts);
                                    
                                    // Check how many files we can properly categorize
                                    const filesToShow = Object.keys(fileSourceDepts).length;
                                    console.log(`${filesToShow} out of ${sharedFileIds.length} files can be shown in department folders`);
                                    
                                    if (filesToShow === 0) {
                                        console.log("PROBLEM: None of the shared files can be categorized by source department!");
                                        console.log("SOLUTION: Make sure files are shared between at least two departments.");
                                    }
                                }
                            }
                        }
                    }
                    
                    // Suggest creating test data if no files found
                    if (fileSample.length === 0 || !fileDeptShared || fileDeptShared.length === 0) {
                        console.log("SUGGESTION: No shared files found. You may need to create test data.");
                        console.log("1. Create files in different departments (set d_uuid in the file table)");
                        console.log("2. Share files between departments by adding entries to file_department table");
                        console.log("3. Each entry in file_department should have f_uuid (file) and d_uuid (target department)");
                    }
                }        } catch (e) {
            console.error("Error in test query:", e);
        }
    };

    useEffect(() => {
        const fetchDepartments = async () => {
            if (!userProfile?.d_uuid) return;

            try {
                setLoading(true);
                setError(null);

                const { data: departmentsData, error: deptError } = await supabase
                    .from('department')
                    .select('d_uuid, d_name');

                if (deptError) throw deptError;

                // Filter out the department that the current user belongs to
                const filteredDepartments = departmentsData.filter(dept => dept.d_uuid !== userProfile.d_uuid);
                console.log("Filtered departments (excluding user's department):", filteredDepartments);
                
                // Step 1: Get all shared files for the current user's department
                const { data: fileDeptEntries, error: fileDeptError } = await supabase
                    .from('file_department')
                    .select('*')
                    .eq('d_uuid', userProfile.d_uuid);
                
                if (fileDeptError) {
                    console.error("Error fetching file_department entries:", fileDeptError);
                    throw fileDeptError;
                }
                
                console.log("File department entries shared with this department:", fileDeptEntries);
                
                if (!fileDeptEntries || fileDeptEntries.length === 0) {
                    console.log("No files have been shared with this department");
                    setDepartments(filteredDepartments.map((dept, index) => ({
                        id: dept.d_uuid,
                        name: dept.d_name,
                        color: getColorForIndex(index),
                        initial: dept.d_name.charAt(0).toUpperCase(),
                        files: [],
                        totalFiles: 0,
                        pendingCount: 0,
                        approvedCount: 0,
                        rejectedCount: 0
                    })));
                    setLoading(false);
                    return;
                }
                
                // Step 2: Get the details of all these files
                const fileIds = fileDeptEntries.map(entry => entry.f_uuid);
                
                const { data: filesData, error: filesError } = await supabase
                    .from('file')
                    .select('*, users:uuid (*)')
                    .in('f_uuid', fileIds);
                
                if (filesError) {
                    console.error("Error fetching file details:", filesError);
                    throw filesError;
                }
                
                console.log("Files data:", filesData);
                
                // Step 3: Fetch information about all departments to look up source departments
                const { data: allDepartments, error: allDeptsError } = await supabase
                    .from('department')
                    .select('*');
                    
                if (allDeptsError) {
                    console.error("Error fetching all departments:", allDeptsError);
                    throw allDeptsError;
                }
                
                // Create a lookup map of departments
                const departmentMap = allDepartments.reduce((acc, dept) => {
                    acc[dept.d_uuid] = dept;
                    return acc;
                }, {});
                
                // Create a map of department IDs to their names for easier reference
                const deptIdToNameMap = {};
                allDepartments.forEach(dept => {
                    deptIdToNameMap[dept.d_uuid] = dept.d_name;
                });
                
                console.log("Department map:", departmentMap);
                
                // Step 4: Get the source department information for each file
                // We need to get the original department (source) for each file
                const { data: sourceFileDepts, error: sourceFileDeptsError } = await supabase
                    .from('file_department')
                    .select('f_uuid, d_uuid')
                    .in('f_uuid', fileIds);
                    
                if (sourceFileDeptsError) {
                    console.error("Error fetching source departments:", sourceFileDeptsError);
                    throw sourceFileDeptsError;
                }
                
                console.log("Source file departments:", sourceFileDepts);
                
                // Create a map of file to source department
                const fileSourceMap = {};
                
                // Group all entries by file ID to find all departments associated with each file
                const fileToDeptsMap = {};
                sourceFileDepts.forEach(entry => {
                    if (!fileToDeptsMap[entry.f_uuid]) {
                        fileToDeptsMap[entry.f_uuid] = [];
                    }
                    fileToDeptsMap[entry.f_uuid].push(entry.d_uuid);
                });
                
                // For each file, determine the source department (the one that's not the user's department)
                for (const [fileId, deptIds] of Object.entries(fileToDeptsMap)) {
                    // If there are multiple departments, find one that's not the user's department
                    const sourceDept = deptIds.find(deptId => deptId !== userProfile.d_uuid);
                    
                    // If we found a non-user department, use it as the source
                    if (sourceDept) {
                        fileSourceMap[fileId] = sourceDept;
                    } 
                    // Otherwise, use the file's actual department from filesData
                    else {
                        const fileData = filesData.find(f => f.f_uuid === fileId);
                        if (fileData && fileData.d_uuid && fileData.d_uuid !== userProfile.d_uuid) {
                            fileSourceMap[fileId] = fileData.d_uuid;
                        }
                    }
                }
                
                console.log("File source map (improved):", fileSourceMap);
                
                // Step 5: If users are not loaded properly, fetch them separately
                let usersData = {};
                
                // If the users aren't already included in the files data
                if (filesData.length > 0 && (!filesData[0].users || !filesData[0].users.name)) {
                    const userIds = filesData.filter(f => f.uuid).map(f => f.uuid);
                    
                    if (userIds.length > 0) {
                        const { data: users, error: usersError } = await supabase
                            .from('users')
                            .select('*')
                            .in('uuid', userIds);
                        
                        if (!usersError && users) {
                            // Convert to a dictionary for easy lookup
                            usersData = users.reduce((acc, user) => {
                                acc[user.uuid] = user;
                                return acc;
                            }, {});
                        }
                    }
                }
                
                // Step 6: Join the file department entries with file details
                const sharedFilesData = fileDeptEntries.map(fileDept => {
                    const fileDetails = filesData.find(f => f.f_uuid === fileDept.f_uuid);
                    if (!fileDetails) return null;
                    
                    // Get the user info either from the joined data or our separately fetched data
                    const user = fileDetails.users || usersData[fileDetails.uuid];
                    
                    // First try to get source from our map, then from the file itself
                    let sourceDeptId = fileSourceMap[fileDept.f_uuid];
                    
                    // If no source department found, use the file's original department
                    if (!sourceDeptId && fileDetails) {
                        sourceDeptId = fileDetails.d_uuid;
                        // Only if it's not the current user's department
                        if (sourceDeptId === userProfile.d_uuid) {
                            sourceDeptId = null;
                        }
                    }
                    
                    // If we have a department name, use it; otherwise mark as Unknown
                    const sourceDeptName = sourceDeptId ? deptIdToNameMap[sourceDeptId] || "Unknown Department" : "Unknown Department";
                    
                    return {
                        fd_uuid: fileDept.fd_uuid,
                        f_uuid: fileDept.f_uuid,
                        is_approved: fileDept.is_approved,
                        source_d_uuid: sourceDeptId,
                        source_department: sourceDeptId ? departmentMap[sourceDeptId] : null,
                        source_dept_name: sourceDeptName,
                        file: {
                            ...fileDetails,
                            uploader: user
                        }
                    };
                }).filter(Boolean);
                
                console.log("Processed shared files data:", sharedFilesData);
                
                // Step 5: Group files by their source department
                const filesBySourceDept = {};
                
                // Initialize all departments with empty file arrays
                filteredDepartments.forEach(dept => {
                    filesBySourceDept[dept.d_uuid] = [];
                });
                
                // Get the first department as a default for null or missing department IDs
                const defaultDepartment = filteredDepartments.length > 0 ? filteredDepartments[0].d_uuid : null;
                
                // Always create an "Unknown" department for files that can't be assigned
                let hasUnknownDept = true;
                filesBySourceDept["unknown"] = [];
                console.log("Added 'Unknown' department for files with missing department info");
                
                console.log("DEBUG: File distribution starting with departments:", 
                    Object.keys(filesBySourceDept).map(id => 
                        `${id}: ${id === "unknown" ? "Unknown Source" : (deptIdToNameMap[id] || 'Unknown')}`
                    )
                );
                
                // Organize files by the source department
                sharedFilesData.forEach(fileData => {
                    // Use the source department we determined earlier
                    let sourceDeptId = fileData.source_d_uuid;
                    let sourceDeptName = fileData.source_dept_name || "Unknown Department";
                    
                    console.log(`DEBUG: Assigning file ${fileData.file.f_name || 'Unnamed'} to dept: ${sourceDeptId || 'unknown'} (${sourceDeptName})`);
                    
                    console.log("Processing file:", fileData.file.f_name, 
                              "from department:", sourceDeptId, 
                              "(" + sourceDeptName + ")");
                    
                    // Get uploader info if available
                    let uploaderName = "Unknown";
                    let uploaderPosition = "Unknown";
                    
                    if (fileData.file.uploader) {
                        uploaderName = fileData.file.uploader.name || "Unknown";
                        uploaderPosition = fileData.file.uploader.position || "Unknown";
                    }
                    
                    // Handle department assignment logic 
                    if (!sourceDeptId) {
                        // No source department specified
                        console.log(`File ${fileData.file.f_name || fileData.f_uuid} has no source department. Assigning to unknown.`);
                        sourceDeptId = "unknown";
                        sourceDeptName = "Unknown Source";
                    } else if (sourceDeptId === userProfile.d_uuid) {
                        // File is from user's own department - should not show up here
                        console.log(`File ${fileData.file.f_name || fileData.f_uuid} is from user's own department. Assigning to unknown.`);
                        sourceDeptId = "unknown";
                        sourceDeptName = "Unknown Source";
                    } else if (!filesBySourceDept.hasOwnProperty(sourceDeptId)) {
                        // Department not in our tracked departments
                        console.log(`File ${fileData.file.f_name || fileData.f_uuid} has untracked department ID: ${sourceDeptId}. Assigning to unknown.`);
                        sourceDeptId = "unknown";
                        sourceDeptName = "Unknown Source";
                    }
                    
                    // Add file to appropriate department bucket
                    const fileEntry = {
                        fd_uuid: fileData.fd_uuid,
                        f_uuid: fileData.f_uuid,
                        is_approved: fileData.is_approved,
                        fileName: fileData.file.f_name,
                        createdAt: fileData.file.created_at,
                        uploadedBy: uploaderName,
                        uploaderPosition: uploaderPosition,
                        sourceDepartment: sourceDeptName,
                        // Include original data for debugging
                        originalSourceId: fileData.source_d_uuid,
                        fileDeptId: fileData.file.d_uuid
                    };
                    
                    console.log(`Adding file ${fileData.file.f_name} to department group: ${sourceDeptId}`);
                    filesBySourceDept[sourceDeptId].push(fileEntry);
                });
                
                console.log("Files organized by source department:", filesBySourceDept);
                
                // Generate department objects with their files and stats
                let departmentsWithFiles = filteredDepartments.map((dept, index) => {
                    const deptFiles = filesBySourceDept[dept.d_uuid] || [];
                    
                    // Count by approval status (using the new text-based status)
                    const pendingCount = deptFiles.filter(f => f.is_approved === 'pending' || f.is_approved === null).length;
                    const approvedCount = deptFiles.filter(f => f.is_approved === 'approved').length;
                    const rejectedCount = deptFiles.filter(f => f.is_approved === 'rejected').length;
                    
                    return {
                        id: dept.d_uuid,
                        name: dept.d_name,
                        color: getColorForIndex(index),
                        initial: dept.d_name.charAt(0).toUpperCase(),
                        files: deptFiles,
                        totalFiles: deptFiles.length,
                        pendingCount,
                        approvedCount,
                        rejectedCount
                    };
                });
                
                // Add Unknown department for files with missing department info if it exists
                if (filesBySourceDept["unknown"] && filesBySourceDept["unknown"].length > 0) {
                    const unknownFiles = filesBySourceDept["unknown"];
                    const pendingCount = unknownFiles.filter(f => f.is_approved === 'pending' || f.is_approved === null).length;
                    const approvedCount = unknownFiles.filter(f => f.is_approved === 'approved').length;
                    const rejectedCount = unknownFiles.filter(f => f.is_approved === 'rejected').length;
                    
                    departmentsWithFiles.push({
                        id: "unknown",
                        name: "Unknown Source",
                        color: "bg-gray-100 text-gray-600",
                        initial: "?",
                        files: unknownFiles,
                        totalFiles: unknownFiles.length,
                        pendingCount,
                        approvedCount,
                        rejectedCount
                    });
                    
                    console.log("Added Unknown department with", unknownFiles.length, "files");
                }
                
                // Sort files within each department by date (newest first)
                Object.keys(filesBySourceDept).forEach(deptId => {
                    filesBySourceDept[deptId].sort((a, b) => 
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                });
                
                // Sort departments by number of files (most files first)
                // But ensure "Unknown Source" is always at the end
                departmentsWithFiles = departmentsWithFiles.sort((a, b) => {
                    // If one of them is the "Unknown Source" department
                    if (a.id === "unknown") return 1; // Move 'a' to the end
                    if (b.id === "unknown") return -1; // Move 'b' to the end
                    
                    // For normal departments, sort by number of files
                    return b.totalFiles - a.totalFiles;
                });

                setDepartments(departmentsWithFiles);
            } catch (e) {
                console.error("Error fetching departments:", e);
                setError("Failed to load departments");
            } finally {
                setLoading(false);
            }
        };

        if (userProfile?.d_uuid) {
            fetchDepartments();
        }
    }, [userProfile?.d_uuid]);    

    // Color palette for department cards
    const getColorForIndex = (index) => {
        const colors = [
            'bg-blue-100 text-blue-600',
            'bg-green-100 text-green-600',
            'bg-purple-100 text-purple-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
            'bg-indigo-100 text-indigo-600',
            'bg-teal-100 text-teal-600',
            'bg-orange-100 text-orange-600'
        ];
        return colors[index % colors.length];
    };

    // Navigate to department details
    const handleDepartmentClick = (deptId) => {
        navigate(`/department-collab/${deptId}`);
    };

    // State for horizontal scrolling
    const [deptScrollIndex, setDeptScrollIndex] = useState(0);
    const DEPT_ITEMS_PER_VIEW = 4;

    // Scroll navigation functions
    const scrollDeptLeft = () => {
        setDeptScrollIndex(prev => Math.max(0, prev - 1));
    };

    const scrollDeptRight = () => {
        const maxIndex = Math.max(0, departments.length - DEPT_ITEMS_PER_VIEW);
        setDeptScrollIndex(prev => Math.min(maxIndex, prev + 1));
    };

    if (loading) {
        return <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading departments...</p>
        </div>;
    }

    if (error) {
        return <div className="text-red-500 py-4 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (departments.length === 0) {
        return <div className="text-gray-500 py-4 text-center">
            <BuildingOfficeIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p>No departments found</p>
        </div>;
    }

    // Check if there are any files in any department
    const totalFilesAcrossDepts = departments.reduce((total, dept) => total + dept.totalFiles, 0);
    
    if (totalFilesAcrossDepts === 0) {
        return (
            <div className="text-gray-500 py-4 text-center bg-gray-50 rounded-lg border border-gray-200 p-6">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Shared Files Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    There are no files shared with your department from other departments. 
                    Files will appear here when other departments share documents with you.
                </p>
                <p className="mt-4">
                    <button 
                        className="text-blue-600 hover:text-blue-800 transition-colors font-medium flex items-center mx-auto"
                        onClick={() => window.location.reload()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            {departments.length > DEPT_ITEMS_PER_VIEW && (
                <div className="flex justify-end mb-3 space-x-2">
                    <button
                        onClick={scrollDeptLeft}
                        disabled={deptScrollIndex === 0}
                        className={`p-1.5 rounded-full border shadow-sm ${
                            deptScrollIndex === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                        aria-label="Scroll left"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={scrollDeptRight}
                        disabled={deptScrollIndex >= departments.length - DEPT_ITEMS_PER_VIEW}
                        className={`p-1.5 rounded-full border shadow-sm ${
                            deptScrollIndex >= departments.length - DEPT_ITEMS_PER_VIEW
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                        aria-label="Scroll right"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
            <div className="overflow-hidden">
                <div
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${deptScrollIndex * 25}%)` }}
                >
                    {departments.map((dept) => (
                        <div
                            key={dept.id}
                            onClick={() => handleDepartmentClick(dept.id)}
                            className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2"
                        >
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`h-12 w-12 rounded-full ${dept.color} flex items-center justify-center font-bold text-xl shadow-sm`}>
                                        {dept.initial}
                                    </div>
                                    <div className="bg-gray-100 p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors">
                                        <ArrowRightIcon className="h-4 w-4" />
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-2 truncate">
                                    {dept.name}
                                </h3>
                                {dept.totalFiles > 0 ? (
                                    <div className="space-y-1.5 mt-3">
                                        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                            <span className="font-medium">Total Files</span>
                                            <span className="bg-blue-100 px-1.5 py-0.5 rounded-full font-medium">{dept.totalFiles}</span>
                                        </div>
                                        {dept.pendingCount > 0 && (
                                            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                                                <span className="font-medium">Pending</span>
                                                <span className="bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">{dept.pendingCount}</span>
                                            </div>
                                        )}
                                        {dept.approvedCount > 0 && (
                                            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-100">
                                                <span className="font-medium">Approved</span>
                                                <span className="bg-green-100 px-1.5 py-0.5 rounded-full font-medium">{dept.approvedCount}</span>
                                            </div>
                                        )}
                                        {dept.rejectedCount > 0 && (
                                            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-100">
                                                <span className="font-medium">Rejected</span>
                                                <span className="bg-red-100 px-1.5 py-0.5 rounded-full font-medium">{dept.rejectedCount}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-sm text-gray-500">
                                        No collaboration files
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HeadDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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
    const [quickShareDeptSearch, setQuickShareDeptSearch] = useState('');
    const [quickShareFilteredDepts, setQuickShareFilteredDepts] = useState([]);
    const [selectedQuickShareDept, setSelectedQuickShareDept] = useState(null);



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
            const totalItems = importantDocuments.length;
            const maxIndex = Math.max(0, totalItems - ITEMS_PER_VIEW);
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
        const totalItems = importantDocuments.length;
        const maxIndex = Math.max(0, totalItems - ITEMS_PER_VIEW);
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
                                    className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-md transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
                                        className={`mt-1 w-full p-3 border border-gray-300 rounded-lg ${isMultiFile ? "bg-gray-100 cursor-not-allowed" : ""
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
                                <div className={`p-3 rounded-lg ${uploadStatus.type === "success"
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

    // Handle department search for Quick Share
    useEffect(() => {
        if (quickShareDeptSearch && quickShareDeptSearch.trim() !== '') {
            const fetchDepartments = async () => {
                try {
                    const { data, error } = await supabase
                        .from('department')
                        .select('d_uuid, d_name')
                        .ilike('d_name', `%${quickShareDeptSearch}%`);
                    
                    if (error) throw error;
                    setQuickShareFilteredDepts(data || []);
                } catch (error) {
                    console.error('Error searching departments:', error);
                    setQuickShareFilteredDepts([]);
                }
            };
            
            fetchDepartments();
        } else {
            setQuickShareFilteredDepts([]);
        }
    }, [quickShareDeptSearch]);

    // Approval functions for pending files
    const handleApproveFile = async (fileId) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ is_approved: 'approved' })
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
                .update({ is_approved: 'rejected' })
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
                        <h2 className="text-xl font-semibold text-gray-900">Important Documents</h2>
                        {importantDocuments.length > ITEMS_PER_VIEW && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={scrollDocumentsLeft}
                                    disabled={documentsScrollIndex === 0}
                                    className={`p-1.5 rounded-full border shadow-sm ${documentsScrollIndex === 0
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                    aria-label="Scroll left"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={scrollDocumentsRight}
                                    disabled={documentsScrollIndex >= (importantDocuments.length - ITEMS_PER_VIEW)}
                                    className={`p-1.5 rounded-full border shadow-sm ${documentsScrollIndex >= (importantDocuments.length - ITEMS_PER_VIEW)
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                        }`}
                                    aria-label="Scroll right"
                                >
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-300 ease-in-out"
                            style={{ transform: `translateX(-${documentsScrollIndex * 25}%)` }}
                        >


                            {/* show favorites documents */}
                            {importantDocuments.map((doc) => (
                                <div key={doc.f_uuid} className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2">
                                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                                <DocumentTextIcon className="h-6 w-6" />
                                            </div>
                                            <div className="flex space-x-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => window.open(`/file/${doc.f_uuid}`, "_blank", "noopener,noreferrer")}
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs font-medium flex items-center"
                                                >
                                                    <EyeIcon className="h-3 w-3 mr-1" />
                                                    View
                                                </button>
                                                <button 
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium flex items-center"
                                                    onClick={() => {
                                                        navigate("/summary", { state: { f_uuid: doc.f_uuid } });
                                                    }}
                                                >
                                                    <DocumentTextIcon className="h-3 w-3 mr-1" />
                                                    Summary
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                                            {doc.f_name}
                                        </h3>
                                        <p className="text-sm text-gray-600 flex items-center">
                                            <StarIcon className="h-4 w-4 text-yellow-500 mr-1.5" />
                                            Important document
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collab Folders Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Collaboration Departments</h2>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                        <DepartmentGrid />
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Quick Share */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">Quick Share</h2>
                                <div className="p-1.5 rounded-full bg-teal-50 text-teal-600">
                                    <ShareIcon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Department Head</label>
                                    {/* Department Search */}
                                    <div className="relative mb-3">
                                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search departments..."
                                            value={quickShareDeptSearch || ''}
                                            onChange={(e) => setQuickShareDeptSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        
                                        {/* Department search results dropdown */}
                                        {quickShareDeptSearch && quickShareFilteredDepts.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {quickShareFilteredDepts.map(dept => (
                                                    <div 
                                                        key={dept.d_uuid} 
                                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedQuickShareDept(dept);
                                                            setQuickShareDeptSearch('');
                                                        }}
                                                    >
                                                        {dept.d_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Selected department display */}
                                    {selectedQuickShareDept && (
                                        <div className="flex items-center mt-2 bg-blue-50 px-3 py-2 rounded-md">
                                            <BuildingOfficeIcon className="h-4 w-4 text-blue-600 mr-2" />
                                            <span className="text-sm text-blue-700">{selectedQuickShareDept.d_name}</span>
                                            <button
                                                type="button"
                                                className="ml-auto text-blue-500 hover:text-blue-700"
                                                onClick={() => setSelectedQuickShareDept(null)}
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                    <div className="relative">
                                        <select className="w-full border border-gray-300 rounded-md px-3 py-2 appearance-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white pr-10">
                                            <option value="">General</option>
                                            <option value="emergency">Emergency</option>
                                            <option value="budget">Budget</option>
                                            <option value="hr">Policy Update</option>
                                            <option value="general">Important</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                                            <ChevronDownIcon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 h-20 resize-none"
                                        placeholder="Add a urgent message..."
                                    ></textarea>
                                </div>
                                <button 
                                    className={`w-full py-2.5 px-4 rounded-md font-medium flex items-center justify-center gap-2 transition-colors shadow-sm ${
                                        selectedQuickShareDept 
                                            ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={!selectedQuickShareDept}
                                >
                                    <ShareIcon className="h-4 w-4" />
                                    Share Message
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Shared Files */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <h2 className="text-xl font-semibold text-gray-900">Shared Files</h2>
                                    {sharedFiles.length > 0 && (
                                        <span className="ml-3 text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                            {sharedFiles.length} files
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search files..."
                                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
                                        />
                                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                                    </div>
                                </div>
                            </div>

                            {sharedFiles.length > 0 ? (
                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared By</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {sharedFiles.map((file) => (
                                                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center">
                                                                    {getFileTypeIcon(file.name)}
                                                                </div>
                                                                <div className="ml-3">
                                                                    <div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[180px]">{file.name}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{file.sharedBy}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                                {file.fromDepartment}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{file.dateShared}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${file.status === 'Done'
                                                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                }`}>
                                                                {file.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open(`/file/${file.id}`, "_blank", "noopener,noreferrer")}
                                                                    className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                >
                                                                    <EyeIcon className="h-3.5 w-3.5 mr-1" />
                                                                    View
                                                                </button>
                                                                <button
                                                                    className="inline-flex items-center px-2 py-1 text-xs border border-blue-300 rounded-md shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                    onClick={() => {
                                                                        navigate("/summary", { state: { f_uuid: file.id } });
                                                                    }}
                                                                >
                                                                    <DocumentTextIcon className="h-3.5 w-3.5 mr-1" />
                                                                    Summary
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-md border border-gray-200">
                                    <DocumentArrowDownIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 font-medium">No shared files found</p>
                                    <p className="text-xs text-gray-500 mt-1">Files shared with you will appear here</p>
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
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${files.length > 1 ? 'bg-gray-100 cursor-not-allowed' : ''
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
                                        className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
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
                                    <div className={`p-3 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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