import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../supabaseClient";
import CalendarCard from "../assign-to-me/CalendarCard";
import AssignmentsCard from "../assign-to-me/AssignmentsCard";
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const AssignToMe = () => {
  const { user } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [userDepartment, setUserDepartment] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // First, fetch user's department
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("d_uuid, department(d_name)")
        .eq("uuid", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user department:", userError);
        return;
      }

      setUserDepartment(userData);
    };

    fetchUserDepartment();
  }, [user]);

  // Then, fetch files only for user's department
  useEffect(() => {
    const fetchRecentFiles = async () => {
      if (!userDepartment?.d_uuid) return;

      setFilesLoading(true);
      let query = supabase
        .from('file')
        .select(`
          f_uuid,
          f_name,
          language,
          created_at,
          department:d_uuid(d_name),
          uploader:uuid(name)
        `)
        .eq('d_uuid', userDepartment.d_uuid) // Only fetch files from user's department
        .order('created_at', { ascending: false })
        .limit(20);

      // Apply additional filters
      if (selectedLanguage) {
        query = query.eq('language', selectedLanguage);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching recent files:', error);
        setRecentFiles([]);
      } else {
        // Add public URLs to files
        const filesWithUrls = (data || []).map(file => ({
          ...file,
          publicUrl: file.file_path 
            ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
            : null
        }));
        setRecentFiles(filesWithUrls);
      }
      setFilesLoading(false);
    };

    fetchRecentFiles();
  }, [userDepartment, selectedLanguage]);

  // Calendar/Assignments logic
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateKey = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const docsByDate = React.useMemo(() => {
    const mapped = {};
    (recentFiles || []).forEach((doc) => {
      const dateKey = formatDateKey(new Date(doc.created_at));
      if (!mapped[dateKey]) mapped[dateKey] = [];
      mapped[dateKey].push({
        title: doc.f_name,
        from: userDepartment?.department?.d_name || "Your Department",
      });
    });
    return mapped;
  }, [recentFiles, userDepartment]);

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
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {userDepartment?.department?.d_name || 'Your Department'} Files
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="border rounded px-3 py-2"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {[...new Set(recentFiles.map(f => f.language).filter(Boolean))].map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {filesLoading ? (
          <div className="text-center py-4">Loading department files...</div>
        ) : recentFiles.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No files found in your department.</div>
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
                {recentFiles.map((file) => (
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
                      {file.uploader?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={file.publicUrl || `/file/${file.f_uuid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium"
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