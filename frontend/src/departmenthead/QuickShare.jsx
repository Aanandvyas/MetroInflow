import React, { useState, useEffect } from 'react';
import {
    PaperAirplaneIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getSupabase } from '../supabaseClient';
const supabase = getSupabase();

const QuickShare = ({ userProfile, onMessageSent }) => {
    const [message, setMessage] = useState('');
    const [departments, setDepartments] = useState([]);
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
    
    useEffect(() => {
        // Initialize component with userProfile
    }, [userProfile]);
    
    // Fetch all departments
    useEffect(() => {
        const fetchDepartments = async () => {
            if (!userProfile) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('department')
                    .select('*');
                
                if (error) throw error;
                
                // Filter out user's own department if profile is loaded
                const filteredData = userProfile?.d_uuid 
                    ? data.filter(dept => dept.d_uuid !== userProfile.d_uuid)
                    : data;
                
                setDepartments(filteredData);
                setFilteredDepartments(filteredData);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
        };
        
        fetchDepartments();
    }, [userProfile]);
    
    // Filter departments based on search term
    useEffect(() => {
        if (!departmentSearch.trim()) {
            setFilteredDepartments(departments);
            return;
        }
        
        const filtered = departments.filter(dept => 
            dept.d_name.toLowerCase().includes(departmentSearch.toLowerCase())
        );
        
        setFilteredDepartments(filtered);
    }, [departmentSearch, departments]);
    
    // Handle department selection
    const handleDepartmentSelect = (department) => {
        setSelectedDepartment(department);
        setDepartmentSearch('');
        setShowDepartmentDropdown(false);
    };
    
    // Clear selected department
    const clearDepartment = () => {
        setSelectedDepartment(null);
    };
    
    // Create quick share entry in database
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!message.trim()) {
            setSubmitStatus({ 
                type: 'error', 
                message: 'Please enter a message to share' 
            });
            return;
        }
        
        if (!selectedDepartment) {
            setSubmitStatus({ 
                type: 'error', 
                message: 'Please select a department to share with' 
            });
            return;
        }
        
        if (!userProfile || !userProfile.id) {
            setSubmitStatus({ 
                type: 'error', 
                message: 'Unable to identify current user' 
            });
            return;
        }
        
        setIsSubmitting(true);
        setSubmitStatus({ type: '', message: '' });
        
        try {
            // Create JSON data object
            const jsonData = {
                message: message,
                timestamp: new Date().toISOString(),
                priority: "normal"
            };
            
            // Insert entry into quick_share table
            const { data, error } = await supabase
                .from('quick_share')
                .insert([
                    {
                        data: jsonData,
                        d_uuid: selectedDepartment.d_uuid, // Using the correct d_uuid field from schema
                        uuid: userProfile.id, // Using the id field from profile which contains the UUID
                        created_at: new Date().toISOString()
                    }
                ]);
                
            if (error) {
                throw error;
            }
            
            // Call the onMessageSent callback if provided
            if (typeof onMessageSent === 'function') {
                onMessageSent();
            }
            
            setSubmitStatus({ 
                type: 'success', 
                message: 'Message shared successfully!' 
            });
            
            // Reset form
            setMessage('');
            setSelectedDepartment(null);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                setSubmitStatus({ type: '', message: '' });
            }, 3000);
            
        } catch (error) {
            setSubmitStatus({ 
                type: 'error', 
                message: `Failed to share message. Please try again.` 
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-xl text-gray-800 mb-2">Interdepartmental Message</h3>
            <p className="text-sm text-gray-500 mb-4">Share important communications with other departments</p>
            
            {!userProfile ? (
                <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4 text-yellow-700">
                    <p className="font-medium">User profile is loading...</p>
                    <p className="text-sm mt-1">Please wait while we retrieve your profile information.</p>
                </div>
            ) : (
            <form onSubmit={handleSubmit}>
                {/* Message Input */}
                <div className="mb-4">
                    <label 
                        htmlFor="message" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Message Content
                    </label>
                    <textarea
                        id="message"
                        rows={4}
                        className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        placeholder="Type your official communication here..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">Your message will be delivered instantly to the selected department</p>
                </div>
                
                {/* Department Selection */}
                <div className="mb-4 relative">
                    <label 
                        htmlFor="department" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Recipient Department
                    </label>
                    
                    {selectedDepartment ? (
                        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div>
                                <span className="text-blue-700 font-medium">{selectedDepartment.d_name}</span>
                                <div className="text-xs text-blue-500 mt-0.5">Department ID: {selectedDepartment.d_uuid.substring(0, 8)}...</div>
                            </div>
                            <button
                                type="button"
                                onClick={clearDepartment}
                                className="text-blue-700 hover:text-blue-900 bg-blue-100 rounded-full p-1.5"
                                aria-label="Clear department selection"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="department"
                                    className="w-full px-4 py-3 pl-10 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Search for department by name..."
                                    value={departmentSearch}
                                    onChange={(e) => setDepartmentSearch(e.target.value)}
                                    onFocus={() => setShowDepartmentDropdown(true)}
                                />
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                            
                            {/* Department dropdown */}
                            {showDepartmentDropdown && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredDepartments.length > 0 ? (
                                        filteredDepartments.map(dept => (
                                            <div
                                                key={dept.d_uuid}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => handleDepartmentSelect(dept)}
                                            >
                                                {dept.d_name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-2 text-gray-500 text-center">
                                            No departments found
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {/* Submit button and status */}
                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full flex items-center justify-center px-4 py-3 rounded-md text-white font-medium transition-colors ${
                            isSubmitting 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Processing Request...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                                Send Official Communication
                            </>
                        )}
                    </button>
                    
                    {submitStatus.message && (
                        <div className={`mt-3 px-4 py-3 rounded-md flex items-start ${
                            submitStatus.type === 'error' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                            <div className={`rounded-full p-1 mr-2 flex-shrink-0 ${
                                submitStatus.type === 'error' ? 'bg-red-100' : 'bg-green-100'
                            }`}>
                                {submitStatus.type === 'error' ? (
                                    <XMarkIcon className="h-4 w-4" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="font-medium">
                                {submitStatus.message}
                            </div>
                        </div>
                    )}
                </div>
            </form>
            )}
        </div>
    );
};

export default QuickShare;
