import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from '../../supabaseClient';

const AdminAllFiles = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [allDepartmentFiles, setAllDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef();
  const lastFileElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreFiles();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const FILES_PER_PAGE = 10;

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("department")
        .select("d_uuid, d_name")
        .order("d_name", { ascending: true });
      if (error) {
        setDepartments([]);
      } else {
        setDepartments(data || []);
      }
    };
    fetchDepartments();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setAllDepartmentFiles([]);
    setHasMore(true);
  }, [selectedDepartment, selectedLanguage, searchTerm]);

  // Fetch files
  const fetchFiles = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const from = (pageNum - 1) * FILES_PER_PAGE;
    const to = from + FILES_PER_PAGE - 1;

    // Fetch all files with departments and uploader
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
      .select(selectClause, { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    // Department: inner join + nested column filter
    if (selectedDepartment) {
      fileQuery = fileQuery.eq("file_department.d_uuid", selectedDepartment);
    }

    // Language
    if (selectedLanguage) {
      fileQuery = fileQuery.eq("language", selectedLanguage);
    }

    // Search
    if (searchTerm?.trim()) {
      fileQuery = fileQuery.ilike("f_name", `%${searchTerm.trim()}%`);
    }

    const { data: files, error: fileError, count } = await fileQuery;
    if (fileError) {
      if (pageNum === 1) {
        setAllDepartmentFiles([]);
      }
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Check if there are more files to load
    setHasMore(!!(count && count > to + 1));

    // Process the files to include department info
    const processedFiles = (files || []).map(f => ({
      ...f,
      departments: (f.file_department || [])
        .map(fd => fd.department)
        .filter(Boolean)
    }));

    if (append) {
      setAllDepartmentFiles(prev => [...prev, ...processedFiles]);
    } else {
      setAllDepartmentFiles(processedFiles);
    }
    
    setLoading(false);
    setLoadingMore(false);
  }, [selectedDepartment, selectedLanguage, searchTerm, FILES_PER_PAGE]);

  const loadMoreFiles = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFiles(nextPage, true);
    }
  }, [page, hasMore, loading, loadingMore, fetchFiles]);

  useEffect(() => {
    fetchFiles(1, false);
  }, [fetchFiles]);

  // Fetch distinct languages
  useEffect(() => {
    const fetchLanguages = async () => {
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
        if (searchTerm?.trim()) q = q.ilike("f_name", `%${searchTerm.trim()}%`);
        const { data, error } = await q.not("language", "is", null);
        if (error) throw error;
        const langs = Array.from(
          new Set((data || []).map(r => r.language).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setLanguages(langs);
      } catch (e) {
        setLanguages([]);
      }
    };
    fetchLanguages();
  }, [selectedDepartment, searchTerm]);

  const groupedFiles = useMemo(() => {
    const groups = {};
    (allDepartmentFiles || []).forEach((file, index) => {
      const date = file.created_at
        ? new Date(file.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Unknown Date";
      if (!groups[date]) groups[date] = [];
      
      // Add ref to the last element for infinite scroll
      if (index === allDepartmentFiles.length - 1) {
        groups[date].push({ ...file, isLast: true });
      } else {
        groups[date].push(file);
      }
    });
    return groups;
  }, [allDepartmentFiles]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800">All Files</h3>
        
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={() => fetchFiles(1, false)}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        {loading && page === 1 ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : Object.keys(groupedFiles).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedFiles).map(([date, files]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">{date}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {files.map((file, index) => (
                    <div
                      key={file.f_uuid}
                      ref={file.isLast ? lastFileElementRef : null}
                      className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col h-full"
                    >
                      <div className="flex-1">
                        <div className="text-xl font-semibold text-gray-800 mb-2">
                          {file.f_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Uploaded by: {file.uploader?.name || "Unknown"}
                        </div>

                        {/* Meta data */}
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

                      {/* Footer */}
                      <div className="pt-3 mt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                        </div>

                        <div className="mt-3">
                          <a
                            href={`/file/${file.f_uuid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-9 px-4 bg-indigo-500 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                          >
                            View File
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-10">No files found matching the selected criteria.</p>
        )}
      </div>
    </div>
  );
};

export default AdminAllFiles;