import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ChatBubbleLeftIcon, ClockIcon, UserIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { getSupabase } from '../supabaseClient';
const supabase = getSupabase();

const QuickShareBoard = forwardRef(({ userProfile }, ref) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const refreshTimerRef = useRef(null);

    // Expose fetchMessages method to parent components through ref
    useImperativeHandle(ref, () => ({
        fetchMessages: () => fetchMessages()
    }));

    useEffect(() => {
        // Only fetch if we have a user profile
        if (userProfile?.id) {
            fetchMessages();
            
            // Set up refresh timer to check for new messages every minute
            refreshTimerRef.current = setInterval(() => {
                fetchMessages();
            }, 60000);
        } else {
            setError("User profile not available. Please refresh the page or log in again.");
            setLoading(false);
        }
        
        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [userProfile]);

    const fetchMessages = async () => {
        if (!userProfile || !userProfile.id) {
            setError("User profile not available. Please refresh the page.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null); // Clear any previous errors
        
        try {
            
            // Get messages sent by the current user - using uuid field as seen in the schema
            const { data: sentMessages, error: sentError } = await supabase
                .from('quick_share')
                .select(`
                    qs_uuid,
                    created_at,
                    data,
                    d_uuid,
                    is_sent,
                    uuid,
                    users!uuid(name)
                `)
                .eq('uuid', userProfile.id) // Using id field from the profile which contains the UUID
                .order('created_at', { ascending: false })
                .limit(7);

            if (sentError) {
                console.error("Error in Supabase query:", sentError);
                throw sentError;
            }
            
            
            if (sentError) {
                // Provide more specific error messages based on common issues
                if (sentError.code === "42P01") {
                    console.error("Table 'quick_share' does not exist. Database schema issue.");
                    setError("Database table 'quick_share' not found. Please contact an administrator.");
                } else if (sentError.code === "42703") {
                    console.error("Column not found in database. Schema mismatch:", sentError.message);
                    setError(`Database schema mismatch: ${sentError.message}`);
                } else {
                    throw sentError;
                }
            } else {
                // Set messages state with proper fallback to empty array
                setMessages(sentMessages || []);
                setLastRefresh(new Date());
            }
        } catch (error) {
            setError('Failed to load messages. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Format relative time (e.g., "2 hours ago")
    const formatRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Truncate message text to a preview
    const getMessagePreview = (message) => {
        if (!message.data || !message.data.message) return 'No message content';
        
        const text = message.data.message;
        return text.length > 80 ? `${text.substring(0, 80)}...` : text;
    };

    // Determine if message is sent or received
    const isSentMessage = (message) => {
        return message.uuid === userProfile?.uuid;
    };

    // Get the department or sender name in a more formal way
    const getSenderOrRecipientLabel = (message) => {
        // For received messages, format with a proper label
        if (isSentMessage(message)) {
            // When the current user sent the message
            return `Department ID: ${message.d_uuid ? message.d_uuid.substring(0, 8) : 'Unknown'}`;
        } else {
            // When someone else sent the message to the current user
            return `From: ${message.users?.name || 'User ' + (message.uuid ? message.uuid.substring(0, 8) : 'Unknown')}`;
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col">
                    <h2 className="text-xl font-semibold text-gray-900">Department Communications</h2>
                    <p className="text-sm text-gray-500 mt-1">Recent interdepartmental messages</p>
                </div>
                <div className="flex items-center">
                    <span className="mr-3 text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1.5 rounded-md">
                        Last 7 Messages
                    </span>
                    <button 
                        onClick={fetchMessages}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                        aria-label="Refresh messages"
                        title="Refresh messages"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Last refresh time indicator */}
            {lastRefresh && (
                <div className="text-xs text-gray-500 mb-3 flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading messages...</span>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 mb-4">
                    <div className="flex items-start">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                        <div>
                            <p className="font-medium">{error}</p>
                            <div className="mt-2">
                                <button 
                                    onClick={fetchMessages}
                                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded border border-red-300 hover:bg-red-200"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : messages.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-md border border-gray-200">
                    <ChatBubbleLeftIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-700 font-medium">No Messages Available</p>
                    <p className="text-sm text-gray-500 mt-2">Use the Quick Share form to communicate with other departments</p>
                    <div className="mt-3">
                        <button 
                            onClick={fetchMessages}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
                        >
                            Refresh Messages
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map((message, index) => (
                        <div 
                            key={message.qs_uuid || index} 
                            className={`p-4 rounded-md border ${
                                isSentMessage(message) 
                                    ? 'bg-blue-50 border-blue-100' 
                                    : 'bg-gray-50 border-gray-200'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                                        isSentMessage(message) ? 'bg-blue-500' : 'bg-gray-600'
                                    }`}>
                                        {message.users?.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                                    </div>
                                    <div className="ml-2">
                                        <p className="font-medium text-gray-900">
                                            {getSenderOrRecipientLabel(message)}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                            <ClockIcon className="h-3 w-3 mr-1" />
                                            {formatRelativeTime(message.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    message.data?.priority === 'high' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {message.data?.priority === 'high' ? 'High Priority' : 'Normal'}
                                </div>
                            </div>
                            <div className="mt-3 text-gray-700 pl-10 bg-white p-3 rounded-md border border-gray-100">
                                <div className="font-medium text-xs text-gray-500 mb-1">MESSAGE CONTENT</div>
                                <div className="text-sm leading-relaxed">
                                    {getMessagePreview(message)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default QuickShareBoard;