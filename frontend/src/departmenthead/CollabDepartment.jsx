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
  ChevronDoubleRightIcon
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
const FileList = ({ title, rows, isHead, onApprove, onReject, importantMap, toggleImportant }) => (
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
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  From: <span className="font-medium">{r.senderName}</span> 
                  <span className="inline-flex ml-1 items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Department Head
                  </span> • {new Date(r.shared_at).toLocaleString()}
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

        // Filter to only show files from the selected department
        // AND only include files uploaded by department heads
        const recMapped = (recData || [])
          .filter(r => 
            r.file && 
            r.file.d_uuid === departmentId &&
            r.file.users?.position === 'head'
          )
          .map(r => ({
            fd_uuid: r.fd_uuid,
            f_uuid: r.f_uuid,
            is_approved: r.is_approved,
            shared_at: r.created_at,
            f_name: r.file?.f_name || 'Unnamed File',
            file_created_at: r.file?.created_at,
            other_d_uuid: r.file?.d_uuid, // source department
            senderName: r.file?.users?.name || 'Unknown',
            senderPosition: r.file?.users?.position || 'Unknown',
            canDecide: true, // current dept can decide on received
          }));

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
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <p className="font-medium">Error</p>
          <p>{error}</p>
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
                <div className="flex items-center space-x-2">
                  <label htmlFor="status-filter" className="text-sm text-gray-600">Filter:</label>
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
              <FileList
                rows={received.filter(file => {
                  if (filter === 'all') return true;
                  if (filter === 'pending') return file.is_approved === null;
                  if (filter === 'approved') return file.is_approved === true;
                  if (filter === 'rejected') return file.is_approved === false;
                  return true;
                })}
                isHead={isHead}
                onApprove={approve}
                onReject={reject}
                importantMap={importantMap}
                toggleImportant={toggleImportant}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollabDepartment;