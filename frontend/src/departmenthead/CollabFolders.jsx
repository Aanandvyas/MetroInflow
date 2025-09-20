import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/context/AuthContext';
import { supabase } from '../supabaseClient';
import { CheckCircleIcon, XCircleIcon, DocumentTextIcon, StarIcon as StarOutline, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const StatusPill = ({ value }) => {
  const meta = value === true
    ? { label: 'Approved', cls: 'text-green-700 bg-green-50 border-green-200' }
    : value === false
    ? { label: 'Rejected', cls: 'text-red-700 bg-red-50 border-red-200' }
    : { label: 'Pending', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  return <span className={`text-xs px-2 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>;
};

const CollabList = ({ title, rows, isHead, onApprove, onReject, importantMap, toggleImportant }) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <span className="text-xs text-gray-500">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
    </div>
    {rows.length === 0 ? (
      <div className="text-gray-600 text-sm">No items.</div>
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
                <div className="text-xs text-gray-500 mt-0.5">Shared on {new Date(r.shared_at).toLocaleString()}</div>
              </div>
            </div>
            {isHead && r.canDecide && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onApprove(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-green-600 text-green-700 hover:bg-green-50" disabled={r.is_approved === true}>
                  <CheckCircleIcon className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => onReject(r.fd_uuid)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-red-600 text-red-700 hover:bg-red-50" disabled={r.is_approved === false}>
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

const CollabFolders = () => {
  const { user, getUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importantMap, setImportantMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fd_important_map') || '{}');
    } catch {
      return {};
    }
  });

  const isHead = useMemo(() => profile?.position === 'head', [profile]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const data = await getUserProfile(user.id);
        setProfile(data);
      } catch (e) {
        setError('Failed to load profile');
      }
    };
    load();
  }, [user?.id, getUserProfile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.d_uuid) { setReceived([]); setSent([]); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        // Received for my department
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
              d_uuid
            )
          `)
          .eq('d_uuid', profile.d_uuid)
          .order('created_at', { ascending: false });
        if (recErr) throw recErr;

        const recMapped = (recData || []).filter(r => r.file).map(r => ({
          fd_uuid: r.fd_uuid,
          f_uuid: r.f_uuid,
          is_approved: r.is_approved,
          shared_at: r.created_at,
          f_name: r.file?.f_name || 'Unnamed File',
          file_created_at: r.file?.created_at,
          other_d_uuid: r.file?.d_uuid, // source department
          canDecide: true, // current dept can decide on received
        }));

        // Sent to other departments (filter by file owner dept = my dept if available)
        const { data: sentData, error: sentErr } = await supabase
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
              d_uuid
            )
          `)
          .neq('d_uuid', profile.d_uuid)
          .order('created_at', { ascending: false });
        if (sentErr) throw sentErr;

        const sentMapped = (sentData || [])
          .filter(r => r.file && r.file.d_uuid && r.file.d_uuid === profile.d_uuid)
          .map(r => ({
            fd_uuid: r.fd_uuid,
            f_uuid: r.f_uuid,
            is_approved: r.is_approved, // other department's decision
            shared_at: r.created_at,
            f_name: r.file?.f_name || 'Unnamed File',
            file_created_at: r.file?.created_at,
            other_d_uuid: r.d_uuid, // target department
            canDecide: false, // cannot decide other dept's approval
          }));

        setReceived(recMapped);
        setSent(sentMapped);
      } catch (e) {
        console.error(e);
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
    return Array.from(s);
  }, [received, sent]);

  const [deptMap, setDeptMap] = useState({});

  useEffect(() => {
    const fetchDeptNames = async () => {
      if (!deptIds.length) { setDeptMap({}); return; }
      const { data, error } = await supabase.from('department').select('d_uuid, d_name').in('d_uuid', deptIds);
      if (error) { console.warn('Failed to fetch department names', error); return; }
      const map = {};
      (data || []).forEach(d => { map[d.d_uuid] = d.d_name; });
      setDeptMap(map);
    };
    fetchDeptNames();
  }, [JSON.stringify(deptIds)]);

  const cards = useMemo(() => {
    const recByDept = {};
    const sentByDept = {};
    received.forEach(r => {
      const k = r.other_d_uuid || 'unknown';
      (recByDept[k] ||= []).push(r);
    });
    sent.forEach(srow => {
      const k = srow.other_d_uuid || 'unknown';
      (sentByDept[k] ||= []).push(srow);
    });
    const ids = new Set([...Object.keys(recByDept), ...Object.keys(sentByDept)]);
    return Array.from(ids).map(id => ({
      id,
      name: deptMap[id] || 'Unknown Department',
      received: recByDept[id] || [],
      sent: sentByDept[id] || [],
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [deptMap, received, sent]);

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  useEffect(() => {
    if (!selectedDeptId && cards.length > 0) {
      setSelectedDeptId(cards[0].id);
    }
  }, [cards, selectedDeptId]);

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedDeptId) || null, [cards, selectedDeptId]);

  return (
    <div>
      {error && <div className="mb-3 border border-red-200 bg-red-50 text-red-700 p-2 rounded">{error}</div>}
      {loading ? (
        <div className="text-gray-600">Loading collaboration folders…</div>
      ) : cards.length === 0 ? (
        <div className="text-gray-600">No collaboration with other departments yet.</div>
      ) : (
        <div>
          {/* Horizontal department strip */}
          <div className="mb-3 flex overflow-x-auto gap-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
          {selectedCard ? (
            <div className="border rounded bg-white">
              <div className="p-3 border-b flex items-center gap-2">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">{selectedCard.name}</h3>
              </div>
              <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <CollabList
                    title="Received from this department"
                    rows={selectedCard.received}
                    isHead={isHead}
                    onApprove={approve}
                    onReject={reject}
                    importantMap={importantMap}
                    toggleImportant={toggleImportant}
                  />
                </div>
                <div>
                  <CollabList
                    title="Shared to this department"
                    rows={selectedCard.sent}
                    isHead={false}
                    onApprove={() => {}}
                    onReject={() => {}}
                    importantMap={importantMap}
                    toggleImportant={toggleImportant}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CollabFolders;
