import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSupabase } from "../../supabaseClient";
const supabase = getSupabase();

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const f_uuid = location.state?.f_uuid;
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (!f_uuid) {
      setLoading(false);
      return;
    }
    const fetchSummary = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("summary")
        .select("f_uuid, summary, created_at")
        .eq("f_uuid", f_uuid)
        .maybeSingle();

      if (error || !data) {
        setSummaryData(null);
      } else {
        setSummaryData(data);
      }
      setLoading(false);
    };
    fetchSummary();
  }, [f_uuid]);

  if (!f_uuid)
    return (
      <div className="p-8 text-red-500">
        No file selected for summary.{" "}
        <button
          className="underline text-blue-600"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Document Summary</h1>
      {summaryData ? (
        <div className="bg-white p-6 rounded shadow border border-gray-200">
          <p className="mb-2">
            <strong>Summary:</strong>
          </p>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {summaryData.summary}
          </pre>
          <p className="mt-4 text-xs text-gray-500">
            Created at: {new Date(summaryData.created_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="text-gray-500">No summary found for this file.</div>
      )}
    </div>
  );
};

export default Summary;