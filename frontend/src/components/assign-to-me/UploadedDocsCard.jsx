import React from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const UploadedDocsCard = ({ uploadedDocs, loading }) => {
  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">My Uploaded Documents</h2>
      <div className="max-h-80 overflow-y-auto pr-2">
        {loading ? (
          <p className="text-gray-500 text-sm py-6">Loading your documents...</p>
        ) : uploadedDocs.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {uploadedDocs.map((file) => (
              <li key={file.u_id} className="py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                  <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                </div>
                {file.publicUrl && (
                  <a href={file.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">
                    View
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm text-center py-6">You haven't uploaded any documents yet.</p>
        )}
      </div>
    </div>
  );
};

export default UploadedDocsCard;