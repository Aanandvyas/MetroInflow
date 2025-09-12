
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.";
import UploadedDocsCard from "./UploadedDocsCard";
import { useAuth } from "../context/AuthContext";

const UploadedDocsContainer = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user || !user.d_uuid) {
        setLoading(false);
        return;
      }
      // Fetch all files for the user's department
      const { data, error } = await supabase
        .from("file")
        .select(`f_uuid, f_name, file_path, language, d_uuid`)
        .eq('d_uuid', user.d_uuid)
        .order("f_name", { ascending: true });

      if (error) {
        console.error("Error fetching documents:", error.message);
      } else {
        // Generate publicUrl for each file (works for public buckets)
        const filesWithUrls = (data || []).map((file) => ({
          ...file,
          publicUrl: file.file_path
            ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
            : null,
        }));
        setDocs(filesWithUrls);
      }
      setLoading(false);
    };
    fetchDocs();
  }, [user]);

  if (loading) { /* ... */ }
  if (docs.length === 0) { /* ... */ }

  return (
    <div className="space-y-3">
        {/* ✅ FIX: Pass the entire list of docs to a single card component */}
      <UploadedDocsCard uploadedDocs={docs} loading={loading} />
    </div>
  );
};

export default UploadedDocsContainer;