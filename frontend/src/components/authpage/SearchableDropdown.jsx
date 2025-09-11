import React, { useState, useEffect, useRef } from "react";

const SearchableDropdown = ({ value, onChange, options = [], loading }) => {
    const [inputValue, setInputValue] = useState(value);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);

    // Effect to filter options based on input
    useEffect(() => {
        if (inputValue) {
            const filtered = options.filter((option) =>
                option.toLowerCase().includes(inputValue.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options); // Show all when input is empty
        }
    }, [inputValue, options]);

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

    const handleSelect = (option) => {
        setInputValue(option);
        // Mimic input event for parent
        onChange({ target: { name: "departmentName", value: option } });
        setIsDropdownVisible(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter" && highlightedIndex > -1) {
            e.preventDefault();
            handleSelect(filteredOptions[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsDropdownVisible(false);
        }
    };

    return (
        <div className="relative md:col-span-2" ref={wrapperRef}>
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
                placeholder={loading ? "Loading departments..." : "Search or select department"}
                className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
                disabled={loading}
            />

            {isDropdownVisible && !loading && (
                <ul className="absolute z-10 w-full mt-1 border rounded-md bg-white max-h-48 overflow-y-auto shadow-lg">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <li
                                key={option}
                                className={`px-3 py-2 cursor-pointer ${
                                    index === highlightedIndex ? "bg-blue-100" : "hover:bg-gray-100"
                                }`}
                                onMouseDown={() => handleSelect(option)}
                                onMouseOver={() => setHighlightedIndex(index)}
                            >
                                {option}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-gray-500">No departments found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;
