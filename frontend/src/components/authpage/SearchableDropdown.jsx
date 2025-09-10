import React, { useState, useEffect, useRef } from "react";

// You can replace this with your dynamic list from Supabase
const departmentList = [
    "Train Operations Department",
    "Emergency & Maintenance Department",
    "Signaling & Telecommunications Department",
    "Civil & Track Department",
    "Customer Relations & Marketing Department",
    "Finance & Procurement Department",
];

const SearchableDropdown = ({ value, onChange }) => {
    const [inputValue, setInputValue] = useState(value);
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);

    // Effect to filter departments based on input
    useEffect(() => {
        if (inputValue) {
            const filtered = departmentList.filter((dept) =>
                dept.toLowerCase().includes(inputValue.toLowerCase())
            );
            setFilteredDepartments(filtered);
        } else {
            setFilteredDepartments(departmentList); // Show all when input is empty
        }
    }, [inputValue]);

    // Effect to handle clicks outside the component
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);


    const handleSelect = (dept) => {
        setInputValue(dept);
        onChange({ target: { name: "departmentName", value: dept } });
        setIsDropdownVisible(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            setHighlightedIndex((prev) => (prev < filteredDepartments.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter" && highlightedIndex > -1) {
            e.preventDefault();
            handleSelect(filteredDepartments[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsDropdownVisible(false);
        }
    };

    return (
        <div className="relative col-span-2" ref={wrapperRef}>
            <label htmlFor="departmentName" className="block text-sm font-medium text-gray-700">
                Department
            </label>
            <input
                id="departmentName"
                type="text"
                name="departmentName"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsDropdownVisible(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search or select department"
                className="w-full px-3 py-2 mt-1 border rounded-md"
                autoComplete="off"
            />

            {isDropdownVisible && (
                <ul className="absolute z-10 w-full mt-1 border rounded-md bg-white max-h-48 overflow-y-auto shadow-lg">
                    {filteredDepartments.map((dept, index) => (
                        <li
                            key={dept}
                            className={`px-3 py-2 cursor-pointer ${
                                index === highlightedIndex ? "bg-blue-100" : "hover:bg-gray-100"
                            }`}
                            // ✅ FIX: Use onMouseDown to prevent the input's onBlur from firing first
                            onMouseDown={() => handleSelect(dept)}
                            onMouseOver={() => setHighlightedIndex(index)}
                        >
                            {dept}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;