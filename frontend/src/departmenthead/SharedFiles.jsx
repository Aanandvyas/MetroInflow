import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';

// Helper for status label/color
const statusMeta = (isApproved) => {
    if (isApproved === true) return { label: 'Approved', color: 'text-green-700 bg-green-50 border-green-200' };
    if (isApproved === false) return { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' };
    return { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' };
};

const SharedFiles = () => {
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

    // Fetch shared files for this department
    useEffect(() => {
        const fetchRows = async () => {
            if (!profile?.d_uuid) { setRows([]); setLoading(false); return; }
            setLoading(true);
            setError(null);
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
                            created_at
                        )
                    `)
                    .eq('d_uuid', profile.d_uuid)
                    .order('created_at', { ascending: false });

                // Staff see only approved
                if (!isHead) {
                    query = query.eq('is_approved', true);
                }

                const { data, error } = await query;
                if (error) throw error;

                const mapped = (data || [])
                    .filter(r => r.file) // ensure joined file exists
                    .map(r => ({
                        fd_uuid: r.fd_uuid,
                        f_uuid: r.f_uuid,
                        is_approved: r.is_approved,
                        shared_at: r.created_at,
                        f_name: r.file?.f_name || 'Unnamed File',
                        file_created_at: r.file?.created_at,
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
                .update({ is_approved: true })
                .eq('fd_uuid', fd_uuid);
            if (error) throw error;
            // Optimistic update
            setRows(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: true } : r));
        } catch (e) {
            console.error('Approve failed', e);
            setError(e.message || 'Failed to approve');
        }
    };

    const reject = async (fd_uuid) => {
        try {
            const { error } = await supabase
                .from('file_department')
                .update({ is_approved: false })
                .eq('fd_uuid', fd_uuid);
            if (error) throw error;
            // Optimistic update
            setRows(prev => prev.map(r => r.fd_uuid === fd_uuid ? { ...r, is_approved: false } : r));
        } catch (e) {
            console.error('Reject failed', e);
            setError(e.message || 'Failed to reject');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Shared Files</h1>
            </div>

            {error && (
                <div className="mb-4 border border-red-200 bg-red-50 text-red-700 p-3 rounded">{error}</div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-gray-600"><ClockIcon className="h-5 w-5 animate-spin" /> Loading…</div>
            ) : rows.length === 0 ? (
                <div className="text-gray-600">No shared files{isHead ? '' : ' approved for your department yet'}.</div>
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
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">Shared on {new Date(item.shared_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                {isHead && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => approve(item.fd_uuid)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-green-600 text-green-700 hover:bg-green-50"
                                            disabled={item.is_approved === true}
                                        >
                                            <CheckCircleIcon className="h-4 w-4" /> Approve
                                        </button>
                                        <button
                                            onClick={() => reject(item.fd_uuid)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-red-600 text-red-700 hover:bg-red-50"
                                            disabled={item.is_approved === false}
                                        >
                                            <XCircleIcon className="h-4 w-4" /> Reject
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default SharedFiles;