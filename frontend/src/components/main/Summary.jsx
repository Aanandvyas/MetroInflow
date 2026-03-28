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

    // Real-time subscription for automatic updates
    const subscription = supabase
      .channel("summary-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "summary",
          filter: `f_uuid=eq.${f_uuid}`,
        },
        (payload) => {
          setSummaryData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [f_uuid]);

  if (!f_uuid)
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          ← Back
        </button>
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600 text-lg">No file selected for summary.</p>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Loading summary...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="max-w-3xl mx-auto mt-10 bg-white rounded-2xl shadow-lg p-8">
        {summaryData ? (
          <>
            {/* Header with title and status badge */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">Document Summary</h1>
                {summaryData.state && (
                  <p className="text-sm text-gray-500 mt-1">State: {summaryData.state}</p>
                )}
              </div>
              <div className="ml-4">
                {summaryData.status ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    ✅ Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold animate-pulse">
                    ⏳ Pending
                  </span>
                )}
              </div>
            </div>

            {/* Error box */}
            {summaryData.error_message && summaryData.error_message.trim() !== "" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                <span className="text-red-600 text-xl">⚠️</span>
                <div>
                  <p className="text-red-800 font-semibold">Error</p>
                  <p className="text-red-700 text-sm">{summaryData.error_message}</p>
                </div>
              </div>
            )}

            {/* Summary section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
              {!summaryData.summary || summaryData.summary.trim() === "" || !summaryData.status ? (
                <div className="bg-gray-50 rounded-xl p-6 animate-pulse">
                  <p className="text-gray-400 italic">Generating summary, please wait...</p>
                  <div className="mt-3 h-4 bg-gray-200 rounded w-full"></div>
                  <div className="mt-2 h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {summaryData.summary}
                </div>
              )}
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
              {summaryData.created_at && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Created</p>
                  <p className="text-sm text-gray-700">
                    {new Date(summaryData.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {summaryData.updated_at && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Updated</p>
                  <p className="text-sm text-gray-700">
                    {new Date(summaryData.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {summaryData.ocr_confidence > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">OCR Confidence</p>
                  <p className="text-sm text-gray-700">
                    {(summaryData.ocr_confidence * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {summaryData.extraction_time_ms > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Extraction Time</p>
                  <p className="text-sm text-gray-700">{summaryData.extraction_time_ms}ms</p>
                </div>
              )}
              {summaryData.summarization_time_ms > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Summarization</p>
                  <p className="text-sm text-gray-700">{summaryData.summarization_time_ms}ms</p>
                </div>
              )}
              {summaryData.total_time_ms > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Total Time</p>
                  <p className="text-sm text-gray-700">{summaryData.total_time_ms}ms</p>
                </div>
              )}
              {summaryData.retry_count > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Retry Count</p>
                  <p className="text-sm text-gray-700">{summaryData.retry_count}</p>
                </div>
              )}
              {summaryData.extracted_text_length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Text Length</p>
                  <p className="text-sm text-gray-700">{summaryData.extracted_text_length}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Failed to create summary entry for this file.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;