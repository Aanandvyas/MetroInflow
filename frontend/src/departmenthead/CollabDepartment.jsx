import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabase } from '../supabaseClient';
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
  const meta = value === 'approved'
    ? { 
        label: 'Approved', 
        cls: 'text-green-700 bg-green-50 border-green-200',
        icon: <CheckCircleIcon className="w-3 h-3 mr-1" />
      }
    : value === 'rejected'
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
  const navigate = useNavigate();
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
        const { data, error } = await getSupabase
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
                    <span className="font-medium">{r.senderName}</span>
                    <span className="inline-flex ml-1 items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Department Head
                    </span>
                    {departmentNames[r.senderDeptId] && (
                      <span className="ml-1">
                        shared from <span className="font-medium">{departmentNames[r.senderDeptId]}</span> department
                      </span>
                    )}
                    <span className="mx-1">•</span>
                    {new Date(r.shared_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View and Summary buttons always visible */}
                <a
                  href={`/file/${r.f_uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg> View
                </a>
                <button
                  onClick={() => {
                    // Just navigate to /summary with f_uuid, no download/upload
                    navigate("/summary", { state: { f_uuid: r.f_uuid } });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-purple-600 text-purple-700 hover:bg-purple-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg> Summary
                </button>
                
                {/* Approval buttons only shown for files that are still pending and can be decided */}
                {isHead && r.canDecide && r.is_approved !== 'approved' && r.is_approved !== 'rejected' && (
                  <>
                    <button 
                      onClick={() => onApprove(r.fd_uuid)} 
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircleIcon className="h-4 w-4" /> Approve
                    </button>
                    <button 
                      onClick={() => onReject(r.fd_uuid)} 
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50"
                    >
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CollabDepartment = () => {
  const supabase = getSupabase();
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
      if (typeof window === 'undefined') return {};
      return JSON.parse(window.localStorage.getItem('fd_important_map') || '{}');
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

        
        // Before filtering, check what we have
        const sourceDeptFiles = (recData || []).filter(r => 
          r.file && r.file.d_uuid === departmentId
        );
        
        // Check how many have user data
        const filesWithUserData = (recData || []).filter(r => 
          r.file && r.file.users
        );
        
        // Check how many are from department heads
        const headFiles = (recData || []).filter(r => 
          r.file && r.file.users?.position === 'head'
        );
        
        // Check if any file is shared BY the selected department
        const anyFilesFromDept = (recData || []).some(r => r.file && r.file.d_uuid === departmentId);
        
        // Only show files from the selected department
        const recMapped = (recData || [])
          .filter(r => {
            // Check both the file's department and the sender's department
            return r.file && (r.file.d_uuid === departmentId || r.file.users?.d_uuid === departmentId);
          })
          .map(r => {
            // We need to determine BOTH the department where the file was created AND the department that shared it
            
            // The file's department is where it was originally created
            const fileDeptId = r.file?.d_uuid;
            
            // The sender's department (may be different from the file's department)
            // The user who shared it might be from a department that didn't create the file
            const senderDeptId = r.file?.users?.d_uuid;
            
            // For collaboration purposes, the sender's department is most important since they're the ones sharing
            const sourceDeptId = senderDeptId || fileDeptId;
            let other_d_uuid = sourceDeptId;
            
            // If this isn't from the selected department but we're showing it anyway,
            // create a special "Other Departments" category
            if (!anyFilesFromDept && sourceDeptId !== departmentId) {
              // Use a special ID for the "Other Departments" category
              other_d_uuid = 'other-departments';
            }
            
            
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

        
        // Show a helpful message when there are no files from this department
        if (recData && recData.length > 0 && recMapped.length === 0) {
          setError(`No files from ${department?.d_name || 'this department'} have been shared with your department yet. Check with the department head if you're expecting files.`);
        } else if (recMapped.length === 0) {
          // If we're not showing any files
          setError(`No files from ${department?.d_name || 'this department'} have been shared with your department yet.`);
          
          // If we're showing other departments, gather a list of unique departments from both sender and file departments
          // This ensures we include both the departments where files were created AND departments that shared them
          const fileDeptIds = new Set(recMapped.filter(f => f.fileDeptId).map(f => f.fileDeptId));
          const senderDeptIds = new Set(recMapped.filter(f => f.senderDeptId).map(f => f.senderDeptId));
          const allDeptIds = new Set([...Array.from(fileDeptIds), ...Array.from(senderDeptIds)]);
          
          if (allDeptIds.size > 0) {
            
            // Fetch department names for all relevant departments
            const fetchDeptNames = async () => {
              const { data } = await supabase
                .from('department')
                .select('d_uuid, d_name')
                .in('d_uuid', Array.from(allDeptIds));
                
              if (data) {
               
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
    try { 
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem('fd_important_map', JSON.stringify(next)); } catch {}
      }
    } catch {}
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
        .update({ is_approved: 'approved' })
        .eq('fd_uuid', fd_uuid);
        
      if (error) throw error;
      
      // Update UI optimistically
      setReceived(prev => prev.map(r => 
        r.fd_uuid === fd_uuid ? { ...r, is_approved: 'approved' } : r
      ));
    } catch (e) {
      setError(e.message || 'Approve failed');
    }
  };
  
  const reject = async (fd_uuid) => {
    try {
      const { error } = await supabase
        .from('file_department')
        .update({ is_approved: 'rejected' })
        .eq('fd_uuid', fd_uuid);
        
      if (error) throw error;
      
      // Update UI optimistically
      setReceived(prev => prev.map(r => 
        r.fd_uuid === fd_uuid ? { ...r, is_approved: 'rejected' } : r
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
        filter === 'pending' ? file.is_approved === 'pending' || file.is_approved === null :
        filter === 'approved' ? file.is_approved === 'approved' :
        filter === 'rejected' ? file.is_approved === 'rejected' : 
        true;
      
      // Apply department filter - match either sender department or file department
      // This makes sure we can filter by either "who sent it" or "where it was created"
      const deptMatch = 
        deptFilter === 'all' ? true :
        file.senderDeptId === deptFilter || file.fileDeptId === deptFilter;
      
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