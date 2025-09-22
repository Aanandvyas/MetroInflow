import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import {
  ArrowUpTrayIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const DocumentUpload = () => {
  // Replace single file with an array
  const [files, setFiles] = useState([]); // was: const [file, setFile] = useState(null);

  // Rest of the state declarations remain same
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ message: "", type: "" });

  // Form state
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");

  // UI state
  const [isDragging, setIsDragging] = useState(false);

  // User profile state
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from("users")
        .select(`
          uuid,
          d_uuid,
          department(d_name, d_uuid)
        `)
        .eq("uuid", user.id)
        .single();
        
      if (error) {
        setStatus({ message: "Could not load user profile.", type: "error" });
      } else {
        setUserProfile(data);
      }
      setLoadingProfile(false);
    };
    
    fetchUserProfile();
  }, [user]);

  // Helper to merge new files and avoid duplicates (by name+size+lastModified)
  const mergeFiles = (current, incoming) => {
    const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
    const map = new Map(current.map((f) => [key(f), f]));
    incoming.forEach((f) => map.set(key(f), f));
    return Array.from(map.values());
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    setFiles((prev) => mergeFiles(prev, list));
    setStatus({ message: "", type: "" });
    // reset input so the same file can be picked again if needed
    e.target.value = "";
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
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length > 0) {
      setFiles((prev) => mergeFiles(prev, list));
      setStatus({ message: "", type: "" });
      e.dataTransfer.clearData();
    }
  };

  const removeFileAt = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setStatus({ message: "You must be logged in to upload.", type: "error" });
      return;
    }
    if (files.length === 0 || !language || !userProfile?.d_uuid) {
      setStatus({
        message: "Please choose file(s), language and ensure you're assigned to a department.",
        type: "error",
      });
      return;
    }

    setUploading(true);
    setStatus({ message: "Uploading document(s)...", type: "loading" });

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("uuid")
        .eq("uuid", user.id)
        .single();
      if (userError || !userData) {
        throw new Error(userError?.message || "Could not find user profile.");
      }

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fileName = `${Date.now()}_${i}_${f.name}`;
        const filePath = `shared/${fileName}`;

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from("file_storage")
          .upload(filePath, f, {
            upsert: false,
            contentType: f.type || undefined,
          });
        if (uploadError) throw uploadError;

        // 2. Insert into file table
        const displayName =
          files.length === 1 && title.trim().length > 0 ? title.trim() : f.name;

        const { data: insertedFile, error: insertFileError } = await supabase
          .from("file")
          .insert({
            f_name: displayName,
            language,
            uuid: userData.uuid,
            file_path: filePath,
            created_at: new Date().toISOString(),
          })
          .select("f_uuid")
          .single();
        if (insertFileError) throw insertFileError;

        // 3. Link to user's department with auto-approval for internal files
        const { error: joinError } = await supabase
          .from("file_department")
          .insert({
            f_uuid: insertedFile.f_uuid,
            d_uuid: userProfile.d_uuid,
            is_approved: "approved", // Auto-approve files within same department
            created_at: new Date().toISOString(),
          });
        if (joinError) throw joinError;

        // 4. Notify users in the same department
        const { data: usersInDepartment, error: usersError } = await supabase
          .from("users")
          .select("uuid")
          .eq("d_uuid", userProfile.d_uuid);

        if (usersError) {
          console.error("Error fetching users for department:", usersError);
        }
        if (usersInDepartment && usersInDepartment.length > 0) {
          const notificationRows = usersInDepartment.map(u => ({
            uuid: u.uuid,
            f_uuid: insertedFile.f_uuid,
            is_seen: false,
            created_at: new Date().toISOString(),
          }));
          await supabase.from("notifications").insert(notificationRows);
        }

        // 5. Send file + f_uuid to backend
        try {
          const formData = new FormData();
          formData.append("f_uuid", insertedFile.f_uuid);
          formData.append("files", f, f.name);

          const response = await fetch(
            process.env.SUMMARY_BACKEND_URL || "http://localhost:8080/v1/documents",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            console.error("Backend summary request failed.");
          } else {
            const summaryData = await response.json();
          }
        } catch (backendErr) {
          console.error("Error sending file to summary backend:", backendErr);
        }
      }

      setStatus({
        message: "Upload successful! Redirecting...",
        type: "success",
      });
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      setStatus({ message: `Upload failed: ${error.message}`, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  // Display user's department
  const renderDepartmentInfo = () => (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Target Department
      </label>
      
      {loadingProfile ? (
        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
          <p className="text-gray-500">Loading department...</p>
        </div>
      ) : userProfile?.department ? (
        <div className="p-3 border border-gray-300 rounded-lg bg-blue-50">
          <p className="text-blue-700 font-medium">{userProfile.department.d_name}</p>
          <p className="text-xs text-blue-600 mt-1">Files will be uploaded to your department</p>
        </div>
      ) : (
        <div className="p-3 border border-red-300 rounded-lg bg-red-50">
          <p className="text-red-700">No department assigned to your account</p>
          <p className="text-xs text-red-600 mt-1">Contact administrator to assign a department</p>
        </div>
      )}
    </div>
  );

  const isMultiFile = files.length > 1;

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
            Document File(s)
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
            <div className="space-y-3 w-full max-w-xl">
              {/* Hidden input used by both "Click to upload" and the + button */}
              <input
                id="hidden-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {files.length === 0 ? (
                <div className="text-center">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex justify-center text-sm text-gray-600">
                    <label
                      htmlFor="hidden-file-input"
                      className="cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Click to upload</span>
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOCX, PNG, etc.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-700">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </div>
                    {/* Plus button to add more files */}
                    <button
                      type="button"
                      onClick={() => document.getElementById("hidden-file-input")?.click()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="Add more files"
                    >
                      +
                      <span className="sr-only">Add file</span>
                    </button>
                  </div>

                  {/* Selected files list with delete (cross) buttons */}
                  <ul className="mt-2 space-y-2 max-h-40 overflow-auto">
                    {files.map((f, idx) => (
                      <li
                        key={`${f.name}-${f.size}-${f.lastModified}-${idx}`}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-800" title={f.name}>
                            {f.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(f.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFileAt(idx)}
                          className="ml-3 rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                          title="Remove file"
                          aria-label={`Remove ${f.name}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Document Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isMultiFile}
              className={`mt-1 w-full p-3 border border-gray-300 rounded-lg ${
                isMultiFile ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              placeholder={
                isMultiFile
                  ? "Using each file name as the document title"
                  : "Optional: enter a title (default is filename)"
              }
            />
            {isMultiFile && (
              <p className="mt-1 text-xs text-gray-500">
                Multiple files selected — each document will use its filename as the title.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="" disabled>Select a language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Malayalam">Malayalam</option>
            </select>
          </div>
          {/* Replace department select with new component */}
          {renderDepartmentInfo()}
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
            disabled={uploading || loadingProfile}
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