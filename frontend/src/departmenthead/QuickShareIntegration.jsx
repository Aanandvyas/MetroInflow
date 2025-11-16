import React, { useRef } from 'react';
import QuickShare from './QuickShare';
import QuickShareBoard from './QuickShareBoard';

/**
 * This component integrates QuickShare and QuickShareBoard in the HeadDashboard
 */
const QuickShareIntegration = ({ userProfile }) => {
    const boardRef = useRef(null);
    
    // Function to refresh messages in the QuickShareBoard
    const refreshMessages = () => {
        if (boardRef.current) {
            // Access fetchMessages through the exposed ref method
            boardRef.current.fetchMessages();
        }
    };
    
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Quick Share */}
            <div className="lg:col-span-1">
                <QuickShare 
                    userProfile={userProfile} 
                    onMessageSent={refreshMessages} 
                />
            </div>

            {/* Right Column - Quick Share Board */}
            <div className="lg:col-span-2">
                <QuickShareBoard 
                    userProfile={userProfile} 
                    ref={boardRef} 
                />
            </div>
        </div>
    );
};

export default QuickShareIntegration;