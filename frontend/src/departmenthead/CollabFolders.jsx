import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';
import { CheckCircleIcon, XCircleIcon, DocumentTextIcon, StarIcon as StarOutline, BuildingOfficeIcon, EyeIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// Error boundary component to catch rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("COMPONENT ERROR:", error);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded bg-red-50 text-red-800">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <details className="whitespace-pre-wrap">
            <summary className="cursor-pointer font-medium">Show error details</summary>
            <p className="mt-2 text-sm font-mono">{this.state.error && this.state.error.toString()}</p>
            <p className="mt-2 text-sm font-mono">{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const StatusPill = ({ value }) => {
  const meta = value === true
    ? { label: 'Approved', cls: 'text-green-700 bg-green-50 border-green-200' }
    : value === false
    ? { label: 'Rejected', cls: 'text-red-700 bg-red-50 border-red-200' }
    : { label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  return <span className={`text-xs px-2 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>;
};

const CollabList = ({ title, rows, isHead, onApprove, onReject, importantMap, toggleImportant }) => {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  
  // Use horizontal scrolling when there are more than 4 cards
  const needsScroll = rows.length > 4 && viewMode === 'cards';
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-0.5 rounded">
            <button 
              onClick={() => setViewMode('cards')} 
              className={`px-2 py-1 text-xs rounded ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              Cards
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`px-2 py-1 text-xs rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              List
            </button>
          </div>
          <span className="text-xs text-gray-500">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      
      {rows.length === 0 ? (
        <div className="text-gray-600 text-sm">No items.</div>
      ) : viewMode === 'list' ? (
        // List view
        <ul className="divide-y divide-gray-200 bg-white border rounded">
          {rows.map((r) => (
            <li key={r.fd_uuid} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => toggleImportant(r.fd_uuid)} className="p-1 rounded hover:bg-gray-100" title={importantMap[r.fd_uuid] ? 'Unmark' : 'Mark Important'}>
                  {importantMap[r.fd_uuid] ? <StarSolid className="h-5 w-5 text-yellow-500" /> : <StarOutline className="h-5 w-5 text-gray-400" />}
                </button>
                <div className="p-2 rounded bg-blue-50 text-blue-600 flex-shrink-0"><DocumentTextIcon className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a href={`/file/${r.f_uuid}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline truncate">
                      {r.f_name}
                    </a>
                    <StatusPill value={r.is_approved} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Shared on {new Date(r.shared_at).toLocaleString()}
                    {r.uploader && (
                      <span> by <span className="font-medium">{r.uploader}</span> ({r.position})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Action buttons */}
                <button 
                  onClick={() => window.open(`/file/${r.f_uuid}`, '_blank')} 
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  <EyeIcon className="h-4 w-4" /> View
                </button>
                <button 
                  onClick={() => window.open(`/summary/${r.f_uuid}`, '_blank')} 
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-purple-600 text-purple-700 hover:bg-purple-50"
                >
                  <DocumentChartBarIcon className="h-4 w-4" /> Summary
                </button>
                {isHead && r.canDecide && (
                  <>
                    <button onClick={() => onApprove(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50" disabled={r.is_approved === true}>
                      <CheckCircleIcon className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => onReject(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50" disabled={r.is_approved === false}>
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        // Card view with horizontal scrolling if needed
        <div className={`${needsScroll ? 'flex overflow-x-auto pb-3 -mx-3 px-3 no-scrollbar' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4'} gap-4`}>
          {rows.map((r) => (
            <div key={r.fd_uuid} className={`${needsScroll ? 'min-w-[280px] max-w-[280px]' : ''} bg-white border rounded p-4 flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded bg-blue-50 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleImportant(r.fd_uuid)} className="p-1 rounded hover:bg-gray-100" title={importantMap[r.fd_uuid] ? 'Unmark' : 'Mark Important'}>
                    {importantMap[r.fd_uuid] ? <StarSolid className="h-5 w-5 text-yellow-500" /> : <StarOutline className="h-5 w-5 text-gray-400" />}
                  </button>
                  <StatusPill value={r.is_approved} />
                </div>
              </div>
              
              <h4 className="font-medium text-gray-900 truncate mb-1">{r.f_name}</h4>
              <div className="text-xs text-gray-500 mb-2">
                Shared on {new Date(r.shared_at).toLocaleString()}
              </div>
              
              {r.uploader && (
                <div className="text-xs text-gray-600 mb-4 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">{r.uploader}</span> ({r.position})
                </div>
              )}
              
              <div className="mt-auto pt-3 border-t flex flex-wrap gap-2">
                <button 
                  onClick={() => window.open(`/file/${r.f_uuid}`, '_blank')} 
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-blue-600 text-blue-700 hover:bg-blue-50 flex-grow text-center justify-center"
                >
                  <EyeIcon className="h-4 w-4" /> View
                </button>
                <button 
                  onClick={() => window.open(`/summary/${r.f_uuid}`, '_blank')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-purple-600 text-purple-700 hover:bg-purple-50 flex-grow text-center justify-center"
                >
                  <DocumentChartBarIcon className="h-4 w-4" /> Summary
                </button>
                {isHead && r.canDecide && (
                  <div className="flex gap-2 w-full mt-2">
                    <button onClick={() => onApprove(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50 flex-grow justify-center" disabled={r.is_approved === true}>
                      <CheckCircleIcon className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => onReject(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50 flex-grow justify-center" disabled={r.is_approved === false}>
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CollabFolders = () => {
  console.log("INITIAL MOUNT: CollabFolders component starting to render");
  
  const { user, getUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [deptMap, setDeptMap] = useState({});
  const [importantMap, setImportantMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fd_important_map') || '{}');
    } catch {
      return {};
    }
  });
  const [testResults, setTestResults] = useState(null);
  const [showTestResults, setShowTestResults] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [summaryVisible, setSummaryVisible] = useState(false);
  
  // Add a debug log entry with timestamp
  const addDebugLog = (message) => {
    const timestamp = new Date().toISOString();
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const toggleSummary = (file) => {
    setSelectedFile(file);
    setSummaryVisible(!summaryVisible);
  };

  const isHead = useMemo(() => profile?.position === 'head', [profile]);
  
  // Original comprehensive database test function
  const runDatabaseTest = async () => {
    if (!user?.id) {
      setTestResults("ERROR: No user ID available");
      return;
    }
    
    try {
      setTestResults("Running comprehensive database tests...");
      addDebugLog("Starting comprehensive database tests");
      
      // Test 1: Check user profile
      const userData = await getUserProfile(user.id);
      if (!userData) {
        setTestResults("Test FAILED: Could not retrieve user profile");
        return;
      }
      
      // Test 2: Verify department exists
      if (!userData.d_uuid) {
        setTestResults("Test FAILED: User has no department assigned");
        return;
      }
      
      // Test 3: Direct query to file_department table
      const { data: fdData, error: fdError } = await supabase
        .from('file_department')
        .select('*')
        .limit(5);
      
      if (fdError) {
        setTestResults(`Test FAILED: Cannot query file_department table: ${fdError.message}`);
        return;
      }
      
      // Test 4: Check if files exist in the system at all
      const { data: fileData, error: fileError } = await supabase
        .from('file')
        .select('*')
        .limit(5);
      
      if (fileError) {
        setTestResults(`Test FAILED: Cannot query file table: ${fileError.message}`);
        return;
      }
      
      // Test 5: Check department records
      const { data: deptData, error: deptError } = await supabase
        .from('department')
        .select('*');
      
      if (deptError) {
        setTestResults(`Test FAILED: Cannot query department table: ${deptError.message}`);
        return;
      }

      // Test 6: Get all file_department entries for user's department
      const { data: fileDeptEntries, error: fileDeptError } = await supabase
        .from('file_department')
        .select('*')
        .eq('d_uuid', userData.d_uuid);
      
      if (fileDeptError) {
        setTestResults(`Test FAILED: Cannot get file_department entries: ${fileDeptError.message}`);
        return;
      }

      // Get file IDs for files shared with my department
      const fileIds = fileDeptEntries.map(entry => entry.f_uuid);
      
      // Test 7: Get file_department entries for all these files to determine sources
      const { data: allFileDeptEntries, error: allFDError } = await supabase
        .from('file_department')
        .select('*')
        .in('f_uuid', fileIds);
      
      if (allFDError) {
        setTestResults(`Test FAILED: Cannot get all file_department entries: ${allFDError.message}`);
        return;
      }

      // Group the entries by file_uuid to see all departments each file is shared with
      const fileSharing = {};
      allFileDeptEntries.forEach(entry => {
        if (!fileSharing[entry.f_uuid]) {
          fileSharing[entry.f_uuid] = [];
        }
        fileSharing[entry.f_uuid].push(entry.d_uuid);
      });
      
      // For each file, determine its source department
      const fileSourceDepts = {};
      Object.keys(fileSharing).forEach(fileId => {
        const deptIds = fileSharing[fileId];
        const sourceDeptId = deptIds.find(did => did !== userData.d_uuid);
        if (sourceDeptId) {
          const deptName = deptData.find(d => d.d_uuid === sourceDeptId)?.d_name || "Unknown";
          fileSourceDepts[fileId] = {
            deptId: sourceDeptId,
            deptName: deptName
          };
        }
      });
      
      // Test 8: Get all files owned by my department
      const { data: myDeptFiles, error: myFilesError } = await supabase
        .from('file')
        .select('*')
        .eq('d_uuid', userData.d_uuid);
      
      if (myFilesError) {
        setTestResults(`Test FAILED: Cannot get department files: ${myFilesError.message}`);
        return;
      }
      
      // Get all file_department entries for my department's files
      const myFileIds = myDeptFiles.map(f => f.f_uuid);
      
      const { data: sentEntries, error: sentError } = await supabase
        .from('file_department')
        .select('*')
        .in('f_uuid', myFileIds)
        .neq('d_uuid', userData.d_uuid);
        
      if (sentError && myFileIds.length > 0) {
        setTestResults(`Test FAILED: Cannot get sent file entries: ${sentError.message}`);
        return;
      }
      
      // Compile test results
      setTestResults(`
        Test PASSED: Connection successful
        
        User info: 
        - ID: ${user.id}
        - Department: ${userData.d_uuid || 'Not assigned'}
        - Position: ${userData.position || 'Not specified'}
        
        Records summary:
        - Files in system: ${fileData?.length || 0} (showing first 5)
        - Department sharing records: ${fdData?.length || 0} (showing first 5)
        - Total departments: ${deptData?.length || 0}
        
        Department names:
        ${(deptData || []).map(d => `- ${d.d_name} (${d.d_uuid})`).join('\n')}
        
        Files shared with my department:
        - Total entries: ${fileDeptEntries?.length || 0}
        - Unique file IDs: ${fileIds?.length || 0}
        
        Files that can be categorized by source department:
        - Total: ${Object.keys(fileSourceDepts).length}
        ${Object.entries(fileSourceDepts).map(([fileId, info]) => 
          `- File ID: ${fileId} from ${info.deptName} (${info.deptId})`
        ).join('\n')}
        
        Files owned by my department:
        - Total: ${myDeptFiles?.length || 0}
        
        Files from my department shared with other departments:
        - Total: ${sentEntries?.length || 0}
        
        File sharing map (which files are shared with which departments):
        ${Object.entries(fileSharing).map(([fileId, deptIds]) => 
          `- File ${fileId} shared with departments: ${deptIds.join(', ')}`
        ).join('\n')}
        
        Sample files:
        ${(fileData || []).map(f => `- ${f.f_name} (${f.f_uuid})`).join('\n')}
      `);
    } catch (e) {
      setTestResults(`Test ERROR: ${e.message}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      console.log("NETWORK TEST: Starting profile fetch");
      
      if (!user?.id) {
        console.error("NETWORK TEST: No user ID available, cannot fetch profile");
        return;
      }
      
      try {
        console.log("NETWORK TEST: Attempting to fetch user profile for ID:", user.id);
        const data = await getUserProfile(user.id);
        console.log("NETWORK TEST: Profile fetch result:", data);
        setProfile(data);
      } catch (e) {
        console.error("NETWORK TEST: Profile fetch error:", e);
        setError('Failed to load profile: ' + e.message);
      }
    };
    
    // Network diagnostics
    console.log("NETWORK TEST: Component mounted, checking network status");
    
    // Test basic network connectivity
    fetch('https://www.google.com/favicon.ico')
      .then(res => {
        console.log("NETWORK TEST: Basic internet connectivity test passed:", res.status);
      })
      .catch(err => {
        console.error("NETWORK TEST: Basic internet connectivity test failed:", err);
      });
      
    // Check if Supabase is defined and configured
    if (supabase) {
      console.log("NETWORK TEST: Supabase client exists");
      console.log("NETWORK TEST: Supabase URL:", supabase.supabaseUrl);
      console.log("NETWORK TEST: Supabase auth session:", !!supabase.auth.session());
    } else {
      console.error("NETWORK TEST: Supabase client is not properly initialized");
    }
    
    load();
  }, [user?.id, getUserProfile]);

  useEffect(() => {
    const fetchData = async () => {
      console.log("FETCH TEST: Starting main data fetch");
      
      if (!profile?.d_uuid) { 
        addDebugLog("No department UUID found in profile");
        console.log("FETCH TEST: No department UUID in profile:", profile);
        setReceived([]); 
        setSent([]); 
        setLoading(false); 
        return; 
      }
      
      addDebugLog(`Fetching data for department ${profile.d_uuid}`);
      console.log("FETCH TEST: Fetching data for department", profile.d_uuid);
      setLoading(true);
      setError(null);
      
      try {
        // Step 1: Fetch all departments for lookup information
        console.log("FETCH TEST: Step 1 - Fetching departments");
        let departmentMap = {}; // Declare departmentMap in the outer scope
        let departmentsData = []; // Declare departmentsData in the outer scope
        
        try {
          const { data: deptData, error: deptError } = await supabase
            .from('department')
            .select('d_uuid, d_name');
            
          if (deptError) {
            console.error("FETCH TEST: Department fetch error:", deptError);
            throw deptError;
          }
          
          departmentsData = deptData; // Assign to the outer scope variable
          console.log("FETCH TEST: Successfully fetched departments:", departmentsData);
          
          // Create a department lookup map
          departmentsData.forEach(dept => {
            departmentMap[dept.d_uuid] = dept;
          });
          
          console.log("FETCH TEST: Created department map:", departmentMap);
        } catch (deptErr) {
          console.error("FETCH TEST: Error in department fetch:", deptErr);
          throw new Error("Failed to fetch departments: " + deptErr.message);
        }
        
        // Step 2: Get all file_department entries for current user's department
        const { data: fileDeptEntries, error: fileDeptError } = await supabase
          .from('file_department')
          .select('*')
          .eq('d_uuid', profile.d_uuid);
        
        if (fileDeptError) {
          console.error("DEBUG: Error fetching file_department entries:", fileDeptError);
          throw fileDeptError;
        }
        
        console.log("DEBUG: File department entries shared with this department:", fileDeptEntries);
        
        if (!fileDeptEntries || fileDeptEntries.length === 0) {
          console.log("DEBUG: No files have been shared with this department");
          setReceived([]);
          setSent([]);
          setLoading(false);
          return;
        }
        
        // Step 3: Get all files shared with this department
        const fileIds = fileDeptEntries.map(entry => entry.f_uuid);
        addDebugLog(`Found ${fileIds.length} files shared with this department`);
        
        const { data: filesData, error: filesError } = await supabase
          .from('file')
          .select('*, users:uuid (*)')
          .in('f_uuid', fileIds);
        
        if (filesError) {
          addDebugLog(`Error fetching file details: ${filesError.message}`);
          console.error("DEBUG: Error fetching file details:", filesError);
          throw filesError;
        }
        
        addDebugLog(`Retrieved ${filesData.length} file records from database`);
        console.log("DEBUG: Files data:", filesData);
        
        // Step 4: Get all file_department entries for these files to find source departments
        const { data: sourceFileDepts, error: sourceFileDeptsError } = await supabase
          .from('file_department')
          .select('*')
          .in('f_uuid', fileIds);
        
        if (sourceFileDeptsError) {
          console.error("DEBUG: Error fetching source departments:", sourceFileDeptsError);
          throw sourceFileDeptsError;
        }
        
        console.log("DEBUG: All file_department entries for shared files:", sourceFileDepts);
        
        // Group the entries by file_uuid to see all departments each file is shared with
        const fileSharing = {};
        sourceFileDepts.forEach(entry => {
          if (!fileSharing[entry.f_uuid]) {
            fileSharing[entry.f_uuid] = [];
          }
          fileSharing[entry.f_uuid].push(entry.d_uuid);
        });
        
        console.log("DEBUG: File sharing map (which files are shared with which departments):", fileSharing);
        
        // For each file shared with this department, determine its source department
        const fileSourceDepts = {};
        
        // Log total files we've found
        console.log(`DEBUG: Starting source department identification for ${Object.keys(fileSharing).length} files`);
        addDebugLog(`Processing ${Object.keys(fileSharing).length} shared files`);
        
        // For each file, try to determine source department (not this department)
        Object.keys(fileSharing).forEach(fileId => {
          const deptIds = fileSharing[fileId];
          console.log(`DEBUG: File ${fileId} is shared with departments:`, deptIds);
          
          // Look for the source department - this is the department that created the file
          // We need to check the file.d_uuid to determine the original source
          const fileDetails = filesData.find(f => f.f_uuid === fileId);
          if (fileDetails && fileDetails.d_uuid) {
            // The source is the department that created the file (not necessarily in file_department)
            const sourceDeptId = fileDetails.d_uuid;
            console.log(`DEBUG: File ${fileId} has source department: ${sourceDeptId}, my dept: ${profile.d_uuid}, match: ${sourceDeptId === profile.d_uuid}`);
            
            // Include files regardless of source - we'll filter later
            // This matches the HeadDashboard approach which shows all files
            fileSourceDepts[fileId] = {
              deptId: sourceDeptId,
              deptName: departmentMap[sourceDeptId]?.d_name || "Unknown",
              isFromMyDept: sourceDeptId === profile.d_uuid
            };
          } else {
            console.log(`DEBUG: File ${fileId} has no source department in details:`, fileDetails);
          }
        });
        
        console.log("DEBUG: Determined source departments for shared files:", fileSourceDepts);
        
        // Check how many files we can properly categorize
        const filesToShow = Object.keys(fileSourceDepts).length;
        console.log(`DEBUG: ${filesToShow} out of ${fileIds.length} files can be shown in department folders`);
        
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
              
              console.log("DEBUG: User data fetched separately:", usersData);
            }
          }
        }
        
        // Step 6: Process received files (shared with my department)
        const receivedFiles = fileDeptEntries.map(fileDept => {
          const fileDetails = filesData.find(f => f.f_uuid === fileDept.f_uuid);
          if (!fileDetails) {
            console.log(`DEBUG: Could not find file details for ${fileDept.f_uuid}`);
            return null;
          }
          
          // Get the source department - this is the department that created the file
          const sourceDeptId = fileDetails.d_uuid;
          let sourceDeptName = '';
          
          // Look up the department name using our departmentMap
          if (departmentMap[sourceDeptId]) {
            sourceDeptName = departmentMap[sourceDeptId].d_name || 'Unknown Department';
          } else {
            sourceDeptName = 'Unknown Department';
          }
          
          // Log all files instead of skipping them
          if (sourceDeptId === profile.d_uuid) {
            addDebugLog(`File ${fileDept.f_uuid} is from our own department, including it`);
            // Don't return null here, include the file
          }
          
          // Get user info
          const user = fileDetails.users || usersData[fileDetails.uuid] || {};
          const uploaderName = user.name || 'Unknown User';
          const uploaderPosition = user.position || 'Unknown Position';
          
          return {
            fd_uuid: fileDept.fd_uuid,
            f_uuid: fileDept.f_uuid,
            is_approved: fileDept.is_approved,
            shared_at: fileDept.created_at,
            f_name: fileDetails.f_name || 'Unnamed File',
            file_created_at: fileDetails.created_at,
            other_d_uuid: sourceDeptId,
            uploader: uploaderName,
            position: uploaderPosition,
            canDecide: true // Current dept can approve/reject
          };
        }).filter(Boolean);
        
        console.log("DEBUG: Processed received files:", receivedFiles);
        addDebugLog(`Processed ${receivedFiles.length} received files`);
        
        // Step 7: Handle sent files - files from my department shared with others
        // Get all files from my department
        const { data: myDeptFiles, error: myFilesError } = await supabase
          .from('file')
          .select('*')
          .eq('d_uuid', profile.d_uuid);
          
        if (myFilesError) {
          console.error("DEBUG: Error fetching department files:", myFilesError);
          throw myFilesError;
        }
        
        console.log("DEBUG: Files from my department:", myDeptFiles);
        addDebugLog(`Found ${myDeptFiles.length} files from my department`);
        
        // If there are files from my department, find where they're shared
        const sentFiles = [];
        
        if (myDeptFiles.length > 0) {
          const myFileIds = myDeptFiles.map(f => f.f_uuid);
          
          // Get all file_department entries for my department's files
          const { data: sentEntries, error: sentError } = await supabase
            .from('file_department')
            .select('*')
            .in('f_uuid', myFileIds)
            .neq('d_uuid', profile.d_uuid);
            
          if (sentError) {
            console.error("DEBUG: Error fetching sent file entries:", sentError);
            throw sentError;
          }
          
          console.log("DEBUG: Sent file entries:", sentEntries);
          addDebugLog(`Found ${sentEntries.length} file entries shared with other departments`);
          
          // Process each sent entry
          sentEntries.forEach(entry => {
            const fileDetails = myDeptFiles.find(f => f.f_uuid === entry.f_uuid);
            if (!fileDetails) return;
            
            const targetDeptId = entry.d_uuid;
            const targetDeptName = departmentMap[targetDeptId]?.d_name || 'Unknown Department';
            
            sentFiles.push({
              fd_uuid: entry.fd_uuid,
              f_uuid: entry.f_uuid,
              is_approved: entry.is_approved,
              shared_at: entry.created_at,
              f_name: fileDetails.f_name || 'Unnamed File',
              file_created_at: fileDetails.created_at,
              other_d_uuid: targetDeptId,
              source_dept_name: targetDeptName,
              canDecide: false // Can't decide for other departments
            });
          });
        }
        
        addDebugLog(`Processed ${sentFiles.length} sent files and ${receivedFiles.length} received files`);
        console.log("DEBUG: Processed sent files:", sentFiles);
        
        // Update the department map with names
        const deptNameMap = {};
        departmentsData.forEach(d => {
          deptNameMap[d.d_uuid] = d.d_name;
        });
        setDeptMap(deptNameMap);
        
        // Print comparison of our results vs expected results
        console.log("RESULT COMPARISON: ==================");
        console.log(`Files in system total: ${filesData.length}`);
        console.log(`Files shared with my department: ${fileDeptEntries.length}`);
        console.log(`Files we identified sources for: ${Object.keys(fileSourceDepts).length}`);
        console.log(`Files in received array: ${receivedFiles.length}`);
        console.log(`Files in sent array: ${sentFiles.length}`);
        console.log("RESULT COMPARISON: ==================");
        
        // Log detailed information about receivedFiles for debugging
        console.log("Received Files Structure:", receivedFiles.slice(0, 2));
        
        // Set the received and sent arrays
        setReceived(receivedFiles);
        setSent(sentFiles);
        
      } catch (e) {
        console.error("DEBUG: Error in fetchData", e);
        setError(e.message || 'Failed to load collaboration data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (profile?.d_uuid) {
      const channel = supabase
        .channel('fd-collab-folders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'file_department', filter: `d_uuid=eq.${profile.d_uuid}` }, fetchData)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'file_department', filter: `d_uuid=eq.${profile.d_uuid}` }, fetchData)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.d_uuid]);

  const persistImportant = (next) => {
    try { localStorage.setItem('fd_important_map', JSON.stringify(next)); } catch {}
  };
  
  const toggleImportant = (fd_uuid) => {
    setImportantMap(prev => {
      const next = { ...prev, [fd_uuid]: !prev[fd_uuid] };
      persistImportant(next);
      return next;
    });
  };

  // Basic connection test
  const testSupabaseConnection = async () => {
    setTestResults("Running basic Supabase connection test...");
    
    try {
      console.log("CONNECTION TEST: Testing Supabase connection");
      
      // Check if supabase client exists
      if (!supabase) {
        console.error("CONNECTION TEST: Supabase client not initialized");
        setTestResults("ERROR: Supabase client not initialized");
        return;
      }
      
      // Try to get Supabase auth status
      try {
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
          console.error("CONNECTION TEST: Auth check failed", authError);
          setTestResults(`Auth check failed: ${authError.message}`);
          return;
        }
        
        console.log("CONNECTION TEST: Auth check succeeded", authData);
        
        if (!authData?.session) {
          setTestResults("WARNING: No active session found. You may need to log in again.");
          return;
        }
      } catch (authErr) {
        console.error("CONNECTION TEST: Auth check exception", authErr);
        setTestResults(`Auth check exception: ${authErr.message}`);
        return;
      }
      
      // Try a simple query to verify database access
      try {
        const startTime = performance.now();
        const { data, error } = await supabase
          .from('department')
          .select('count')
          .limit(1);
          
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        
        if (error) {
          console.error("CONNECTION TEST: Database query failed", error);
          setTestResults(`Database query failed: ${error.message}`);
          return;
        }
        
        console.log("CONNECTION TEST: Database query succeeded", data);
        setTestResults(`Connection test PASSED!\nDatabase query completed in ${duration}ms.\nYou have a valid session and can access the database.`);
      } catch (dbErr) {
        console.error("CONNECTION TEST: Database query exception", dbErr);
        setTestResults(`Database query exception: ${dbErr.message}`);
      }
    } catch (e) {
      console.error("CONNECTION TEST: Test failed with exception", e);
      setTestResults(`Test failed with exception: ${e.message}`);
    }
  };

  // Test using HeadDashboard.jsx's exact approach for debugging
  const testHeadDashboardApproach = async () => {
    if (!user?.id) {
      setTestResults("ERROR: No user ID available");
      return;
    }
    
    try {
      setTestResults("Testing with HeadDashboard approach...");
      addDebugLog("Starting HeadDashboard approach test");
      
      // Get user profile first
      const userProfile = await getUserProfile(user.id);
      if (!userProfile || !userProfile.d_uuid) {
        setTestResults("Test FAILED: User profile missing or has no department");
        return;
      }
      
      // Get all departments for mapping
      const { data: depts, error: deptsError } = await supabase
        .from('department')
        .select('*');
      
      if (deptsError) {
        setTestResults(`Error fetching departments: ${deptsError.message}`);
        return;
      }
      
      const deptMap = {};
      depts.forEach(d => {
        deptMap[d.d_uuid] = d.d_name;
      });
      
      // Get files created by this department (approach from HeadDashboard)
      const { data: myDeptFiles, error: myDeptError } = await supabase
        .from('file')
        .select('*')
        .eq('d_uuid', userProfile.d_uuid);
      
      if (myDeptError) {
        setTestResults(`Error fetching department files: ${myDeptError.message}`);
        return;
      }
      
      // Find where these files are shared
      const myDeptFileIds = myDeptFiles.map(f => f.f_uuid);
      
      const { data: fdEntries, error: fdError } = await supabase
        .from('file_department')
        .select('*')
        .in('f_uuid', myDeptFileIds);
      
      if (fdError) {
        setTestResults(`Error fetching file_department entries: ${fdError.message}`);
        return;
      }
      
      // Now get files shared with this department
      const { data: sharedWithMe, error: sharedError } = await supabase
        .from('file_department')
        .select('*')
        .eq('d_uuid', userProfile.d_uuid);
      
      if (sharedError) {
        setTestResults(`Error fetching files shared with department: ${sharedError.message}`);
        return;
      }
      
      // Get details of files shared with me
      const sharedFileIds = sharedWithMe.map(entry => entry.f_uuid);
      
      const { data: sharedFiles, error: sharedFilesError } = await supabase
        .from('file')
        .select('*')
        .in('f_uuid', sharedFileIds);
      
      if (sharedFilesError) {
        setTestResults(`Error fetching shared file details: ${sharedFilesError.message}`);
        return;
      }
      
      // Map files shared with me to their source departments
      const sourceDepts = {};
      sharedFiles.forEach(file => {
        sourceDepts[file.f_uuid] = file.d_uuid;
      });
      
      setTestResults(`
        HeadDashboard approach results:
        
        User department: ${userProfile.d_uuid} (${deptMap[userProfile.d_uuid] || 'Unknown'})
        Total departments: ${depts.length}
        
        My department's files: ${myDeptFiles.length}
        File sharing entries: ${fdEntries.length}
        
        Files shared with my department: ${sharedWithMe.length}
        Retrieved shared file details: ${sharedFiles.length}
        
        Files by department:
        ${Object.entries(sourceDepts).map(([fileId, deptId]) => {
          const file = sharedFiles.find(f => f.f_uuid === fileId);
          return `- ${file?.f_name || 'Unknown'} (${fileId}) from dept ${deptMap[deptId] || 'Unknown'} (${deptId})`;
        }).join('\n')}
      `);
      
      // Try using this approach to actually update the UI
      const receivedFiles = sharedWithMe.map(fd => {
        const fileDetails = sharedFiles.find(f => f.f_uuid === fd.f_uuid);
        if (!fileDetails) return null;
        
        // Skip files from our own department (these shouldn't be in received)
        if (fileDetails.d_uuid === userProfile.d_uuid) {
          return null;
        }
        
        return {
          fd_uuid: fd.fd_uuid,
          f_uuid: fd.f_uuid,
          is_approved: fd.is_approved,
          shared_at: fd.created_at,
          f_name: fileDetails.f_name,
          file_created_at: fileDetails.created_at,
          other_d_uuid: fileDetails.d_uuid,  // Use the file's department as source
          uploader: "Unknown (test)",
          position: "Unknown (test)",
          canDecide: true
        };
      }).filter(Boolean);
      
      // Update UI
      addDebugLog(`Using HeadDashboard approach to update received files: ${receivedFiles.length} files`);
      setReceived(receivedFiles);
    } catch (e) {
      setTestResults(`Test ERROR: ${e.message}`);
    }
  };
  const approve = async (fd_uuid) => {
    try {
      const { error } = await supabase.from('file_department').update({ is_approved: true }).eq('fd_uuid', fd_uuid);
      if (error) throw error;
      setReceived(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: true } : r));
    } catch (e) {
      setError(e.message || 'Approve failed');
    }
  };
  const reject = async (fd_uuid) => {
    try {
      const { error } = await supabase.from('file_department').update({ is_approved: false }).eq('fd_uuid', fd_uuid);
      if (error) throw error;
      setReceived(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: false } : r));
    } catch (e) {
      setError(e.message || 'Reject failed');
    }
  };

  // Build department cards: group by other department id
  const deptIds = useMemo(() => {
    const s = new Set();
    received.forEach(r => r.other_d_uuid && s.add(r.other_d_uuid));
    sent.forEach(r => r.other_d_uuid && s.add(r.other_d_uuid));
    console.log("DEBUG: Collected department IDs:", Array.from(s));
    return Array.from(s);
  }, [received, sent]);

  // We're now fetching department names directly in the main fetch function
  // This useEffect is kept for backward compatibility
  useEffect(() => {
    if (Object.keys(deptMap).length === 0 && deptIds.length > 0) {
      const fetchDeptNames = async () => {
        console.log("DEBUG: Fetching missing department names for:", deptIds);
        const { data, error } = await supabase.from('department').select('d_uuid, d_name').in('d_uuid', deptIds);
        if (error) { 
          console.warn('DEBUG: Failed to fetch department names', error); 
          return; 
        }
        console.log("DEBUG: Department data received:", data);
        const map = {};
        (data || []).forEach(d => { map[d.d_uuid] = d.d_name; });
        setDeptMap(prevMap => ({...prevMap, ...map}));
      };
      fetchDeptNames();
    }
  }, [deptIds, deptMap]);

  const cards = useMemo(() => {
    const recByDept = {};
    const sentByDept = {};
    
    // Process received files - categorize by source department
    received.forEach(r => {
      if (!r.other_d_uuid) {
        console.log("DEBUG: File missing source department:", r);
        return;
      }
      const k = r.other_d_uuid;
      if (!recByDept[k]) recByDept[k] = [];
      recByDept[k].push(r);
    });
    
    // Process sent files - categorize by target department
    sent.forEach(srow => {
      if (!srow.other_d_uuid) {
        console.log("DEBUG: Sent file missing target department:", srow);
        return;
      }
      const k = srow.other_d_uuid;
      if (!sentByDept[k]) sentByDept[k] = [];
      sentByDept[k].push(srow);
    });
    
    const ids = new Set([...Object.keys(recByDept), ...Object.keys(sentByDept)]);
    console.log("DEBUG: Department groups - received:", recByDept, "sent:", sentByDept);
    addDebugLog(`Grouped files into ${ids.size} departments (${Object.keys(recByDept).length} with received, ${Object.keys(sentByDept).length} with sent)`);
    
    const result = Array.from(ids)
      .map(id => ({
        id,
        name: deptMap[id] || 'Unknown Department',
        received: recByDept[id] || [],
        sent: sentByDept[id] || [],
      }))
      .filter(dept => dept.received.length > 0 || dept.sent.length > 0) // Filter out empty departments
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log("DEBUG: Final cards data:", result);
    return result;
  }, [deptMap, received, sent]);

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  
  useEffect(() => {
    if (!selectedDeptId && cards.length > 0) {
      console.log("DEBUG: Auto-selecting first department:", cards[0].id);
      setSelectedDeptId(cards[0].id);
    } else if (cards.length === 0) {
      console.log("DEBUG: No cards available to select");
    }
  }, [cards, selectedDeptId]);

  // Filter and search
  const filteredCard = useMemo(() => {
    if (!selectedDeptId || !cards.length) {
      console.log("DEBUG: No filtered card available - selectedDeptId:", selectedDeptId, "cards length:", cards.length);
      return null;
    }
    
    const card = cards.find(c => c.id === selectedDeptId);
    if (!card) {
      console.log("DEBUG: Could not find card with id:", selectedDeptId);
      return null;
    }
    
    console.log("DEBUG: Filtering card:", card, "with filter status:", filterStatus, "and search query:", searchQuery);
    
    // Apply search and filters
    const filterFn = (file) => {
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && file.is_approved !== null) return false;
        if (filterStatus === 'approved' && file.is_approved !== true) return false;
        if (filterStatus === 'rejected' && file.is_approved !== false) return false;
      }
      
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = (file.f_name || '').toLowerCase();
        // Could extend this to search in other fields if needed
        if (!name.includes(query)) {
          return false;
        }
      }
      
      return true;
    };
    
    const filteredResult = {
      ...card,
      received: card.received.filter(filterFn),
      sent: card.sent.filter(filterFn)
    };
    
    console.log("DEBUG: Filtered result:", filteredResult);
    return filteredResult;
  }, [cards, selectedDeptId, filterStatus, searchQuery]);
  
  // Cleanup function to handle file operations
  const handleFileAction = async (fd_uuid, action) => {
    try {
      // Show loading state
      setLoading(true);
      
      if (action === 'approve') {
        await approve(fd_uuid);
      } else if (action === 'reject') {
        await reject(fd_uuid);
      } else if (action === 'view') {
        // Navigate to file viewer
        window.open(`/file/${fd_uuid}`, '_blank');
      } else if (action === 'summary') {
        // Navigate to summary view
        window.open(`/summary/${fd_uuid}`, '_blank');
      }
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className="mb-3 border border-red-200 bg-red-50 text-red-700 p-2 rounded">{error}</div>}
      
      {/* Debug controls (only visible for debugging) */}
      <div className="mb-4 bg-gray-100 p-3 rounded border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-medium">Collaboration Files Diagnostics</h3>
          <div className="flex gap-2">
            <button
              onClick={testSupabaseConnection}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Test Connection
            </button>
            <button
              onClick={runDatabaseTest}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Basic DB Test
            </button>
            <button
              onClick={testHeadDashboardApproach}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              Test HeadDashboard
            </button>
            <button
              onClick={() => setShowTestResults(!showTestResults)}
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              {showTestResults ? 'Hide Debug Data' : 'Show Debug Data'}
            </button>
          </div>
        </div>
        
        {/* Show debug info */}
        {showTestResults && (
          <div className="mt-2">
            <div className="mb-3">
              <h4 className="text-sm font-medium mb-1">Debug Log:</h4>
              <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono h-24 overflow-y-auto">
                {debugLog.length === 0 ? (
                  <div className="text-gray-500">No debug logs recorded yet</div>
                ) : (
                  debugLog.map((log, idx) => <div key={idx}>{log}</div>)
                )}
              </div>
            </div>
            
            {testResults && (
              <div>
                <h4 className="text-sm font-medium mb-1">Test Results:</h4>
                <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono h-64 overflow-y-auto whitespace-pre-wrap">
                  {testResults}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 text-center">
            <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>Loading collaboration folders…</div>
          </div>
        </div>
      ) : cards.length === 0 && (received.length > 0 || sent.length > 0) ? (
        <div className="border rounded bg-white p-8 text-center">
          <BuildingOfficeIcon className="h-12 w-12 mx-auto text-amber-400 mb-4" />
          <h3 className="text-lg font-medium text-amber-900 mb-2">Files Found But Not Categorized</h3>
          <p className="text-amber-800 mb-4">
            We found {received.length + sent.length} files in the database, but could not categorize them by department.
            This could be because the source department information is missing.
          </p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => {
                setTestResults(JSON.stringify({
                  receivedSample: received.slice(0, 3),
                  sentSample: sent.slice(0, 3),
                  totalReceived: received.length,
                  totalSent: sent.length
                }, null, 2));
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Show First 3 Files
            </button>
            <button
              onClick={runDatabaseTest}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Run Detailed Test
            </button>
          </div>
        </div>
      ) : cards.length === 0 ? (
        <div className="border rounded bg-white p-8 text-center">
          <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collaboration data found</h3>
          <p className="text-gray-600 mb-4">
            There are no files shared between departments yet. Files will appear here when they are shared with your department or 
            when your department shares files with others.
          </p>
          <div className="text-left mx-auto max-w-xl bg-yellow-50 p-3 rounded border border-yellow-200 text-xs text-yellow-800">
            <p className="font-semibold mb-1">Troubleshooting tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure your user account is correctly assigned to a department</li>
              <li>Share files with other departments from the file view screen</li>
              <li>Ask other departments to share files with your department</li>
              <li>Check the diagnostic information for detailed debugging</li>
              <li>Current user position: {profile?.position || 'Unknown'}</li>
              <li>Current department ID: {profile?.d_uuid || 'None'}</li>
              <li>Total files fetched: {received.length + sent.length}</li>
              <li>Files received: {received.length} / Files sent: {sent.length}</li>
            </ul>
          </div>
          <div className="mt-4 flex gap-3 justify-center">
            <button 
              onClick={testSupabaseConnection}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Database Connection
            </button>
            <button 
              onClick={testHeadDashboardApproach}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try HeadDashboard Approach
            </button>
          </div>
          
          {testResults ? (
            <div className="mt-4 p-4 bg-gray-50 border rounded text-left">
              <h4 className="font-medium mb-2 text-gray-900">Test Results</h4>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-60">
                {testResults}
              </pre>
              <button
                onClick={() => setTestResults(null)} 
                className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hide Results
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={runDatabaseTest}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Run Diagnostic Test
                </button>
                <button
                  onClick={() => {
                    setTestResults(JSON.stringify({
                      received: received,
                      sent: sent,
                      totalReceived: received.length,
                      totalSent: sent.length
                    }, null, 2));
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Show Current Files
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Debug info: Profile d_uuid: {profile?.d_uuid || 'not set'}, User ID: {user?.id || 'not set'}, 
                Position: {profile?.position || 'not set'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Horizontal department strip */}
          <div className="mb-3 flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 no-scrollbar">
            <style jsx="true">{`
              .no-scrollbar::-webkit-scrollbar {
                height: 6px;
              }
              .no-scrollbar::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 3px;
              }
              .no-scrollbar::-webkit-scrollbar-thumb {
                background-color: #d1d5db;
                border-radius: 3px;
              }
              .no-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: #9ca3af;
              }
            `}</style>
            {cards.map(card => {
              const isSel = card.id === selectedDeptId;
              const count = (card.received?.length || 0) + (card.sent?.length || 0);
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedDeptId(card.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded border whitespace-nowrap ${isSel ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  title={card.name}
                >
                  <BuildingOfficeIcon className={`h-5 w-5 ${isSel ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium text-sm truncate max-w-[200px]">{card.name}</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${isSel ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Selected department details */}
          {filteredCard ? (
            <div className="border rounded bg-white">
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">{filteredCard.name}</h3>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  {/* Search */}
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <div className="flex-shrink-0">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block w-full pl-3 pr-10 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  {/* Clear Filters */}
                  {(searchQuery || filterStatus !== 'all') && (
                    <button
                      onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
              
              {filteredCard.received.length === 0 && filteredCard.sent.length === 0 ? (
                <div className="p-8 text-center">
                  {searchQuery || filterStatus !== 'all' ? (
                    <>
                      <svg className="h-10 w-10 mx-auto text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No matching files found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No files shared with this department</h3>
                      <p className="text-gray-500">There are currently no files shared between your department and {filteredCard.name}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <CollabList
                      title={`Received from this department (${filteredCard.received.length})`}
                      rows={filteredCard.received}
                      isHead={isHead}
                      onApprove={approve}
                      onReject={reject}
                      importantMap={importantMap}
                      toggleImportant={toggleImportant}
                    />
                  </div>
                  <div>
                    <CollabList
                      title={`Shared to this department (${filteredCard.sent.length})`}
                      rows={filteredCard.sent}
                      isHead={false}
                      onApprove={() => {}}
                      onReject={() => {}}
                      importantMap={importantMap}
                      toggleImportant={toggleImportant}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default function SafeCollabFolders() {
  return (
    <ErrorBoundary>
      <CollabFolders />
    </ErrorBoundary>
  );
};
