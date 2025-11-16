import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { getSupabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Helper for status label/color
const statusMeta = (isApproved) => {
    if (isApproved === 'approved') return { label: 'Approved', color: 'text-green-700 bg-green-50 border-green-200' };
    if (isApproved === 'rejected') return { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' };
    return { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' };
};

const SharedFiles = () => {
    const supabase = getSupabase();
    const navigate = useNavigate();
    const { user, getUserProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isHead = useMemo(() => profile?.position === 'head', [profile]);

    // Load user profile to get department id (d_uuid) and role
    useEffect(() => {
        const load = async () => {
            if (!user?.id) return;
            try {
                const data = await getUserProfile(user.id);
                setProfile(data);
            } catch (e) {
                console.error('Failed to load profile', e);
                setError('Unable to load user profile');
            }
        };
        load();
    }, [user?.id, getUserProfile]);

    // Fetch shared files for this department - only last 7 days
    useEffect(() => {
        const fetchRows = async () => {
            if (!profile?.d_uuid) { setRows([]); setLoading(false); return; }
            setLoading(true);
            setError(null);
            
            // Calculate date 7 days ago
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoISOString = sevenDaysAgo.toISOString();
            
            try {
                let query = supabase
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
                                name,
                                d_uuid,
                                position
                            )
                        )
                    `)
                    .eq('d_uuid', profile.d_uuid)
                    .gte('created_at', sevenDaysAgoISOString) // Only get files shared in the last 7 days
                    .order('created_at', { ascending: false });

                // Staff see only approved files from other departments or any files from their own department
                if (!isHead) {
                    query = query.or(`is_approved.eq.approved,file.d_uuid.eq.${profile.d_uuid}`);
                }

                const { data, error } = await query;
                if (error) throw error;

                // Filter and map the data
                const mapped = (data || [])
                    .filter(r => {
                        // Ensure joined file exists
                        if (!r.file) return false;
                        
                        // For department heads, hide approved files that are not from their own department
                        if (isHead && r.is_approved === 'approved' && r.file.d_uuid !== profile.d_uuid) {
                            return false;
                        }
                        
                        return true;
                    })
                    .map(r => ({
                        fd_uuid: r.fd_uuid,
                        f_uuid: r.f_uuid,
                        is_approved: r.is_approved,
                        shared_at: r.created_at,
                        f_name: r.file?.f_name || 'Unnamed File',
                        file_created_at: r.file?.created_at,
                        source_dept_uuid: r.file?.d_uuid, // Source department
                        is_same_department: r.file?.d_uuid === profile.d_uuid, // Flag if from same department
                        uploader_name: r.file?.users?.name || 'Unknown',
                        uploader_position: r.file?.users?.position || 'Unknown',
                    }));
                setRows(mapped);
            } catch (e) {
                console.error('Error loading shared files', e);
                setError(e.message || 'Failed to load shared files');
            } finally {
                setLoading(false);
            }
        };
        fetchRows();

        // Realtime: refresh on INSERT/UPDATE affecting this department only
        if (profile?.d_uuid) {
            const channel = supabase
                .channel('fd-shared-files')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'file_department', filter: `d_uuid=eq.${profile.d_uuid}` }, fetchRows)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'file_department', filter: `d_uuid=eq.${profile.d_uuid}` }, fetchRows)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [profile?.d_uuid, isHead]);

    const approve = async (fd_uuid) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ is_approved: 'approved' })
                .eq('fd_uuid', fd_uuid);
            if (error) throw error;
            // Optimistic update
            setRows(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: 'approved' } : r));
        } catch (e) {
            console.error('Approve failed', e);
            setError(e.message || 'Failed to approve');
        }
    };

    const reject = async (fd_uuid) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ is_approved: 'rejected' })
                .eq('fd_uuid', fd_uuid);
            if (error) throw error;
            // Optimistic update
            setRows(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: 'rejected' } : r));
        } catch (e) {
            console.error('Reject failed', e);
            setError(e.message || 'Failed to reject');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex flex-col mb-6">
                <h1 className="text-2xl font-semibold">Shared Files</h1>
                <p className="text-sm text-gray-600 mt-1">
                    {isHead 
                        ? "Files shared in the last 7 days that require your approval. Once approved, files will be removed from this list." 
                        : "You can see files from your department and approved files from other departments shared in the last 7 days."
                    }
                </p>
            </div>

            {error && (
                <div className="mb-4 border border-red-200 bg-red-50 text-red-700 p-3 rounded">{error}</div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-gray-600"><ClockIcon className="h-5 w-5 animate-spin" /> Loading…</div>
            ) : rows.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <DocumentTextIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No shared files found</h3>
                    <p className="text-gray-600">
                        {isHead 
                            ? "You'll see pending files from the last 7 days that require your approval." 
                            : "You'll see files from your department and approved files from other departments shared in the last 7 days."
                        }
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-200 bg-white border rounded">
                    {rows.map(item => {
                        const meta = statusMeta(item.is_approved);
                        return (
                            <li key={item.fd_uuid} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded bg-blue-50 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <a href={`/file/${item.f_uuid}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline truncate">
                                                {item.f_name}
                                            </a>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                                            {item.is_same_department && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                                                    Internal
                                                </span>
                                            )}
                                            {!item.is_same_department && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    External
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5 flex flex-col">
                                            <span>Shared on {new Date(item.shared_at).toLocaleString()}</span>
                                            <span>From: {item.uploader_name} ({item.uploader_position === 'head' ? 'Department Head' : 'Staff'})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* View and Summary buttons always visible */}
                                    <a
                                        href={`/file/${item.f_uuid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-blue-600 text-blue-700 hover:bg-blue-50"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg> View
                                    </a>
                                    <button
                                        onClick={() => {
                                          // Just navigate to /summary with f_uuid, no download/upload
                                          navigate("/summary", { state: { f_uuid: item.f_uuid } });
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-purple-600 text-purple-700 hover:bg-purple-50"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg> Summary
                                    </button>
                                    
                                    {/* Approval buttons only shown for files that are still pending and eligible for decision */}
                                    {isHead && !item.is_same_department && item.is_approved !== 'approved' && item.is_approved !== 'rejected' && (
                                        <>
                                            <button
                                                onClick={() => approve(item.fd_uuid)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-green-600 text-green-700 hover:bg-green-50"
                                            >
                                                <CheckCircleIcon className="h-4 w-4" /> Approve
                                            </button>
                                            <button
                                                onClick={() => reject(item.fd_uuid)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-red-600 text-red-700 hover:bg-red-50"
                                            >
                                                <XCircleIcon className="h-4 w-4" /> Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default SharedFiles;