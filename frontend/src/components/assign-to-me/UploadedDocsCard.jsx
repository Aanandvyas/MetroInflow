import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient.";
import CalendarCard from "../assign-to-me/CalendarCard";
import AssignmentsCard from "../assign-to-me/AssignmentsCard";
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const formatDateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const AssignToMe = () => {
  // Assuming useAuth() provides the user object with d_uuid
  const { user } = useAuth();
  
  // State for the Calendar and Assignments cards
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // State for the Recent Files table and filters
  const [allDocs, setAllDocs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all documents for the user's department and populate the calendar and table
  useEffect(() => {
    const fetchUserDocuments = async () => {
      if (!user || !user.d_uuid) {
        setAllDocs([]);
        setFilesLoading(false);
        return;
      }
      setFilesLoading(true);

      // Fetch all files from the user's department, joining with the department table for the name
      const { data, error } = await supabase
        .from("file")
        .select(`*, department(d_name)`)
        .eq("d_uuid", user.d_uuid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        setAllDocs([]);
      } else {
        const filesWithUrls = data.map((file) => ({
          ...file,
          publicUrl: file.file_path
            ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
            : null,
        }));
        setAllDocs(filesWithUrls);

        // Build a unique list of languages from the fetched files for the filter dropdown
        const uniqueLanguages = [...new Set(filesWithUrls.map(f => f.language).filter(Boolean))];
        // Note: The departments are already joined in the query, so we can use them directly.
      }
      setFilesLoading(false);
    };
    fetchUserDocuments();
  }, [user]);

  // Fetch a list of all departments for the filter dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('department')
        .select('d_uuid, d_name');
      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDepartments(data);
      }
    };
    fetchDepartments();
  }, []);

  // Use useMemo for efficient filtering of documents based on selected filters and search term
  const filteredDocs = useMemo(() => {
    return allDocs.filter(file => {
      const matchesDept = !selectedDepartment || file.d_uuid === selectedDepartment;
      const matchesLang = !selectedLanguage || file.language === selectedLanguage;
      const matchesSearch = file.f_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDept && matchesLang && matchesSearch;
    });
  }, [allDocs, selectedDepartment, selectedLanguage, searchTerm]);
  
  // Memoize the document data for the calendar component
  const docsByDate = useMemo(() => {
    const mappedDocs = {};
    (allDocs || []).forEach((doc) => {
      const dateKey = formatDateKey(new Date(doc.created_at));
      if (!mappedDocs[dateKey]) {
        mappedDocs[dateKey] = [];
      }
      mappedDocs[dateKey].push({
        title: doc.f_name,
        from: doc.department?.d_name || "Unassigned",
      });
    });
    return mappedDocs;
  }, [allDocs]);

  const docsForSelectedDate = docsByDate[formatDateKey(selectedDate)] || [];

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
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

      {/* The combined and updated recent files table with filters and search */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Department Files</h2>

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="border rounded px-3 py-2"
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.d_uuid} value={dept.d_uuid}>{dept.d_name}</option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {[...new Set(allDocs.map(f => f.language).filter(Boolean))].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <input
            className="border rounded px-3 py-2 flex-grow"
            type="text"
            placeholder="Search files by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* The table display */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {filesLoading ? (
            <div>Loading recent files...</div>
          ) : filteredDocs.length === 0 ? (
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
                  {filteredDocs.map((file, idx) => (
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
                          href={file.publicUrl}
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
      </section>
    </div>
  );
};

export default AssignToMe;
