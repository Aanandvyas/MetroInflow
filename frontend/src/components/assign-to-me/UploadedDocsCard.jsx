import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import CalendarCard from "./CalendarCard";
import AssignmentsCard from "./AssignmentsCard";
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const formatDateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const UploadedDocsCard = ({ uploadedDocs = [], loading, error, departmentName }) => {
  const { user } = useAuth();
  
  // State for the Calendar and Assignments cards
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Filter states
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter the docs passed as props
  const filteredDocs = useMemo(() => {
    if (!uploadedDocs) return [];
    return uploadedDocs.filter(file => {
      const matchesLang = !selectedLanguage || file.language === selectedLanguage;
      const matchesSearch = file.f_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesLang && matchesSearch;
    });
  }, [uploadedDocs, selectedLanguage, searchTerm]);

  // Memoize the document data for the calendar component
  const docsByDate = useMemo(() => {
    const mappedDocs = {};
    (uploadedDocs || []).forEach((doc) => {
      const dateKey = formatDateKey(new Date(doc.created_at));
      if (!mappedDocs[dateKey]) {
        mappedDocs[dateKey] = [];
      }
      mappedDocs[dateKey].push({
        title: doc.f_name,
        from: departmentName || "Your Department",
      });
    });
    return mappedDocs;
  }, [uploadedDocs, departmentName]);

  const docsForSelectedDate = docsByDate[formatDateKey(selectedDate)] || [];

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {/* Calendar and Assignments section */}
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
          loading={loading}
        />
      </div>

      {/* Files section */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {departmentName || 'Department'} Files
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="border rounded px-3 py-2"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {[...new Set(uploadedDocs.map(f => f.language).filter(Boolean))].map(lang => (
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

        {/* Files table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div>Loading department files...</div>
          ) : filteredDocs.length === 0 ? (
            <div>No files found in your department.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocs.map((file) => (
                    <tr key={file.f_uuid} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                        <DocumentTextIcon className="h-6 w-6 text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800 truncate max-w-xs" title={file.f_name}>
                          {file.f_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {file.language || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {file.users?.name || 'Unknown'}
                      </td>
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

export default UploadedDocsCard;
