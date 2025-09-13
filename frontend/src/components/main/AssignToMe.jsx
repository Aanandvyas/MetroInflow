import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import CalendarCard from "../assign-to-me/CalendarCard";
import AssignmentsCard from "../assign-to-me/AssignmentsCard";
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const AssignToMe = () => {
  const { user, dUuid } = useAuth(); // Get user's department UUID from context

  const [recentFiles, setRecentFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRecentFiles = async () => {
      setFilesLoading(true);
      let query = supabase
        .from('file')
        .select(`
          f_uuid,
          f_name,
          language,
          department:d_uuid(
            d_name
          )
        `)
        .order('f_uuid', { ascending: true })
        .limit(20);

      if (selectedDepartment) {
        query = query.eq('d_uuid', selectedDepartment);
      }
      if (selectedLanguage) {
        query = query.eq('language', selectedLanguage);
      }
      if (searchTerm) {
        query = query.ilike('f_name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching recent files:', error);
        setRecentFiles([]);
      } else {
        setRecentFiles(data || []);
      }
      setFilesLoading(false);
    };
    fetchRecentFiles();
  }, [selectedDepartment, selectedLanguage, searchTerm]);

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('department')
        .select('d_uuid, d_name');
      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDepartments(data);
      }
      setLoading(false);
    };
    fetchDepartments();
  }, []);

  // Calendar/Assignments logic placeholder (implement as needed)
  // Minimal state for calendar/assignments
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Example: group recentFiles by date for assignments
  const formatDateKey = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const docsByDate = React.useMemo(() => {
    const mapped = {};
    (recentFiles || []).forEach((doc) => {
      const dateKey = formatDateKey(new Date()); // You can use doc.created_at if available
      if (!mapped[dateKey]) mapped[dateKey] = [];
      mapped[dateKey].push({
        title: doc.f_name,
        from: doc.department?.d_name || "Unassigned",
      });
    });
    return mapped;
  }, [recentFiles]);
  const docsForSelectedDate = docsByDate[formatDateKey(selectedDate)] || [];

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <CalendarCard
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          docsByDate={docsByDate}
        />
        <AssignmentsCard
          selectedDate={selectedDate}
          assignments={docsForSelectedDate}
          loading={filesLoading}
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Department Files</h2>
        {filesLoading ? (
          <div>Loading recent files...</div>
        ) : recentFiles.length === 0 ? (
          <div>No recent files found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentFiles.map((file, idx) => (
                  <tr key={file.f_uuid + '-' + idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                      <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 truncate max-w-xs" title={file.f_name}>{file.f_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.department?.d_name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{file.language || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        className="text-blue-600 hover:underline text-sm font-medium"
                        href={`/file/${file.f_uuid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default AssignToMe;