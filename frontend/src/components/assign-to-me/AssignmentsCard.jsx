// Inside src/components/assign-to-me/AssignmentsCard.jsx
import React, { useState, useRef } from "react";
import { DocumentTextIcon, BellIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import KebabMenu from "./common/KebabMenu";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";

const AssignmentsCard = ({ selectedDate, assignments = [], loading }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const itemBtnRefs = useRef(new Map());
  const { user } = useAuth();
  const [impBusy, setImpBusy] = useState({}); // busy map

  const setAnchorRef = (id) => (el) => {
    const map = itemBtnRefs.current;
    if (el) map.set(id, el);
    else map.delete(id);
  };

  // Mark Important (favorites)
  const markImportant = async (f_uuid) => {
    if (!user?.id || !f_uuid || impBusy[f_uuid]) return;
    setImpBusy((s) => ({ ...s, [f_uuid]: true }));
    try {
      // upsert so repeated clicks are safe (requires unique constraint on uuid,f_uuid)
      const { error } = await supabase
        .from("favorites")
        .upsert({ uuid: user.id, f_uuid }, { onConflict: "uuid,f_uuid" });
      if (error) throw error;
    } catch (e) {
      console.error("Mark Important failed:", e);
      alert("Could not mark Important. Please try again.");
    } finally {
      setImpBusy((s) => ({ ...s, [f_uuid]: false }));
      setOpenMenuId(null);
    }
  };

  return (
    <div className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl shadow-md border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <BellIcon className="h-5 w-5 text-blue-500" />
        Assignments for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </h2>

      <div className="space-y-3 max-h-[20rem] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-center py-8 text-gray-400 text-sm">Loading assignments...</p>
        ) : assignments.length > 0 ? (
          assignments.map((doc, idx) => {
            const id = doc.f_uuid ?? idx;
            const anchorEl = itemBtnRefs.current.get(id);
            return (
              <div
                key={id}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-sm transition"
              >
                <DocumentTextIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate" title={doc.title}>
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-500">From: {doc.from}</p>
                </div>

                <button
                  ref={setAnchorRef(id)}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((prev) => (prev === id ? null : id));
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  title="More actions"
                >
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>

                <KebabMenu
                  open={openMenuId === id}
                  anchorEl={anchorEl}
                  onClose={() => setOpenMenuId(null)}
                >
                  <Link
                    to="/summary"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setOpenMenuId(null)}
                  >
                    Summary
                  </Link>

                  {/* Mark Important */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => markImportant(doc.f_uuid)}
                    disabled={!doc.f_uuid || !!impBusy[doc.f_uuid]}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      impBusy[doc.f_uuid]
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Mark Important
                  </button>
                </KebabMenu>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">No assignments for this date.</div>
        )}
      </div>
    </div>
  );
};

export default AssignmentsCard;