import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/context/AuthContext';
import { safeLocalStorage } from '../utils/localStorage';
import {
  DocumentTextIcon,
  StarIcon as StarOutline,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';



// File list component
const FileList = ({ title, rows, importantMap, toggleImportant }) => {
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
      }
    };

    fetchDepartmentNames();
  }, [rows]);

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
                      {r.senderPosition === 'head' ? 'Department Head' : 'Staff'}
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

              </div>
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
  const { userProfile: profile } = useAuth();
  const [department, setDepartment] = useState(null);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deptFilter, setDeptFilter] = useState('all'); // 'all' or a specific department UUID
  const [departmentList] = useState([]); // List of all departments for filtering
  const [importantMap, setImportantMap] = useState({});

  // Load important map from localStorage on component mount
  useEffect(() => {
    try {
      const stored = safeLocalStorage.getItem('fd_important_map');
      if (stored) {
        setImportantMap(JSON.parse(stored));
      }
    } catch (error) {

    }
  }, []);



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


        // Filter files from this department for processing

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


        // Clear any previous error
        setError(null);

        setReceived(recMapped);
      } catch (e) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.d_uuid, departmentId]);

  // Handle important marking
  const persistImportant = (next) => {
    try { safeLocalStorage.setItem('fd_important_map', JSON.stringify(next)); } catch { }
  };

  const toggleImportant = (fd_uuid) => {
    setImportantMap(prev => {
      const next = { ...prev, [fd_uuid]: !prev[fd_uuid] };
      persistImportant(next);
      return next;
    });
  };



  // Go back to dashboard
  const handleBackClick = () => {
    navigate('/head-dashboard');
  };

  // Filter files based on both status and department filters
  const filteredFiles = useMemo(() => {
    return received.filter(file => {
      // Apply status filter
      const statusMatch = true;

      // Apply department filter - match either sender department or file department
      // This makes sure we can filter by either "who sent it" or "where it was created"
      const deptMatch =
        deptFilter === 'all' ? true :
          file.senderDeptId === deptFilter || file.fileDeptId === deptFilter;

      return statusMatch && deptMatch;
    });
  }, [received, deptFilter]);

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
            Files from {department?.d_name || 'Department'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Files shared from {department?.d_name || 'this department'}
          </p>
        </div>
      </div>

      {/* Error message - only show actual errors, not empty states */}
      {error && received.length === 0 && !loading && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
          {error}
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


                </div>
              </div>

              {received.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No files found from this department.</p>
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