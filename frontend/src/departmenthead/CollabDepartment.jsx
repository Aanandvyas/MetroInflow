import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/context/AuthContext';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  DocumentTextIcon, 
  StarIcon as StarOutline, 
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ChevronDoubleRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// Status pill component
const StatusPill = ({ value }) => {
  const meta = value === true
    ? { 
        label: 'Approved', 
        cls: 'text-green-700 bg-green-50 border-green-200',
        icon: <CheckCircleIcon className="w-3 h-3 mr-1" />
      }
    : value === false
    ? { 
        label: 'Rejected', 
        cls: 'text-red-700 bg-red-50 border-red-200',
        icon: <XCircleIcon className="w-3 h-3 mr-1" /> 
      }
    : { 
        label: 'Pending', 
        cls: 'text-amber-700 bg-amber-50 border-amber-200',
        icon: <div className="w-3 h-3 mr-1 rounded-full bg-amber-400"></div>
      };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border inline-flex items-center ${meta.cls}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

// File list component
const FileList = ({ title, rows, isHead, onApprove, onReject, importantMap, toggleImportant }) => {
  const [departmentNames, setDepartmentNames] = useState({});
  
  // Fetch department names when rows change
  useEffect(() => {
    const fetchDepartmentNames = async () => {
      // Get unique department IDs from all files
      const deptIds = new Set();
      rows.forEach(r => {
        if (r.actual_dept_uuid && r.actual_dept_uuid !== 'other-departments') {
          deptIds.add(r.actual_dept_uuid);
        }
      });
      
      if (deptIds.size === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('department')
          .select('d_uuid, d_name')
          .in('d_uuid', Array.from(deptIds));
          
        if (error) throw error;
        
        // Create a mapping of department IDs to names
        const nameMap = {};
        data.forEach(dept => {
          nameMap[dept.d_uuid] = dept.d_name;
        });
        
        setDepartmentNames(nameMap);
      } catch (e) {
        console.error("Error fetching department names:", e);
      }
    };
    
    fetchDepartmentNames();
  }, [rows]);
  
  // Helper function to get department display name
  const getDepartmentName = (file) => {
    if (file.other_d_uuid === 'other-departments') {
      return 'Other Department';
    }
    
    return departmentNames[file.actual_dept_uuid] || 'Unknown Department';
  };

  return (
    <div className="mb-8">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-xs text-gray-500">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="text-gray-600 text-sm">No files match the current filter.</div>
      ) : (
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
                    
                    {/* Sender's department badge - this is the most important info */}
                    {r.senderDeptId && departmentNames[r.senderDeptId] && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                        {departmentNames[r.senderDeptId]}
                      </span>
                    )}
                    
                    {/* If file and sender departments differ, show where file was actually created */}
                    {r.fileDeptId && r.senderDeptId && r.fileDeptId !== r.senderDeptId && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-1">
                        <DocumentTextIcon className="w-3 h-3 mr-1" />
                        Created in {departmentNames[r.fileDeptId] || 'Unknown'}
                      </span>
                    )}
                    
                    {/* Special badge for "Other Departments" - show only if we don't have a specific department */}
                    {(!r.senderDeptId || !departmentNames[r.senderDeptId]) && r.other_d_uuid === 'other-departments' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                        Other Department
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    From: <span className="font-medium">{r.senderName}</span> 
                    <span className="inline-flex ml-1 items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Department Head
                    </span> 
                    {/* Show the department of the sender if available */}
                    {departmentNames[r.senderDeptId] && (
                      <span className="ml-1">
                        of <span className="font-medium">{departmentNames[r.senderDeptId]}</span>
                      </span>
                    )}
                    • {new Date(r.shared_at).toLocaleString()}
                  </div>
                </div>
              </div>
              {isHead && r.canDecide && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => onApprove(r.fd_uuid)} 
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50" 
                    disabled={r.is_approved === true}
                  >
                    <CheckCircleIcon className="h-4 w-4" /> Approve
                  </button>
                  <button 
                    onClick={() => onReject(r.fd_uuid)} 
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50" 
                    disabled={r.is_approved === false}
                  >
                    <XCircleIcon className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CollabDepartment = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const { user, getUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [department, setDepartment] = useState(null);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [deptFilter, setDeptFilter] = useState('all'); // 'all' or a specific department UUID
  const [departmentList, setDepartmentList] = useState([]); // List of all departments for filtering
  const [importantMap, setImportantMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fd_important_map') || '{}');
    } catch {
      return {};
    }
  });

  const isHead = useMemo(() => profile?.position === 'head', [profile]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await getUserProfile(user.id);
        setProfile(data);
      } catch (e) {
        setError('Failed to load user profile');
      }
    };
    loadProfile();
  }, [user?.id, getUserProfile]);

  // Load department details
  useEffect(() => {
    const fetchDepartment = async () => {
      if (!departmentId) return;
      
      try {
        const { data, error } = await supabase
          .from('department')
          .select('d_uuid, d_name')
          .eq('d_uuid', departmentId)
          .single();
          
        if (error) throw error;
        setDepartment(data);
      } catch (e) {
        console.error("Error fetching department:", e);
        setError("Failed to load department information");
      }
    };
    
    fetchDepartment();
  }, [departmentId]);

  // Load collaboration files
  useEffect(() => {
    const fetchCollaborationFiles = async () => {
      if (!profile?.d_uuid || !departmentId) { 
        setReceived([]); 
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Files received from the selected department to my department
        const { data: recData, error: recErr } = await supabase
          .from('file_department')
          .select(`
            fd_uuid,
            f_uuid,
            d_uuid,
            is_approved,
            created_at,
            file:f_uuid (
              f_name,
              created_at,
              d_uuid,
              users:uuid (
                uuid,
                name,
                position,
                d_uuid
              )
            )
          `)
          .eq('d_uuid', profile.d_uuid)
          .order('created_at', { ascending: false });
        
        if (recErr) throw recErr;

        // Log raw data received from the database
        console.log(`DEBUG: Files data received for department ${departmentId}:`, recData);
        console.log(`DEBUG: Total files before filtering: ${recData?.length || 0}`);
        
        // Before filtering, check what we have
        const sourceDeptFiles = (recData || []).filter(r => 
          r.file && r.file.d_uuid === departmentId
        );
        console.log(`DEBUG: Files from department ${departmentId}: ${sourceDeptFiles.length}`);
        
        // Check how many have user data
        const filesWithUserData = (recData || []).filter(r => 
          r.file && r.file.users
        );
        console.log(`DEBUG: Files with user data: ${filesWithUserData.length}`);
        
        // Check how many are from department heads
        const headFiles = (recData || []).filter(r => 
          r.file && r.file.users?.position === 'head'
        );
        console.log(`DEBUG: Files from department heads: ${headFiles.length}`);
        
        // Check if any file is shared BY the selected department
        const anyFilesFromDept = (recData || []).some(r => r.file && r.file.d_uuid === departmentId);
        console.log(`DEBUG: Are there any files from this department? ${anyFilesFromDept ? 'YES' : 'NO'}`);
        
        // MODIFIED FILTER - If no files are found from this department, show ALL files shared with us
        // This ensures the user sees some data instead of nothing
        const recMapped = (recData || [])
          .filter(r => {
            // If we found files from this department, filter for them
            if (anyFilesFromDept) {
              return r.file && r.file.d_uuid === departmentId;
            } 
            // Otherwise, just check that the file exists
            return r.file != null;
          })
          .map(r => {
            // The user who uploaded the file (creator) might be from a different department than the file itself
            // For department collaboration, we need to know which department SENT the file, not which created it
            
            // The file's department is where it was originally created
            const fileDeptId = r.file?.d_uuid;
            
            // The sender's department (may be different from the file's department)
            const senderDeptId = r.file?.users?.d_uuid;
            
            // Determine the actual source department - prioritize the sender's department
            // because they're the ones who shared it, even if file was created elsewhere
            const sourceDeptId = senderDeptId || fileDeptId;
            let other_d_uuid = sourceDeptId;
            
            // If this isn't from the selected department but we're showing it anyway,
            // create a special "Other Departments" category
            if (!anyFilesFromDept && sourceDeptId !== departmentId) {
              // Use a special ID for the "Other Departments" category
              other_d_uuid = 'other-departments';
            }
            
            console.log(`DEBUG: File ${r.f_uuid} - File dept: ${fileDeptId}, Sender dept: ${senderDeptId}, Using: ${sourceDeptId}`);
            
            return {
              fd_uuid: r.fd_uuid,
              f_uuid: r.f_uuid,
              is_approved: r.is_approved,
              shared_at: r.created_at,
              f_name: r.file?.f_name || 'Unnamed File',
              file_created_at: r.file?.created_at,
              other_d_uuid: other_d_uuid, // source department or special category
              actual_dept_uuid: sourceDeptId, // keep track of the actual source department
              fileDeptId: fileDeptId, // the department where file was created
              senderDeptId: senderDeptId, // the department of the person who shared it
              senderName: r.file?.users?.name || 'Unknown',
              senderPosition: r.file?.users?.position || 'Unknown',
              canDecide: true, // current dept can decide on received
            };
          });

        console.log(`DEBUG: Final files to display: ${recMapped.length}`);
        
        // Show a more helpful message when files exist but are filtered out
        if (recData && recData.length > 0 && recMapped.length === 0) {
          console.log("DEBUG: Files exist but all were filtered out");
          setError(`No files from ${department?.d_name || 'this department'} have been shared with your department yet. Check with the department head if you're expecting files.`);
        } else if (recMapped.length > 0 && !recData.some(r => r.file?.d_uuid === departmentId)) {
          // If we're showing files but they're not from the selected department
          console.log("DEBUG: Showing files from other departments as fallback");
          setError(`No files from ${department?.d_name || 'this department'} were found. Showing files from other departments instead.`);
          
          // If we're showing other departments, get a list of unique departments
          // so we can show the department names in the UI
          const deptIds = new Set(recMapped.filter(f => f.actual_dept_uuid).map(f => f.actual_dept_uuid));
          
          if (deptIds.size > 0) {
            console.log(`DEBUG: Files are from ${deptIds.size} other departments:`, Array.from(deptIds));
            
            // Fetch department names if needed
            const fetchDeptNames = async () => {
              const { data } = await supabase
                .from('department')
                .select('d_uuid, d_name')
                .in('d_uuid', Array.from(deptIds));
                
              if (data) {
                console.log("DEBUG: Department names fetched:", data);
                // Store department list for filtering
                setDepartmentList(data);
              }
            };
            
            fetchDeptNames();
          }
        } else {
          // Clear any previous error if we have files to show
          setError(null);
        }
        
        setReceived(recMapped);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load files from this department');
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborationFiles();

    // Set up realtime subscriptions
    if (profile?.d_uuid && departmentId) {
      const channel = supabase
        .channel('collab-department')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'file_department', 
          filter: `d_uuid=eq.${profile.d_uuid}`
        }, fetchCollaborationFiles)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'file_department', 
          filter: `d_uuid=eq.${profile.d_uuid}`
        }, fetchCollaborationFiles)
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [profile?.d_uuid, departmentId]);

  // Handle important marking
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

  // Approval functions
  const approve = async (fd_uuid) => {
    try {
      const { error } = await supabase
        .from('file_department')
        .update({ is_approved: true })
        .eq('fd_uuid', fd_uuid);
        
      if (error) throw error;
      
      // Update UI optimistically
      setReceived(prev => prev.map(r => 
        r.fd_uuid === fd_uuid ? { ...r, is_approved: true } : r
      ));
    } catch (e) {
      setError(e.message || 'Approve failed');
    }
  };
  
  const reject = async (fd_uuid) => {
    try {
      const { error } = await supabase
        .from('file_department')
        .update({ is_approved: false })
        .eq('fd_uuid', fd_uuid);
        
      if (error) throw error;
      
      // Update UI optimistically
      setReceived(prev => prev.map(r => 
        r.fd_uuid === fd_uuid ? { ...r, is_approved: false } : r
      ));
    } catch (e) {
      setError(e.message || 'Reject failed');
    }
  };

  // Go back to dashboard
  const handleBackClick = () => {
    navigate('/head-dashboard');
  };

  // Filter files based on both status and department filters
  const filteredFiles = useMemo(() => {
    return received.filter(file => {
      // Apply status filter
      const statusMatch = 
        filter === 'all' ? true :
        filter === 'pending' ? file.is_approved === null :
        filter === 'approved' ? file.is_approved === true :
        filter === 'rejected' ? file.is_approved === false : 
        true;
      
      // Apply department filter
      const deptMatch = 
        deptFilter === 'all' ? true :
        file.actual_dept_uuid === deptFilter;
      
      return statusMatch && deptMatch;
    });
  }, [received, filter, deptFilter]);

  if (loading && !department) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={handleBackClick}
          className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100"
          title="Back to Dashboard"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Files from {department?.d_name || 'Department'} Head
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage files received from the department head of {department?.d_name || 'this department'}
          </p>
        </div>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 mr-2" />
            <div>
              <p className="font-medium">Note</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-500">Loading collaboration files...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Received Files */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Files Received from {department?.d_name || 'this department'}
                </h3>
                <div className="flex items-center space-x-4">
                  {/* Department filter - only show if we have multiple departments */}
                  {departmentList.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <label htmlFor="dept-filter" className="text-sm text-gray-600">Department:</label>
                      <select 
                        id="dept-filter"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="text-sm border rounded p-1"
                      >
                        <option value="all">All Departments</option>
                        {departmentList.map(dept => (
                          <option key={dept.d_uuid} value={dept.d_uuid}>
                            {dept.d_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Status filter */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="status-filter" className="text-sm text-gray-600">Status:</label>
                    <select 
                      id="status-filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="text-sm border rounded p-1"
                    >
                      <option value="all">All Files</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {received.length === 0 ? (
                <div className="border rounded bg-yellow-50 p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-6 w-6 text-yellow-700 mr-3" />
                    <div>
                      <h4 className="font-medium text-yellow-800">No files available</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        No files have been shared from {department?.d_name || 'this department'} that match the current filters.
                      </p>
                      <div className="text-xs text-yellow-800 mt-2 bg-yellow-100 p-2 rounded">
                        <p className="font-medium">Troubleshooting tips:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Check if {department?.d_name || 'this department'} has shared any files</li>
                          <li>Ask the department head to share files with your department</li>
                          <li>Try selecting a different filter option above</li>
                          <li>Check the browser console for detailed logs (F12)</li>
                        </ul>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => window.history.back()}
                          className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        >
                          Go back to department selection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="border rounded bg-gray-50 p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-6 w-6 text-gray-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-700">No files match the current filters</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        There are files available, but none match your current filter settings.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            setFilter('all');
                            setDeptFilter('all');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Reset all filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <FileList
                  rows={filteredFiles}
                  isHead={isHead}
                  onApprove={approve}
                  onReject={reject}
                  importantMap={importantMap}
                  toggleImportant={toggleImportant}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollabDepartment;