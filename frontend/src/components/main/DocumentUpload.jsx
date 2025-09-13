import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import {
  ArrowUpTrayIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const DocumentUpload = () => {
  // Replace single departmentId with array
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  // Add new state for department search/filter
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Rest of the state declarations remain same
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  // Form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // UI state
  const [isDragging, setIsDragging] = useState(false);

  // Data from DB
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from("department")
        .select("d_uuid, d_name");
      if (error) {
        setStatus({ message: "Could not load departments.", type: "error" });
      } else {
        setDepartments(data);
      }
      setLoadingDepartments(false);
    };
    fetchDepartments();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus({ message: "", type: "" });
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStatus({ message: "", type: "" });
      e.dataTransfer.clearData();
    }
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(dept => 
    dept.d_name.toLowerCase().includes(departmentSearch.toLowerCase()) &&
    !selectedDepartments.find(selected => selected.d_uuid === dept.d_uuid)
  );

  // Handle department selection
  const addDepartment = (dept) => {
    setSelectedDepartments(prev => [...prev, dept]);
    setDepartmentSearch('');
  };

  // Handle department removal
  const removeDepartment = (deptId) => {
    setSelectedDepartments(prev => 
      prev.filter(dept => dept.d_uuid !== deptId)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setStatus({ message: "You must be logged in to upload.", type: "error" });
      return;
    }
    if (!file || !title || selectedDepartments.length === 0 || !language) {
      setStatus({
        message: "Please fill out all required fields.",
        type: "error",
      });
      return;
    }

    setUploading(true);
    setStatus({ message: "Uploading document...", type: "loading" });

    try {
      // Step 1: Fetch the user's profile from the 'users' table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("uuid")
        .eq("uuid", user.id)
        .single();

      if (userError || !userData) {
        throw new Error(userError?.message || "Could not find user profile.");
      }

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `shared/${fileName}`; // Store in shared folder since multiple departments

      // Step 2: Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("file_storage")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Insert file entries for each department
      const fileEntries = selectedDepartments.map(dept => ({
        f_name: title,
        language,
        d_uuid: dept.d_uuid,
        uuid: userData.uuid,
        file_path: filePath,
        created_at: new Date().toISOString(),
      }));

      // Step 3: Insert metadata into the 'file' table
      const { error: insertError } = await supabase
        .from("file")
        .insert(fileEntries);

      if (insertError) throw insertError;

      setStatus({
        message: "Document uploaded successfully! Redirecting...",
        type: "success",
      });
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      setStatus({ message: `Upload failed: ${error.message}`, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  // Replace the department select with this new UI
  const renderDepartmentSelect = () => (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assign to Departments
      </label>
      
      {/* Selected departments */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedDepartments.map(dept => (
          <span 
            key={dept.d_uuid}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
          >
            {dept.d_name}
            <button
              type="button"
              onClick={() => removeDepartment(dept.d_uuid)}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Department search input */}
      <div className="relative">
        <input
          type="text"
          value={departmentSearch}
          onChange={(e) => setDepartmentSearch(e.target.value)}
          placeholder="Search departments..."
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
        
        {/* Dropdown for filtered departments */}
        {departmentSearch && filteredDepartments.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredDepartments.map(dept => (
              <button
                key={dept.d_uuid}
                type="button"
                onClick={() => addDepartment(dept)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
              >
                {dept.d_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Upload New Document
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md space-y-6 border border-gray-200"
      >
        {/* File Input Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document File
          </label>
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-md transition-colors ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
          >
            <div className="space-y-2 text-center">
              {file ? (
                <>
                  <DocumentCheckIcon className="mx-auto h-12 w-12 text-green-500" />
                  <p className="font-semibold text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Click to upload</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, PNG, etc.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Document Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700"
            >
              Language
            </label>
            <input
              type="text"
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., English"
            />
          </div>
          {/* Replace department select with new component */}
          {renderDepartmentSelect()}
        </div>

        {/* Status and Submit */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex-1 pr-4">
            {status.message && (
              <p
                className={`text-sm text-left p-3 rounded-lg ${
                  status.type === "success"
                    ? "bg-green-100 text-green-700"
                    : status.type === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={uploading || loadingDepartments}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {uploading ? "Uploading..." : "Upload & Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUpload;