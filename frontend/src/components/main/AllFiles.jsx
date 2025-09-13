import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const AllFiles = () => {
  const { user } = useAuth();

  // Filters (same as HomePage)
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [allDepartmentFiles, setAllDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const fetchAllFiles = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");

      try {
        // Fetch all files with their details
        const { data: filesData, error: filesError } = await supabase
          .from("file")
          .select(`
            f_uuid,
            f_name,
            file_path,
            created_at,
            language,
            department:d_uuid(d_name),
            uploader:uuid(name)
          `)
          .order('created_at', { ascending: false });

        if (filesError) throw filesError;

        // Group files using composite key (name + date + language)
        const groupedFiles = filesData.reduce((acc, currentFile) => {
          // Create a unique key combining name, date and language
          const key = [
            currentFile.f_name,
            currentFile.created_at,
            currentFile.language || 'none'  // Handle null language
          ].join('|');

          if (!acc[key]) {
            // First occurrence - create new entry
            acc[key] = {
              f_uuid: currentFile.f_uuid,
              f_name: currentFile.f_name,
              created_at: currentFile.created_at,
              language: currentFile.language,
              file_path: currentFile.file_path,
              uploader: currentFile.uploader,
              departments: [currentFile.department],
              publicUrl: currentFile.file_path 
                ? supabase.storage.from("file_storage").getPublicUrl(currentFile.file_path).data.publicUrl
                : null
            };
          } else {
            // File exists - just add the department if not already present
            const existingDepts = acc[key].departments;
            const newDept = currentFile.department;
            
            if (!existingDepts.some(dept => dept.d_name === newDept.d_name)) {
              acc[key].departments.push(newDept);
            }
          }
          
          return acc;
        }, {});

        // Convert the grouped files object to array and sort by date
        const uniqueFiles = Object.values(groupedFiles)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setAllDepartmentFiles(uniqueFiles);
      } catch (error) {
        console.error("Error fetching files:", error.message);
        setError("Failed to fetch files");
      } finally {
        setLoading(false);
      }
    };

    fetchAllFiles();
  }, [user]);

  // ✅ Languages available from current result set (for filter options)
  const languageOptions = useMemo(() => {
    return [...new Set(allDepartmentFiles.map((f) => f.language).filter(Boolean))];
  }, [allDepartmentFiles]);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">All Department Files</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border rounded px-3 py-2"
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
          className="border rounded px-3 py-2"
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
          <p>Loading files...</p>
        ) : allDepartmentFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {allDepartmentFiles.map((file) => (
              <div
                key={file.f_uuid}
                className="bg-white rounded-xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105"
                style={{ minHeight: "180px" }}
              >
                <div className="w-full">
                  <div className="text-xl font-semibold text-gray-800 mb-2">{file.f_name}</div>
                  <div className="text-sm text-gray-500 mb-2">
                    Uploaded by: {file.uploader?.name || "Unknown"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {file.departments.map((dept, index) => (
                    <span
                      key={`${file.f_uuid}-${dept.d_name}`}
                      className="inline-block text-xs bg-blue-100 text-blue-700 rounded px-2 py-1"
                    >
                      {dept.d_name}
                    </span>
                  ))}
                  <span className="inline-block text-xs bg-gray-100 text-gray-700 rounded px-2 py-1">
                    {file.language || "Unknown Language"}
                  </span>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  {file.created_at
                    ? new Date(file.created_at).toLocaleString()
                    : "Unknown"}
                </div>
                <div className="mt-4">
                  <a
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    href={file.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
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
