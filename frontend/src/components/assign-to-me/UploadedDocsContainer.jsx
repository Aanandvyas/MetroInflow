import React, { useState, useEffect } from "react";
import { useAuth } from "../../components/context/AuthContext";
import { supabase } from "../../supabaseClient";
import UploadedDocsCard from "./UploadedDocsCard";

const UploadedDocsContainer = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's department
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("d_uuid, department(d_name)")
          .eq("uuid", user.id)
          .single();
        if (userError) throw userError;
        if (!userData?.d_uuid) {
          setError("Your profile has no department.");
          setLoading(false);
          return;
        }

        setDepartmentName(userData.department?.d_name ?? "");

        // Fetch files linked to that department via join table
        const { data: filesData, error: filesError } = await supabase
          .from("file")
          .select(`
            f_uuid, f_name, language, file_path, created_at, uuid,
            uploader:uuid(name),
            file_department!inner (
              d_uuid,
              department:d_uuid ( d_uuid, d_name )
            )
          `)
          .eq("file_department.d_uuid", userData.d_uuid)
          .order("created_at", { ascending: false });

        if (filesError) throw filesError;

        const filesWithUrls =
          filesData?.map((f) => ({
            ...f,
            departments: (f.file_department || [])
              .map((fd) => fd.department)
              .filter(Boolean),
            publicUrl: f.file_path
              ? supabase.storage.from("file_storage").getPublicUrl(f.file_path).data.publicUrl
              : null,
          })) ?? [];

        setDocs(filesWithUrls);
        setError("");
      } catch (err) {
        setError(err.message || "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [user]);

  return (
    <div className="space-y-3">
      <UploadedDocsCard
        uploadedDocs={docs}
        loading={loading}
        error={error}
        departmentName={departmentName}
      />
    </div>
  );
};

export default UploadedDocsContainer;