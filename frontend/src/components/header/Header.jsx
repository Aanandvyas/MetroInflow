import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFilter } from '../context/FilterContext';
import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    UserCircleIcon,
    Squares2X2Icon,
    QuestionMarkCircleIcon,
    BellAlertIcon,
    BellIcon,
    FolderMinusIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';

// Import your logos
import kmrllogo from '../../assets/kmrllogo.jpg';
import azadilogo from '../../assets/azadilogo.jpg';
import HeaderSearch from './HeaderSearch';
import { LightBulbIcon } from '@heroicons/react/20/solid';

const Header = () => {
    const { setShowFilters } = useFilter();
    const { user } = useAuth();
    const [notificationCount, setNotificationCount] = useState(0);
    const location = useLocation();

    // For debugging - remove in production
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to fetch notification count
    const fetchNotificationCount = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);

            // Calculate date 4 days ago
            const fourDaysAgo = new Date();
            fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
            const fourDaysAgoStr = fourDaysAgo.toISOString();

            // Get count of unseen notifications from last 4 days
            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: 'exact', head: true })
                .eq("uuid", user.id)
                .eq("is_seen", false)
                .gte("created_at", fourDaysAgoStr);

            if (error) {
                console.error("Error fetching notification count:", error);
                setError(error.message);
                return;
            }

            console.log("Notification count:", count);
            setNotificationCount(count || 0);
        } catch (err) {
            console.error("Exception in fetchNotificationCount:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Get notification count for the last 4 days when user changes or location changes
    useEffect(() => {
        if (!user?.id) {
            setNotificationCount(0);
            setLoading(false);
            return;
        }

        console.log("Fetching notification count - location or user changed");
        fetchNotificationCount();

        // Listen for changes in notifications
        const channel = supabase
            .channel('header-notif-count')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `uuid=eq.${user.id}`
            }, () => {
                console.log("Notification change detected via subscription");
                fetchNotificationCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, location.pathname]); // Re-run when location changes

    // Additional effect to refresh notification count when focus returns to the window
    useEffect(() => {
        if (!user?.id) return;

        const handleFocus = () => {
            console.log("Window focus detected, refreshing notification count");
            fetchNotificationCount();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user?.id]);

    return (
        <header className="w-full bg-white p-4 flex items-center justify-between border-b">
            {/* Left Section: Logos */}
            <div className="flex items-center space-x-4">
                <Link to="/">
                    <img src={kmrllogo} alt="KMRL Logo" className="h-11 object-contain cursor-pointer" />
                </Link>
                <img src={azadilogo} alt="Azadi Ka Amrit Mahotsav Logo" className="h-11 object-contain" />
            </div>

            {/* Center Section: Centralized Search */}
            <div className="flex-1 max-w-2xl mx-8">
                <HeaderSearch />
            </div>

            {/* Right Section: Icons */}
            <div className="flex items-center space-x-6">
                <Link to="/notifications" className="relative inline-block">
                    {loading ? (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"></div>
                    ) : (
                        <>
                            <BellIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                            {notificationCount > 0 && (
                                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </>
                    )}
                </Link>
                <Link to="/about">
                    <InformationCircleIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />

                </Link>
                <Link to="/profile">
                    <UserCircleIcon className="h-8 w-8 text-gray-600" />
                </Link>
            </div>
        </header>
    );
};

export default Header;