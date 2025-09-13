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
        // First get user's department
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("d_uuid, department(d_name)")
          .eq("uuid", user.id)
          .single();

        if (userError) throw userError;

        if (!userData?.d_uuid) {
          setError("No department assigned");
          return;
        }

        setDepartmentName(userData.department.d_name);

        // Then fetch files for that department
        const { data: filesData, error: filesError } = await supabase
          .from("file")
          .select(`
            *,
            department:d_uuid(d_name),
            uploader:uuid(name)
          `)
          .eq("d_uuid", userData.d_uuid)
          .order("created_at", { ascending: false });

        if (filesError) throw filesError;

        const filesWithUrls = filesData?.map((file) => ({
          ...file,
          publicUrl: file.file_path
            ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
            : null,
        })) || [];

        setDocs(filesWithUrls);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load documents");
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