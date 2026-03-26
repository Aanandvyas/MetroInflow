import React, { useEffect, useMemo, useState } from 'react';
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';



const SharedFiles = () => {
    const navigate = useNavigate();
    const { user, userProfile: profile } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



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



                const { data, error } = await query;
                if (error) throw error;

                // Filter and map the data
                const mapped = (data || [])
                    .filter(r => {
                        return r.file != null;
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
    }, [profile?.d_uuid]);



    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex flex-col mb-6">
                <h1 className="text-2xl font-semibold">Shared Files</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Files shared with your department in the last 7 days.
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
                        Files shared with your department will appear here.
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-200 bg-white border rounded">
                    {rows.map(item => {
                        return (
                            <li key={item.fd_uuid} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded bg-blue-50 text-blue-600"><DocumentTextIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <a href={`/file/${item.f_uuid}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline truncate">
                                                {item.f_name}
                                            </a>

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