import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Calendar } from "../ui/Calender"; 
import { DocumentTextIcon, BellIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../supabaseClient."; // <-- update path as per your project

// Mock assigned documents
const mockDocuments = {
  "2025-09-04": [{ title: "Q2 Financial Report Review", from: "Finance Dept.", status: "seen" }],
  "2025-09-08": [{ title: "Engineering Blueprints v3", from: "Engineering Dept.", status: "today" }],
  "2025-09-15": [{ title: "New Remote Work Policy", from: "HR Department", status: "overdue" }],
  "2025-09-23": [{ title: "Vendor Contract #V-291", from: "Legal Department", status: "seen" }],
};

const statusColors = {
  seen: "bg-green-500",
  today: "bg-yellow-500",
  overdue: "bg-red-500",
};

const AssignToMe = ({ userId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedKey = formatDateKey(selectedDate);
  const assignedDocs = mockDocuments[selectedKey] || [];

  // 🔹 Fetch user’s uploaded docs from Supabase
  useEffect(() => {
    const fetchDocs = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("file") // table name in Supabase
        .select("*")
        .eq("user_uuid", userId);

      if (!error) {
        setUploadedDocs(data);
      }
    };
    fetchDocs();
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Top Section: Calendar + Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar Side */}
        <Card>
          <CardHeader>
            <CardTitle>My Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              defaultMonth={new Date()}
              className="rounded-md border"
              // Custom day render
              components={{
                DayContent: ({ date }) => {
                  const docs = mockDocuments[formatDateKey(date)];
                  return (
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-xs ${
                          date.toDateString() === new Date().toDateString()
                            ? "font-bold text-blue-600"
                            : "text-gray-700"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex gap-0.5 mt-0.5">
                        {docs?.map((doc, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${statusColors[doc.status]}`}
                          ></span>
                        ))}
                      </div>
                    </div>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Notifications / Assigned Docs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-blue-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedDocs.length > 0 ? (
              <div className="space-y-3">
                {assignedDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <DocumentTextIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">{doc.title}</p>
                      <p className="text-sm text-gray-600">From: {doc.from}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No documents assigned on this date.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle>My Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedDocs.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {uploadedDocs.map((file) => (
                <li key={file.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{file.file_name}</p>
                    <p className="text-xs text-gray-500">{file.file_path}</p>
                  </div>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignToMe;
