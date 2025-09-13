import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { useFilter } from "../context/FilterContext";
import { Link } from "react-router-dom";

const AllFiles = () => {
  const { user } = useAuth();
  const { searchTerm: globalSearchTerm } = useFilter();

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [allDepartmentFiles, setAllDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favBusy, setFavBusy] = useState({});
  const [languages, setLanguages] = useState([]); // <-- new, independent language options

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("department")
        .select("d_uuid, d_name")
        .order("d_name", { ascending: true });
      if (error) {
        console.error("Error fetching departments:", error.message);
        setDepartments([]);
      } else {
        setDepartments(data || []);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch files and favorites, then merge
  const fetchFiles = async () => {
    setLoading(true);

    // 1. Fetch all files with departments and uploader
    const selectClause = `
      f_uuid,
      f_name,
      language,
      created_at,
      uploader:uuid(name),
      file_department${selectedDepartment ? "!inner" : ""} (
        d_uuid,
        department:d_uuid ( d_uuid, d_name )
      )
    `;

    let fileQuery = supabase
      .from("file")
      .select(selectClause)
      .order("created_at", { ascending: false });

    // Department: inner join + nested column filter
    if (selectedDepartment) {
      fileQuery = fileQuery.eq("file_department.d_uuid", selectedDepartment);
    }

    // Language
    if (selectedLanguage) {
      fileQuery = fileQuery.eq("language", selectedLanguage);
    }

    // Search (local or global)
    const effectiveSearch = searchTerm?.trim() || globalSearchTerm?.trim();
    if (effectiveSearch) {
      fileQuery = fileQuery.ilike("f_name", `%${effectiveSearch}%`);
    }

    const { data: files, error: fileError } = await fileQuery;
    if (fileError) {
      console.error("Error loading files:", fileError.message);
      setAllDepartmentFiles([]);
      setLoading(false);
      return;
    }

    // 2. Fetch all favorites for this user
    let favouriteIds = [];
    if (user?.id) {
      const { data: favs, error: favError } = await supabase
        .from("favorites")
        .select("f_uuid")
        .eq("uuid", user.id);
      if (!favError && favs) {
        favouriteIds = favs.map(f => f.f_uuid);
      }
    }

    // 3. Merge: mark files as favorite if in favouriteIds
    const filesWithFav = (files || []).map(f => ({
      ...f,
      departments: (f.file_department || [])
        .map(fd => fd.department)
        .filter(Boolean),
      is_favorite: favouriteIds.includes(f.f_uuid),
    }));

    setAllDepartmentFiles(filesWithFav);
    setLoading(false);
  };

  // Fetch distinct languages ignoring selectedLanguage (but respecting dept + search)
  useEffect(() => {
    const fetchLanguages = async () => {
      const effectiveSearch = (searchTerm || globalSearchTerm || "").trim();
      try {
        let q;
        if (selectedDepartment) {
          q = supabase
            .from("file")
            .select("language, file_department!inner(d_uuid)")
            .eq("file_department.d_uuid", selectedDepartment);
        } else {
          q = supabase.from("file").select("language");
        }
        if (effectiveSearch) q = q.ilike("f_name", `%${effectiveSearch}%`);
        const { data, error } = await q.not("language", "is", null);
        if (error) throw error;
        const langs = Array.from(
          new Set((data || []).map(r => r.language).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setLanguages(langs);
      } catch (e) {
        console.error("Error fetching languages:", e.message);
        setLanguages([]);
      }
    };
    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, searchTerm, globalSearchTerm]);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, [user, selectedDepartment, selectedLanguage, searchTerm, globalSearchTerm]);

  const groupedFiles = useMemo(() => {
    const groups = {};
    (allDepartmentFiles || []).forEach((file) => {
      const date = file.created_at
        ? new Date(file.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Unknown Date";
      if (!groups[date]) groups[date] = [];
      groups[date].push(file);
    });
    return groups;
  }, [allDepartmentFiles]);

  const toggleFavorite = async (f_uuid, isFavorite) => {
    if (!user?.id) return;
    // optimistic UI
    setAllDepartmentFiles(prev =>
      prev.map(f => (f.f_uuid === f_uuid ? { ...f, is_favorite: !isFavorite } : f))
    );
    setFavBusy(prev => ({ ...prev, [f_uuid]: true }));
    try {
      if (isFavorite) {
        const { error } = await supabase.from("favorites").delete()
          .eq("uuid", user.id).eq("f_uuid", f_uuid);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites")
          .upsert({ uuid: user.id, f_uuid }, { onConflict: "uuid,f_uuid" });
        if (error) throw error;
      }
    } catch (e) {
      // revert on failure
      setAllDepartmentFiles(prev =>
        prev.map(f => (f.f_uuid === f_uuid ? { ...f, is_favorite: isFavorite } : f))
      );
      console.error("Favorite toggle failed:", e);
    } finally {
      setFavBusy(prev => ({ ...prev, [f_uuid]: false }));
    }
  };

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">All Department Files</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.d_uuid} value={dept.d_uuid}>
              {dept.d_name}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="">All Languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* Files grid */}
      <div>
        {loading ? (
          <p className="text-gray-600">Loading files...</p>
        ) : Object.keys(groupedFiles).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedFiles).map(([date, files]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">{date}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch auto-rows-[minmax(260px,_1fr)]">
                  {files.map((file) => (
                    <div
                      key={file.f_uuid}
                      className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col h-full transition-transform hover:scale-105"
                    >
                      {/* Content grows, pushing footer (date + actions) to bottom */}
                      <div className="flex-1 w-full">
                        <div className="text-xl font-semibold text-gray-800 mb-2">
                          {file.f_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Uploaded by: {file.uploader?.name || "Unknown"}
                        </div>

                        {/* Labeled meta rows */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-medium text-gray-600">Departments:</span>
                            {(file.departments && file.departments.length > 0) ? (
                              file.departments.map((dept) => (
                                <span
                                  key={`${file.f_uuid}-${dept.d_uuid}`}
                                  className="inline-block text-xs bg-blue-100 text-blue-800 rounded px-2 py-0.5"
                                >
                                  {dept.d_name}
                                </span>
                              ))
                            ) : (
                              <span className="inline-block text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-0.5">
                                No Department
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-medium text-gray-600">Language:</span>
                            <span className="inline-block text-xs bg-violet-100 text-violet-800 rounded px-2 py-0.5">
                              {file.language || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: date (static) + actions */}
                      <div className="pt-3 mt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                            className="inline-flex items-center justify-center h-9 px-4 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                          >
                            View
                          </button>
                          <Link
                            to={`/summary`}
                            className="inline-flex items-center justify-center h-9 px-4 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                          >
                            Summary
                          </Link>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(file.f_uuid, file.is_favorite)}
                            disabled={!!favBusy[file.f_uuid]}
                            className={`inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ${
                              file.is_favorite ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
                            } text-white ${favBusy[file.f_uuid] ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {file.is_favorite ? "Unfavorite" : "Favorite"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">No files found.</p>
        )}
      </div>
    </div>
  );
};

export default AllFiles;