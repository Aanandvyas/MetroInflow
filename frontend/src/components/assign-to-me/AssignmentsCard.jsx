// Inside src/components/assign-to-me/AssignmentsCard.jsx
import React from "react";
import { DocumentTextIcon, BellIcon } from "@heroicons/react/24/outline";

// ✅ FIX: Provide a default empty array for the assignments prop
const AssignmentsCard = ({ selectedDate, assignments = [], loading }) => {
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
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-sm transition">
              <DocumentTextIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">{doc.title}</p>
                <p className="text-xs text-gray-500">From: {doc.from}</p>
              </div>
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