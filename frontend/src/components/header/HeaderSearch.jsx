import React, { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { getSupabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const HeaderSearch = () => {
  const supabase = getSupabase();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]); // Array of d_uuid
  const [selectedLanguages, setSelectedLanguages] = useState([]); // Array of language strings
  const popupRef = useRef();
  const sidebarRef = useRef();
  const navigate = useNavigate();

  // Fetch departments and languages for filters
  useEffect(() => {
    const fetchFilters = async () => {
      const { data: deptData } = await supabase.from("department").select("d_uuid, d_name");
      setDepartments(deptData || []);
      const { data: langData } = await supabase.from("file").select("language");
      setLanguages([...new Set((langData || []).map(f => f.language).filter(Boolean))]);
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    if (
      !query.trim() &&
      selectedDepartments.length === 0 &&
      selectedLanguages.length === 0
    ) {
      setResults([]);
      setShowPopup(false);
      return;
    }
    setLoading(true);
    const fetchResults = async () => {
      let { data, error } = await supabase
        .from("file")
        .select(`
          f_uuid,
          f_name,
          language,
          created_at,
          file_department(
            department(
              d_name,
              d_uuid
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        let filtered = data;

        // Filter by search query (file name or department name)
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          filtered = filtered.filter(
            file =>
              file.f_name.toLowerCase().includes(q) ||
              (file.file_department || []).some(fd =>
                fd.department?.d_name?.toLowerCase().includes(q)
              )
          );
        }

        // Filter by multiple departments
        if (selectedDepartments.length > 0) {
          filtered = filtered.filter(
            file =>
              (file.file_department || []).some(fd =>
                selectedDepartments.includes(fd.department?.d_uuid)
              )
          );
        }

        // Filter by languages
        if (selectedLanguages.length > 0) {
          filtered = filtered.filter(file => selectedLanguages.includes(file.language));
        }

        setResults(filtered);
        setShowPopup(true);
      } else {
        setResults([]);
        setShowPopup(false);
      }
      setLoading(false);
    };
    const timeout = setTimeout(fetchResults, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query, selectedDepartments, selectedLanguages, departments]);

  // Close popup on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close sidebar on outside click or ESC
  useEffect(() => {
    const handleClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setShowFilter(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setShowFilter(false);
    };
    if (showFilter) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showFilter]);

  // Add department to selectedDepartments
  const handleAddDepartment = (d_uuid) => {
    if (!selectedDepartments.includes(d_uuid)) {
      setSelectedDepartments([...selectedDepartments, d_uuid]);
    }
  };

  // Remove department from selectedDepartments
  const handleRemoveDepartment = (d_uuid) => {
    setSelectedDepartments(selectedDepartments.filter(id => id !== d_uuid));
  };

  // Add language to selectedLanguages
  const handleAddLanguage = (lang) => {
    if (lang && !selectedLanguages.includes(lang)) {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  // Remove language from selectedLanguages
  const handleRemoveLanguage = (lang) => {
    setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Search bar */}
        <div className="flex items-center relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-12 py-2 rounded-full border border-gray-200 bg-white shadow focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition outline-none text-gray-800 placeholder-gray-400"
            placeholder="Search files or departments..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() =>
          (query || selectedDepartments.length > 0 || selectedLanguages.length > 0) &&
          setShowPopup(true)
            }
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-blue-100 transition"
            onClick={() => setShowFilter(true)}
            tabIndex={-1}
            aria-label="Open filters"
          >
            <Bars3Icon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {/* Chips below search bar */}
      {selectedDepartments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedDepartments.map(d_uuid => {
            const dept = departments.find(d => d.d_uuid === d_uuid);
            return (
              <span
                key={d_uuid}
                className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {dept?.d_name || "Department"}
                <button
                  className="ml-1 text-blue-500 hover:text-blue-700"
                  onClick={() => handleRemoveDepartment(d_uuid)}
                  aria-label="Remove department"
                  type="button"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedLanguages.map(lang => (
            <span
              key={lang}
              className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
            >
              {lang}
              <button
                className="ml-1 text-green-500 hover:text-green-700"
                onClick={() => handleRemoveLanguage(lang)}
                aria-label="Remove language"
                type="button"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Filter sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          showFilter ? "translate-x-0" : "translate-x-full"
        }`}
        ref={sidebarRef}
        style={{ maxWidth: "90vw" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <span className="font-semibold text-lg text-gray-700">Filters</span>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => setShowFilter(false)}
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Add Department</label>
            <select
              className="w-full border rounded px-2 py-1"
              value=""
              onChange={e => {
                handleAddDepartment(e.target.value);
              }}
            >
              <option value="">Select Department</option>
              {departments
                .filter(dept => !selectedDepartments.includes(dept.d_uuid))
                .map(dept => (
                  <option key={dept.d_uuid} value={dept.d_uuid}>
                    {dept.d_name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Add Language</label>
            <select
              className="w-full border rounded px-2 py-1"
              value=""
              onChange={e => handleAddLanguage(e.target.value)}
            >
              <option value="">Select Language</option>
              {languages
                .filter(lang => !selectedLanguages.includes(lang))
                .map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>
          </div>
        </div>
      </div>
      {/* Search results popup */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-white border rounded shadow-lg max-h-72 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-gray-500">No files found.</div>
          ) : (
            results.slice(0, 20).map(file => (
              <div
                key={file.f_uuid}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex flex-col"
                onClick={() => {
                  window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer");
                  setShowPopup(false);
                  setQuery("");
                }}
              >
                <span className="font-medium text-gray-800">{file.f_name}</span>
                <span className="text-xs text-gray-500">
      {(file.file_department || [])
        .map(fd => fd.department?.d_name)
        .filter(Boolean)
        .join(", ") || "No Department"}
    </span>
    <span className="text-xs text-gray-400">{file.language || ""}</span>
    <span className="text-xs text-gray-400">{file.created_at ? new Date(file.created_at).toLocaleString() : ""}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;