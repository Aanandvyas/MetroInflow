import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient.";

// Import the new smaller components
import CalendarCard from "../assign-to-me/CalenderCard";
import AssignmentsCard from "../assign-to-me/AssignmentCard";
import UploadedDocsCard from "../assign-to-me/UploadedDocsCard";

const formatDateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const AssignToMe = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all user-related documents once
  useEffect(() => {
    const fetchUserDocuments = async () => {
      if (!user) {
        setAllDocs([]);
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from("file")
        .select("f_name, language, file_path, created_at, f_uuid, d_uuid, department:d_uuid(d_name)")
        .eq("f_uuid", user.id);

      if (error) {
        console.error("Error fetching documents:", error);
        setAllDocs([]);
      } else {
        const filesWithUrls = data.map((file) => ({
          ...file,
          publicUrl: file.file_path
            ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
            : null, // fallback if file_path missing
        }));
        setAllDocs(filesWithUrls);
      }
      setLoading(false);
    };
    fetchUserDocuments();
  }, [user]);

  // Process the fetched documents to be used by child components
  const docsByDate = useMemo(() => {
    const mappedDocs = {};
    allDocs.forEach((doc) => {
      const dateKey = formatDateKey(new Date(doc.created_at));
      if (!mappedDocs[dateKey]) {
        mappedDocs[dateKey] = [];
      }
      mappedDocs[dateKey].push({
        title: doc.f_name,
        from: doc.department?.d_name || "Unassigned",
      });
    });
    return mappedDocs;
  }, [allDocs]);

  const docsForSelectedDate = docsByDate[formatDateKey(selectedDate)] || [];

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <CalendarCard
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          docsByDate={docsByDate}
        />
        <AssignmentsCard
          selectedDate={selectedDate}
          assignments={docsForSelectedDate}
          loading={loading}
        />
      </div>
      <UploadedDocsCard uploadedDocs={allDocs} loading={loading} />
    </div>
  );
};

export default AssignToMe;