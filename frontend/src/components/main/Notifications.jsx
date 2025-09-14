import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const toDateKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const labelForKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  if (isSameDay(target, today)) return "Today";
  if (isSameDay(target, yday)) return "Yesterday";
  return target.toLocaleDateString();
};
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Notifications = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // [{ f_uuid, f_name, created_at }]
  const [userDeptIds, setUserDeptIds] = useState([]);
  const [deptsLoading, setDeptsLoading] = useState(true); // <-- new

  // Simple spinner + skeletons
  const Spinner = () => (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-blue-600"
      role="status"
      aria-label="loading"
    />
  );

  const SkeletonItem = () => (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-md bg-gray-200 h-9 w-9 animate-pulse" />
        <div className="min-w-0">
          <div className="h-4 bg-gray-200 rounded w-56 mb-2 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    </li>
  );

  // Fetch user's departments (expects user_department table: uuid, d_uuid)
  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setUserDeptIds([]);
      setDeptsLoading(false);
      return;
    }
    setDeptsLoading(true);
    const loadUserDepts = async () => {
      const { data: mapRows, error: mapErr } = await supabase
        .from("user_department")
        .select("d_uuid")
        .eq("uuid", user.id);
      if (!mapErr && mapRows?.length) {
        if (active) setUserDeptIds(mapRows.map((r) => r.d_uuid));
      } else {
        const { data: profile } = await supabase
          .from("users")
          .select("d_uuid")
          .eq("uuid", user.id)
          .maybeSingle();
        if (active) setUserDeptIds(profile?.d_uuid ? [profile.d_uuid] : []);
      }
      if (active) setDeptsLoading(false);
    };
    loadUserDepts();
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Initial load (all days for user’s departments) + realtime
  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Wait until departments are resolved before deciding UI
    if (deptsLoading) {
      setLoading(true);
      return;
    }

    // If user has no departments, show empty only after depts resolved
    if (!userDeptIds || userDeptIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const load = async () => {
      const { data, error } = await supabase
        .from("file")
        .select("f_uuid, f_name, created_at, file_department!inner(d_uuid)")
        .in("file_department.d_uuid", userDeptIds)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        console.error("Failed to load notifications:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      const seen = new Map();
      (data || []).forEach((f) => {
        if (!seen.has(f.f_uuid))
          seen.set(f.f_uuid, { f_uuid: f.f_uuid, f_name: f.f_name, created_at: f.created_at });
      });
      setItems(Array.from(seen.values()));
      setLoading(false);
    };

    load();

    const addIfRelevant = async (f_uuid) => {
      const { data: links } = await supabase
        .from("file_department")
        .select("d_uuid")
        .eq("f_uuid", f_uuid);
      const hasOverlap = (links || []).some((r) => userDeptIds.includes(r.d_uuid));
      if (!hasOverlap) return;
      const { data: fileRow } = await supabase
        .from("file")
        .select("f_uuid, f_name, created_at")
        .eq("f_uuid", f_uuid)
        .single();
      if (!fileRow) return;
      setItems((prev) => {
        if (prev.some((x) => x.f_uuid === f_uuid)) return prev;
        return [{ ...fileRow }, ...prev].slice(0, 300);
      });
    };

    const filesChannel = supabase
      .channel("notif-files-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file" }, (payload) => {
        addIfRelevant(payload.new.f_uuid);
      })
      .subscribe();

    const fdChannel = supabase
      .channel("notif-fd-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file_department" }, async (payload) => {
        const { f_uuid, d_uuid } = payload.new || {};
        if (!f_uuid || !d_uuid) return;
        if (!userDeptIds.includes(d_uuid)) return;
        addIfRelevant(f_uuid);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(fdChannel);
    };
  }, [user?.id, userDeptIds, deptsLoading]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const n of items) {
      if (!n?.created_at) continue;
      const key = toDateKey(n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({
      key: k,
      label: labelForKey(k),
      items: map.get(k).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
  }, [items]);

  const fetchAndDownload = async (fileId) => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("files").download(fileId);
    if (!data) {
      console.error("Failed to download file:", error);
      setLoading(false);
      return;
    }
    const url = URL.createObjectURL(data.signedUrl);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
        Notifications
        {(loading || deptsLoading) && <Spinner />}
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {loading || deptsLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-10 bg-gray-100 rounded animate-pulse ml-2" />
                </div>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                  {Array.from({ length: 4 }).map((_, li) => (
                    <SkeletonItem key={li} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-gray-500">No notifications for your departments.</div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
                  <span className="ml-2 text-xs text-gray-400">({group.items.length})</span>
                </div>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                  {group.items.map((file) => (
                    <li key={file.f_uuid} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-blue-100 text-blue-600 rounded-md p-2">
                          <DocumentTextIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            <span className="font-semibold">{file.f_name}</span> was added
                          </p>
                          <p className="text-xs text-gray-500">{formatTime(file.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                            className="inline-flex items-center justify-center h-9 px-4 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                          >
                            View
                          </button>
                        <Link
                          to="/summary"
                          className="inline-flex items-center justify-center h-8 px-3 bg-gray-600 text-white rounded-md text-xs font-medium hover:bg-gray-700"
                        >
                          Summary
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;