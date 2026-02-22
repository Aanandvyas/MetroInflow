import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { supabase } from '../supabaseClient';

const QuickShareMessages = ({ userProfile }) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMessages();
    }, [userProfile]);

    const fetchMessages = async () => {
        if (!userProfile || !userProfile.d_uuid) return;

        setLoading(true);
        setError(null);
        
        try {
            // Get messages shared with the current user's department
            const { data: receivedMessages, error: receivedError } = await supabase
                .from('quick_share')
                .select(`
                    *,
                    users!uuid(name, position, department:d_uuid(d_name)),
                    department:d_uuid(d_name)
                `)
                .eq('d_uuid', userProfile.d_uuid)
                .order('created_at', { ascending: false })
                .limit(7);

            if (receivedError) throw receivedError;

            // Get messages sent by the current user
            const { data: sentMessages, error: sentError } = await supabase
                .from('quick_share')
                .select(`
                    *,
                    users!uuid(name, position, department:d_uuid(d_name)),
                    department:d_uuid(d_name)
                `)
                .eq('uuid', userProfile.uuid)
                .neq('d_uuid', userProfile.d_uuid) // Exclude messages sent to own department
                .order('created_at', { ascending: false })
                .limit(7);

            if (sentError) throw sentError;

            // Combine both lists, sort by date (newest first), and take top 7
            const allMessages = [...receivedMessages, ...sentMessages]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 7);

            setMessages(allMessages);
        } catch (error) {
            setError('Failed to load messages');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading messages...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                {error}
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-md border border-gray-200">
                <ChatBubbleLeftIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No messages to display</p>
                <p className="text-sm text-gray-500 mt-1">Messages will appear here when you share them with departments</p>
            </div>
        );
    }

    return (
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
                                {message.users?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="ml-2">
                                <p className="font-medium text-gray-900">
                                    {isSentMessage(message) 
                                        ? `You → ${message.department?.d_name || 'Unknown Department'}`
                                        : `${message.users?.name || 'Unknown User'} (${message.users?.department?.d_name || 'Unknown Dept'})`
                                    }
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
                    <div className="mt-2 text-gray-700 pl-10">
                        {getMessagePreview(message)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QuickShareMessages;