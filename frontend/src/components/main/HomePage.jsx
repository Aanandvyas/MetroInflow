import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { FolderIcon, PlusIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

const HomePage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const [recentNotifications, setRecentNotifications] = useState([]);
  const [userDeptIds, setUserDeptIds] = useState([]);
  const [deptCounts, setDeptCounts] = useState({}); // file count per department
  const navigate = useNavigate();


  // Fetch recent files (top 10 by time)
  useEffect(() => {
    const fetchRecentFiles = async () => {
      setFilesLoading(true);

      const { data: files, error: filesError } = await supabase
        .from("file")
        .select(`
          f_uuid, f_name, language, created_at,
          file_department!inner (
            f_uuid,
            is_approved
          )
        `)
        .eq("file_department.is_approved", "approved")
        .order("created_at", { ascending: false })
        .limit(10);

      if (filesError) {
        setRecentFiles([]);
        setFilesLoading(false);
        return;
      }

      const fUuids = (files || []).map((f) => f.f_uuid);
        const { data: links } = await supabase
        .from("file_department")
        .select("f_uuid, department:department ( d_uuid, d_name )")
        .in("f_uuid", fUuids);


      const deptByFile = new Map();
      (links || []).forEach((row) => {
        const arr = deptByFile.get(row.f_uuid) || [];
        if (row.department) arr.push(row.department);
        deptByFile.set(row.f_uuid, arr);
      });

      const normalized = (files || []).map((f) => ({
        ...f,
        departments: deptByFile.get(f.f_uuid) || [],
      }));

      setRecentFiles(normalized);
      setFilesLoading(false);
    };

    fetchRecentFiles();
  }, []); // run once; always top 10 latest

  // Fetch departments and initial counts
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("department")
        .select("d_uuid, d_name");
      if (error) {
        setDepartments([]);
        setLoading(false);
        return;
      }
      setDepartments(data || []);

      // Get user's department
      const user = (await supabase.auth.getUser()).data.user;
      let userDeptId = null;
      if (user) {
        const { data: profile } = await supabase.from("users").select("d_uuid").eq("uuid", user.id).maybeSingle();
        userDeptId = profile?.d_uuid;
      }

      // Count files differently for user's own dept vs other depts
      const { data: links, error: linksErr } = await supabase
        .from("file_department")
        .select(`
          d_uuid,
          file:f_uuid(
            uuid,
            users:uuid(d_uuid)
          )
        `)
        .eq("is_approved", "approved");
      if (linksErr) {
        setLoading(false);
        return;
      }
      
      const counts = {};
      (links || []).forEach((row) => {
        const senderDeptId = row.file?.users?.d_uuid;
        const receiverDeptId = row.d_uuid;
        
        if (receiverDeptId === userDeptId) {
          if (senderDeptId === userDeptId) {
            // Own department files - count under own department
            counts[userDeptId] = (counts[userDeptId] || 0) + 1;
          } else {
            // Files from other departments - count under sender department
            counts[senderDeptId] = (counts[senderDeptId] || 0) + 1;
          }
        }
      });
      setDeptCounts(counts);
      setLoading(false);
    };
    fetchDepartments();
  }, []);

  // Load user's departments once
  useEffect(() => {
    const loadUserDepts = async () => {
      const { data: mapRows, error: mapErr } = await supabase
        .from("user_department")
        .select("d_uuid")
        .eq("uuid", (await supabase.auth.getUser()).data.user?.id);
      if (!mapErr && mapRows?.length) {
        setUserDeptIds(mapRows.map((r) => r.d_uuid));
        return;
      }
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data: profile } = await supabase.from("users").select("d_uuid").eq("uuid", user.id).maybeSingle();
      if (profile?.d_uuid) setUserDeptIds([profile.d_uuid]);
      else setUserDeptIds([]);
    };
    loadUserDepts();
  }, []);

  // Realtime: new/removed files and file_department links
  useEffect(() => {
    const fetchDepartmentsForFile = async (f_uuid) => {
      const { data, error } = await supabase
        .from("file_department")
        .select("department:department ( d_uuid, d_name )")
        .eq("f_uuid", f_uuid)
        .eq("is_approved", "approved");
      if (error) return [];
      return (data || []).map((r) => r.department).filter(Boolean);
    };

    // File INSERT/DELETE
    const filesChannel = supabase
      .channel("home-files-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file" }, async (payload) => {
        const f = payload.new;
        // Attach departments for the new file
        const departments = await fetchDepartmentsForFile(f.f_uuid);
        setRecentFiles(prev => {
          const next = [{ ...f, departments }, ...prev.filter(p => p.f_uuid !== f.f_uuid)];
          return next.slice(0, 10);
        });
        setRecentNotifications((prev) => {
          const next = [
            { f_uuid: f.f_uuid, f_name: f.f_name, created_at: f.created_at },
            ...prev.filter((n) => n.f_uuid !== f.f_uuid),
          ];
          return next.slice(0, 5);
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "file" }, (payload) => {
        const old = payload.old;
        setRecentFiles((prev) => prev.filter((f) => f.f_uuid !== old.f_uuid));
        setRecentNotifications((prev) => prev.filter((n) => n.f_uuid !== old.f_uuid));
      })
      .subscribe();

    // file_department INSERT/DELETE -> update counts and department chips
    const fdChannel = supabase
      .channel("home-fd-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file_department" }, async (payload) => {
        const { f_uuid, d_uuid, is_approved } = payload.new || {};
        // Only update counts if the file is approved
        if (is_approved === "approved") {
          // Get file sender's department and current user's department
          const { data: fileData } = await supabase
            .from("file")
            .select("users:uuid(d_uuid)")
            .eq("f_uuid", f_uuid)
            .single();
            
          const senderDeptId = fileData?.users?.d_uuid;
          const user = (await supabase.auth.getUser()).data.user;
          let userDeptId = null;
          if (user) {
            const { data: profile } = await supabase.from("users").select("d_uuid").eq("uuid", user.id).maybeSingle();
            userDeptId = profile?.d_uuid;
          }
          
          if (d_uuid === userDeptId) {
            if (senderDeptId === userDeptId) {
              // Same department file - count under own department
              setDeptCounts((prev) => ({ ...prev, [userDeptId]: (prev[userDeptId] || 0) + 1 }));
            } else {
              // File from another department - count under sender department
              setDeptCounts((prev) => ({ ...prev, [senderDeptId]: (prev[senderDeptId] || 0) + 1 }));
            }
            
            // Update recent files department chips
            const { data: dept } = await supabase
              .from("department")
              .select("d_uuid, d_name")
              .eq("d_uuid", senderDeptId === userDeptId ? userDeptId : senderDeptId)
              .single();
            if (!dept) return;
            setRecentFiles((prev) => {
              const idx = prev.findIndex((f) => f.f_uuid === f_uuid);
              if (idx === -1) return prev;
              const exists = prev[idx].departments?.some((d) => d.d_uuid === dept.d_uuid);
              if (exists) return prev;
              const copy = [...prev];
              const depts = (copy[idx].departments || []).concat(dept);
              copy[idx] = { ...copy[idx], departments: depts };
              return copy;
            });
          }
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "file_department" }, (payload) => {
        const { f_uuid, d_uuid } = payload.old || {};
        // decrement badge count
        setDeptCounts((prev) => ({ ...prev, [d_uuid]: Math.max(0, (prev[d_uuid] || 1) - 1) }));
        // remove chip if file in recent list
        setRecentFiles((prev) => {
          const idx = prev.findIndex((f) => f.f_uuid === f_uuid);
          if (idx === -1) return prev;
          const copy = [...prev];
          const depts = (copy[idx].departments || []).filter((d) => d.d_uuid !== d_uuid);
          copy[idx] = { ...copy[idx], departments: depts };
          return copy;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(fdChannel);
    };
  }, []);

  // Helpers for grouping and formatting
  const toDateKey = (iso) => {
    const d = new Date(iso);
    // normalize to local date key
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const formatDateLabel = (key) => {
    const [y, m, dm] = key.split("-").map(Number);
    const target = new Date(y, m - 1, dm);
    const today = new Date();
    const yday = new Date(today);
    yday.setDate(today.getDate() - 1);
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(target, today)) return "Today";
    if (sameDay(target, yday)) return "Yesterday";
    return target.toLocaleDateString();
  };
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const groupedNotifications = useMemo(() => {
    const map = new Map();
    for (const n of recentNotifications) {
      if (!n?.created_at) continue;
      const key = toDateKey(n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    // sort groups (newest date first) and each group by time desc
    const sortedKeys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return sortedKeys.map((key) => ({
      key,
      label: formatDateLabel(key),
      items: map.get(key).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
  }, [recentNotifications]);

  // Helper: is date today?
  const isToday = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  // Today’s notifications for user’s departments (initial + realtime)
  useEffect(() => {
    if (!userDeptIds || userDeptIds.length === 0) {
      setRecentNotifications([]);
      return;
    }

    const loadToday = async () => {
      // Get latest files linked to user's departments
      const { data, error } = await supabase
        .from("file")
        .select("f_uuid, f_name, created_at, file_department!inner(d_uuid)")
        .in("file_department.d_uuid", userDeptIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        setRecentNotifications([]);
        return;
      }
      // Dedup and filter to today
      const seen = new Map();
      (data || []).forEach((f) => {
        if (!seen.has(f.f_uuid)) seen.set(f.f_uuid, f);
      });
      const todayOnly = Array.from(seen.values()).filter((f) => isToday(f.created_at));
      setRecentNotifications(todayOnly);
    };

    loadToday();

    const addIfRelevantToday = async (f_uuid) => {
      // Check mapping
      const { data: links } = await supabase.from("file_department").select("d_uuid").eq("f_uuid", f_uuid);
      const hasOverlap = (links || []).some((r) => userDeptIds.includes(r.d_uuid));
      if (!hasOverlap) return;
      // Fetch file
      const { data: fileRow } = await supabase
        .from("file")
        .select("f_uuid, f_name, created_at")
        .eq("f_uuid", f_uuid)
        .single();
      if (!fileRow || !isToday(fileRow.created_at)) return;
      setRecentNotifications((prev) => {
        const dedup = [fileRow, ...prev.filter((p) => p.f_uuid !== fileRow.f_uuid)];
        return dedup.slice(0, 50);
      });
    };

    const filesChannel = supabase
      .channel("home-today-files")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file" }, (payload) => {
        addIfRelevantToday(payload.new.f_uuid);
      })
      .subscribe();

    const fdChannel = supabase
      .channel("home-today-fd")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "file_department" }, async (payload) => {
        const { f_uuid, d_uuid } = payload.new || {};
        if (!f_uuid || !d_uuid) return;
        if (!userDeptIds.includes(d_uuid)) return;
        addIfRelevantToday(f_uuid);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(fdChannel);
    };
  }, [userDeptIds]);

  return (
    <div className="p-8 bg-gray-50/50">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <button
          onClick={() => navigate("/upload-document")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          New
        </button>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Departments</h2>
        {loading ? (
          <p>Loading departments...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {departments.map((dept) => {
              const count = deptCounts[dept.d_uuid] || 0;
              return (
                <Link key={dept.d_uuid} to={`/department/${dept.d_uuid}`} className="block">
                  <div className="relative bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition cursor-pointer group h-full">
                    <div className="flex items-center justify-between">
                      <FolderIcon className="h-8 w-8 text-teal-600 group-hover:text-teal-700" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-800">{dept.d_name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Files</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {filesLoading ? (
            <div>Loading recent files...</div>
          ) : recentFiles.length === 0 ? (
            <div>No recent files found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentFiles.map((file, idx) => (
                    <tr key={file.f_uuid + "-" + idx} className="hover:bg-gray-50 transition">
                      <td
                        className="px-6 py-4 whitespace-nowrap flex items-center gap-3 cursor-pointer"
                        onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                      >
                        <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-blue-600 truncate max-w-xs hover:underline">
                          {file.f_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {file.departments && file.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {file.departments.map((dept) => (
                              <span
                                key={`${file.f_uuid}-${dept.d_uuid}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {dept.d_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">No Department</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.language || "Unknown"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="text-white bg-blue-600 rounded px-3 py-1 text-sm font-medium hover:bg-blue-700"
                          onClick={() => {
                            // Just navigate to /summary with f_uuid, no download/upload
                            navigate("/summary", { state: { f_uuid: file.f_uuid } });
                          }}
                        >
                          Summary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {/* Recent Notifications */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Notifications</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {recentNotifications.length === 0 ? (
            <div className="text-gray-500">No notifications.</div>
          ) : (
            <div className="space-y-6">
              {groupedNotifications.map((group) => (
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
                            className="inline-flex items-center justify-center h-8 px-3 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-8 px-3 bg-gray-600 text-white rounded-md text-xs font-medium hover:bg-gray-700"
                            onClick={() => {
                              // Just navigate to /summary with f_uuid, no download/upload
                              navigate("/summary", { state: { f_uuid: file.f_uuid } });
                            }}
                          >
                            Summary
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;