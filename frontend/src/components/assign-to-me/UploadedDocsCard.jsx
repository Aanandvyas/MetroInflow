import React from "react";

const UploadedDocsCard = ({ uploadedDocs, loading }) => {
  if (loading) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg">
        <p className="text-gray-500">Loading documents...</p>
      </div>
    );
  }

  if (!uploadedDocs || uploadedDocs.length === 0) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg">
        <p className="text-gray-500">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Uploaded Documents</h2>
      <ul className="space-y-2">
        {uploadedDocs.map((doc) => (
          <li
            key={doc.id || doc.file_path || doc.created_at} // ✅ unique key
            className="flex items-center justify-between p-2 border rounded-md"
          >
            <span className="text-gray-700 font-medium">{doc.f_name}</span>
            {doc.publicUrl ? (
              <a
                href={doc.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                View
              </a>
            ) : (
              <span className="text-gray-400 text-sm">No file</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UploadedDocsCard;