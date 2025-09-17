import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSummary } from "../../utils/apiUtils";

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const f_uuid = location.state?.f_uuid;
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!f_uuid) {
      setLoading(false);
      return;
    }
    
    // Reset data and ensure loading state when file changes
    setSummaryData(null);
    setError(null);
    setLoading(true);
    
    const fetchSummary = async () => {
      try {
        console.log("Fetching summary for file:", f_uuid);
        
        // Use the API utility function which has fallback to Supabase
        const data = await getSummary(f_uuid);
        
        if (data) {
          console.log("Summary found:", data);
          setSummaryData(data);
        } else {
          console.log("No summary found for this file");
          setSummaryData(null);
        }
      } catch (err) {
        console.error("Exception in fetchSummary:", err);
        setSummaryData(null);
        setError(err.message || "Failed to retrieve summary");
      } finally {
        setLoading(false);
      }
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Document Summary</h1>
      
      {loading ? (
        <div className="bg-white p-6 rounded shadow border border-gray-200 flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
          <p className="text-gray-700 font-medium">Fetching summary, please wait...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment if the summary is being generated</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded shadow border border-red-200 text-red-700">
          <p className="font-medium">Error retrieving summary</p>
          <p className="mt-2 text-sm">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      ) : summaryData ? (
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
        <div className="text-gray-500 bg-white p-6 rounded shadow border border-gray-200">
          <p>No summary found for this file. The summary may still be processing.</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
            onClick={() => {
              setLoading(true);
              setTimeout(() => window.location.reload(), 500);
            }}
          >
            Check Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Summary;