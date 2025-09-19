import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Important() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Renamed state
  const [importants, setImportants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impBusy, setImpBusy] = useState({});
  const [summaryLoading, setSummaryLoading] = useState({});

  const fetchImportants = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        fav_uuid,
        created_at,
        file:f_uuid(
          f_uuid,
          f_name,
          language,
          created_at,
          file_department(
            d_uuid,
            department:d_uuid ( d_uuid, d_name )
          )
        )
      `)
      .eq("uuid", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching important files:", error);
      setImportants([]);
    } else {
      const normalized = (data || [])
        .filter((row) => row.file)
        .map((row) => ({
          ...row,
          file: {
            ...row.file,
            departments: (row.file.file_department || [])
              .map((fd) => fd?.department)
              .filter(Boolean),
            is_favorite: true, // still using favorites table
          },
        }));
      setImportants(normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImportants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Renamed action
  const toggleImportant = async (file) => {
    if (!user?.id) return;
    const id = file.f_uuid;

    // optimistic remove on unmark
    setImportants((prev) => prev.filter((f) => f.file?.f_uuid !== id));
    setImpBusy((s) => ({ ...s, [id]: true }));
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("uuid", user.id)
        .eq("f_uuid", id);
      if (error) throw error;
    } catch (e) {
      console.error("Unmark Important failed:", e);
      // revert on failure
      setImportants((prev) => [{ file, fav_uuid: `tmp-${id}` }, ...prev]);
    } finally {
      setImpBusy((s) => ({ ...s, [id]: false }));
    }
  };
  
  // Handle clicking on summary to show loading state and navigate
  const handleSummaryClick = (fileId) => {
    if (summaryLoading[fileId]) return; // Prevent multiple clicks
    
    // Set loading state for this specific file
    setSummaryLoading(prev => ({ ...prev, [fileId]: true }));
    
    // Short timeout to show loading state before navigation
    setTimeout(() => {
      // Navigate to summary page with file UUID in state
      navigate('/summary', { state: { f_uuid: fileId } });
      
      // Reset the loading state after a delay (for when user comes back)
      setTimeout(() => {
        setSummaryLoading(prev => ({ ...prev, [fileId]: false }));
      }, 1000);
    }, 300); // Short delay to show loading animation
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Important</h1>

      {loading ? (
        <p className="text-gray-600">Loading important files...</p>
      ) : importants.length === 0 ? (
        <p className="text-gray-500">No important files yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch auto-rows-[minmax(260px,_1fr)]">
          {importants.map((fav) => {
            const file = fav.file;
            return (
              <div
                key={fav.fav_uuid}
                className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col h-full transition-transform hover:scale-105"
              >
                <div className="flex-1 w-full">
                  <div className="text-xl font-semibold text-gray-800">
                    {file.f_name}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-medium text-gray-600">Departments:</span>
                      {file.departments && file.departments.length > 0 ? (
                        file.departments.map((dept) => (
                          <span
                            key={`${file.f_uuid}-${dept.d_uuid}`}
                            className="inline-block text-xs bg-blue-100 text-blue-800 rounded px-2 py-0.5"
                          >
                            {dept.d_name}
                          </span>
                        ))
                      ) : (
                        <span className="inline-block text-xs bg-yellow-100 text-yellow-800 rounded px-2 py-0.5">
                          No Department
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-medium text-gray-600">Language:</span>
                      <span className="inline-block text-xs bg-violet-100 text-violet-800 rounded px-2 py-0.5">
                        {file.language || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {file.created_at ? new Date(file.created_at).toLocaleString() : "Unknown"}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center justify-center h-9 px-4 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSummaryClick(file.f_uuid)}
                      className={`inline-flex items-center justify-center h-9 px-4 ${
                        summaryLoading[file.f_uuid] 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gray-600 hover:bg-gray-700'
                      } text-white rounded-md text-sm font-medium transition-colors`}
                      disabled={summaryLoading[file.f_uuid]}
                    >
                      {summaryLoading[file.f_uuid] ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading
                        </>
                      ) : (
                        'Summary'
                      )}
                    </button>

                    <button
                      type="button"
                      className={`inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium ${
                        file.is_favorite ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-500 hover:bg-purple-600"
                      } text-white ${impBusy[file.f_uuid] ? "opacity-60 cursor-not-allowed" : ""}`}
                      onClick={() => toggleImportant(file)}
                      disabled={!!impBusy[file.f_uuid]}
                      title={file.is_favorite ? "Unmark as Important" : "Mark as Important"}
                      aria-label={file.is_favorite ? "Unmark as Important" : "Mark as Important"}
                    >
                      {file.is_favorite ? "Unmark Important" : "Mark Important"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}