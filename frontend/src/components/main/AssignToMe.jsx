import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import CalendarCard from "../assign-to-me/CalendarCard";
import AssignmentsCard from "../assign-to-me/AssignmentsCard";
import { DocumentTextIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Link } from "react-router-dom";

const AssignToMe = () => {
  const { user } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [impBusy, setImpBusy] = useState({}); // <-- add

  // Close any open menu on outside click
  useEffect(() => {
    const handleDocClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // First, fetch user's department
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("users")
        .select("d_uuid, department(d_name)")
        .eq("uuid", user.id)
        .single();
      if (!error) setUserDepartment(data);
    };
    run();
  }, [user]);

  // Then, fetch files only for user's department (via join)
  useEffect(() => {
    const run = async () => {
      if (!userDepartment?.d_uuid) return;
      setFilesLoading(true);

      let query = supabase
        .from("file")
        .select(`
          f_uuid, f_name, language, file_path, created_at, uuid,
          uploader:uuid(name),
          file_department!inner (
            d_uuid,
            department:d_uuid ( d_uuid, d_name )
          )
        `)
        .eq("file_department.d_uuid", userDepartment.d_uuid)
        .order("created_at", { ascending: false });

      if (selectedLanguage) {
        query = query.eq("language", selectedLanguage);
      }

      const { data, error } = await query;
      if (!error) {
        setRecentFiles(
          (data || []).map((f) => ({
            ...f,
            departments: (f.file_department || [])
              .map((fd) => fd.department)
              .filter(Boolean),
          }))
        );
      }
      setFilesLoading(false);
    };
    run();
  }, [userDepartment, selectedLanguage]);

  // Calendar/Assignments logic
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateKey = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const docsByDate = React.useMemo(() => {
    const mapped = {};
    (recentFiles || []).forEach((doc) => {
      const dateKey = formatDateKey(new Date(doc.created_at));
      if (!mapped[dateKey]) mapped[dateKey] = [];
      mapped[dateKey].push({
        f_uuid: doc.f_uuid, // add uuid for actions
        title: doc.f_name,
        from: userDepartment?.department?.d_name || "Your Department",
      });
    });
    return mapped;
  }, [recentFiles, userDepartment]);

  const docsForSelectedDate = docsByDate[formatDateKey(selectedDate)] || [];

  // Mark Important (favorites)
  const markImportant = async (f_uuid) => {
    if (!user?.id || !f_uuid || impBusy[f_uuid]) return;
    setImpBusy((s) => ({ ...s, [f_uuid]: true }));
    try {
      const { error } = await supabase
        .from("favorites")
        .upsert({ uuid: user.id, f_uuid }, { onConflict: "uuid,f_uuid" });
      if (error) throw error;

      // reflect in local list (optional)
      setRecentFiles((prev) =>
        prev.map((f) => (f.f_uuid === f_uuid ? { ...f, is_favorite: true } : f))
      );
    } catch (e) {
      console.error("Failed to mark Important:", e);
      alert("Could not mark Important. Please try again.");
    } finally {
      setImpBusy((s) => ({ ...s, [f_uuid]: false }));
      setOpenMenuId(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <CalendarCard
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          docsByDate={docsByDate}
        />
        <AssignmentsCard
          selectedDate={selectedDate}
          assignments={docsForSelectedDate}
          loading={filesLoading}
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {userDepartment?.department?.d_name || 'Your Department'} Files
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="border rounded px-3 py-2"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {[...new Set(recentFiles.map(f => f.language).filter(Boolean))].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {filesLoading ? (
          <div className="text-center py-4">Loading files...</div>
        ) : recentFiles.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No files found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentFiles.map((file) => (
                  <tr key={file.f_uuid} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                      <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 truncate max-w-xs" title={file.f_name}>
                        {file.f_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {file.departments.map((dept) => (
                          <span
                            key={`${file.f_uuid}-${dept.d_name}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {dept.d_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {file.language || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {file.uploader?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === file.f_uuid}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ x: rect.right, y: rect.bottom });
                            setOpenMenuId(openMenuId === file.f_uuid ? null : file.f_uuid);
                          }}
                          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                          title="More actions"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fixed-position dropdown so it’s never clipped */}
      {openMenuId && (
        <div
          role="menu"
          className="fixed z-[1000] w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1"
          style={{ top: menuPos.y + 6, left: Math.max(8, menuPos.x - 160) }}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to="/summary"
            role="menuitem"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpenMenuId(null)}
          >
            Summary
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => markImportant(openMenuId)}
            disabled={!!impBusy[openMenuId]}
            className={`block w-full text-left px-4 py-2 text-sm ${
              impBusy[openMenuId] ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Mark Important
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignToMe;