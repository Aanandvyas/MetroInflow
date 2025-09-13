import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { useFilter } from "../context/FilterContext";
import FileCard from "./FileCard";
import { Link } from "react-router-dom";

const AllFiles = () => {
  const { user } = useAuth();
  const { searchTerm: globalSearchTerm } = useFilter();

  // Filters (same as HomePage)
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [allDepartmentFiles, setAllDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // File viewer (side panel)
  const [selectedFile, setSelectedFile] = useState(null);

  // ✅ Load departments for filter
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

  // ✅ Load files with filters (same pattern as HomePage)
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);

      // Modify the query to include uploader information
      let query = supabase
        .from("file")
        .select(`
          f_uuid,
          f_name,
          language,
          d_uuid,
          created_at,
          department:d_uuid(d_name),
          uploader:uuid(name)  // Add this line to get uploader name
        `)
        .order("created_at", { ascending: false });

      if (selectedDepartment) {
        query = query.eq("d_uuid", selectedDepartment);
      }
      if (selectedLanguage) {
        query = query.eq("language", selectedLanguage);
      }
      const effectiveSearch = searchTerm?.trim() || globalSearchTerm?.trim();
      if (effectiveSearch) {
        query = query.ilike("f_name", `%${effectiveSearch}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error loading files:", error.message);
        setAllDepartmentFiles([]);
      } else {
        setAllDepartmentFiles(data || []);
      }

      setLoading(false);
    };

    fetchFiles();
  }, [user, selectedDepartment, selectedLanguage, searchTerm, globalSearchTerm]);

  // ✅ Languages available from current result set (for filter options)
  const languageOptions = useMemo(() => {
    return [...new Set(allDepartmentFiles.map((f) => f.language).filter(Boolean))];
  }, [allDepartmentFiles]);

  // ✅ Group files by created_at date
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
          {languageOptions.map((lang) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {files.map((file) => (
                    <div
                      key={file.f_uuid}
                      className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105"
                      style={{ minHeight: "180px" }}
                    >
                      <div className="w-full">
                        <div className="text-xl font-semibold text-gray-800 mb-2">{file.f_name}</div>
                        <div className="text-sm text-gray-600 mb-2">
                          Uploaded by: {file.uploader?.name || "Unknown"}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <span className="inline-block text-xs bg-gray-200 text-gray-700 rounded px-2 py-1">
                          {file.department?.d_name || "Unknown Department"}
                        </span>
                        <span className="inline-block text-xs bg-gray-200 text-gray-700 rounded px-2 py-1">
                          {file.language || "Unknown Language"}
                        </span>
                      </div>
                      <div className="mt-4 text-xs text-gray-500">
                        {file.created_at
                          ? new Date(file.created_at).toLocaleString()
                          : "Unknown"}
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <a
                          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                          href={`/file/${file.f_uuid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                        <Link
                          to={`/summary`}
                          className="ml-2 inline-block px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-800"
                        >
                          Summary
                        </Link>
                        <Link
                          to={`/archive`}
                          className="ml-2 inline-block px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          Archive
                        </Link>
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
