import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import { useFilter } from "../context/FilterContext";
import FileCard from "./FileCard";

const AllFiles = () => {
  const { user } = useAuth();
  const { searchTerm, showFilters, setShowFilters } = useFilter();
  const [allDepartmentFiles, setAllDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load all files (joined with uploader info + department if needed)
  useEffect(() => {
    const fetchDepartmentFiles = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("file")
        .select("*") 
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading files:", error.message);
        setAllDepartmentFiles([]);
      } else {
        setAllDepartmentFiles(data || []);
      }

      setLoading(false);
    };

    fetchDepartmentFiles();
  }, [user]);

  // ✅ Search filter
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return allDepartmentFiles;
    return allDepartmentFiles.filter((file) =>
      file.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allDepartmentFiles, searchTerm]);

  // ✅ Group files by created_at date
  const groupedFiles = useMemo(() => {
    const groups = {};
    filteredFiles.forEach((file) => {
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
  }, [filteredFiles]);

  return (
    <div className="p-8 bg-gray-50/50 min-h-full">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        All Department Files
      </h1>

      {/* Right side filter drawer */}
      {showFilters && (
        <div className="fixed inset-y-0 right-0 bg-white w-80 shadow-lg p-6 z-20">
          <h2 className="text-lg font-semibold">Filters</h2>
          <p className="text-sm text-gray-500 mt-4">
            Filter options would go here.
          </p>
          <button
            onClick={() => setShowFilters(false)}
            className="mt-6 text-blue-600"
          >
            Close
          </button>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p>Loading files...</p>
        ) : Object.keys(groupedFiles).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedFiles).map(([date, files]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-600 mb-4">
                  {date}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {files.map((file) => (
                    <FileCard key={file.f_uuid} file={file} />
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
