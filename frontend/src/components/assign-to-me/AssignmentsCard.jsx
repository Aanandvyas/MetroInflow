// Inside src/components/assign-to-me/AssignmentsCard.jsx
import React, { useEffect, useState } from "react";
import { DocumentTextIcon, BellIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

// ✅ FIX: Provide a default empty array for the assignments prop
const AssignmentsCard = ({ selectedDate, assignments = [], loading }) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl shadow-md border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <BellIcon className="h-5 w-5 text-blue-500" />
        Assignments for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </h2>
      <div className="space-y-3 max-h-[20rem] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-center py-8 text-gray-400 text-sm">Loading assignments...</p>
        ) : assignments.length > 0 ? (
          assignments.map((doc, idx) => (
            <div key={doc.f_uuid ?? idx} className="relative flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-sm transition">
              <DocumentTextIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate" title={doc.title}>{doc.title}</p>
                <p className="text-xs text-gray-500">From: {doc.from}</p>
              </div>

              {/* Kebab menu */}
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={openMenuId === (doc.f_uuid ?? idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === (doc.f_uuid ?? idx) ? null : (doc.f_uuid ?? idx));
                }}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                title="More actions"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>

              {openMenuId === (doc.f_uuid ?? idx) && (
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-10 z-20 w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1"
                >
                  <Link
                    to="/summary"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpenMenuId(null)}
                  >
                    Summary
                  </Link>
                  <Link
                    to="/archive"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpenMenuId(null)}
                  >
                    Archive
                  </Link>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">No assignments for this date.</div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsCard;