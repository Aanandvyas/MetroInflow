import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const f_uuid = location.state?.f_uuid;
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Reset the flag when f_uuid changes
    hasFetchedRef.current = false;
  }, [f_uuid]);

  useEffect(() => {
    if (!f_uuid || hasFetchedRef.current) {
      setLoading(false);
      return;
    }

    hasFetchedRef.current = true;

    const fetchSummary = async () => {
  setLoading(true);

  // Atomic upsert - creates if not exists, ignores if exists
  const { error: upsertError } = await supabase
    .from("summary")
    .upsert(
      {
        f_uuid: f_uuid,
        summary: "",
        status: false,
        state: "pending",
        ocr_confidence: 0,
        extracted_text_length: 0,
        extraction_time_ms: 0,
        summarization_time_ms: 0,
        total_time_ms: 0,
        error_message: "",
        retry_count: 0,
      },
      {
        onConflict: "f_uuid",
        ignoreDuplicates: true,
      }
    );
    // ❌ No .select() here

  if (upsertError) {
    console.error("Summary upsert failed:", upsertError);
    setSummaryData(null);
    setLoading(false);
    return;
  }

  // Always re-fetch after upsert to get the actual row
  const { data, error: fetchError } = await supabase
    .from("summary")
    .select("*")
    .eq("f_uuid", f_uuid)
    .maybeSingle();

  if (fetchError) {
    console.error("Summary fetch failed:", fetchError);
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
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700">
              Status: <span className={summaryData.status ? "text-green-600" : "text-yellow-600"}>
                {summaryData.status ? "Completed" : "Pending"}
              </span>
            </p>
            {summaryData.state && (
              <p className="text-sm text-gray-600">State: {summaryData.state}</p>
            )}
          </div>

          <p className="mb-2">
            <strong>Summary:</strong>
          </p>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {summaryData.summary || "Summary is being generated..."}
          </pre>

          {summaryData.error_message && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {summaryData.error_message}
              </p>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Created: {new Date(summaryData.created_at).toLocaleString()}</p>
            {summaryData.updated_at && (
              <p>Updated: {new Date(summaryData.updated_at).toLocaleString()}</p>
            )}
            {summaryData.ocr_confidence !== null && (
              <p>OCR Confidence: {(summaryData.ocr_confidence * 100).toFixed(2)}%</p>
            )}
            {summaryData.extraction_time_ms > 0 && (
              <p>Extraction Time: {summaryData.extraction_time_ms}ms</p>
            )}
            {summaryData.summarization_time_ms > 0 && (
              <p>Summarization Time: {summaryData.summarization_time_ms}ms</p>
            )}
            {summaryData.total_time_ms > 0 && (
              <p>Total Time: {summaryData.total_time_ms}ms</p>
            )}
            {summaryData.retry_count > 0 && (
              <p>Retry Count: {summaryData.retry_count}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500">Failed to create summary entry for this file.</div>
      )}
    </div>
  );
};

export default Summary;