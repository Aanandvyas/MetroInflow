import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const HARDCODED_FUUID = "81073771-447f-4266-b2c7-a90e91f6b417";

const Summary = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("summary")
        .select("*")
        .eq("f_uuid", HARDCODED_FUUID)
        .maybeSingle();
      if (error || !data) {
        setSummaryData(null);
      } else {
        setSummaryData(data);
      }
      setLoading(false);
    };
    fetchSummary();
  }, []);

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