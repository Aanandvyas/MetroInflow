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
      if (!user) {
        setLoading(false);
        return;
      }
      
      // ✅ FIX: Corrected select query to match your schema
      const { data, error } = await supabase
        .from("file")
        .select(`
          u_id,
          name,
          language
        `)
        .eq('f_uuid', users.id) // Assuming 'f_uuid' also identifies the uploader
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching documents:", error.message);
      } else {
        // NOTE: Your schema doesn't show a 'file_path'. If you need public URLs,
        // you must add a 'file_path' column to your 'file' table.
        setDocs(data);
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