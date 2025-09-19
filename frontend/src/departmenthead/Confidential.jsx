import React from 'react';
import { ShieldExclamationIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const Confidential = () => {
    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="my-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    Confidential Information
                </h1>
                
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg shadow-sm">
                    <div className="flex items-center">
                        <ShieldExclamationIcon className="h-6 w-6 text-red-400 mr-3" />
                        <h2 className="text-lg font-semibold text-red-800">
                            CONFIDENTIAL - Authorized Personnel Only
                        </h2>
                    </div>
                    
                    <p className="mt-2 text-red-700">
                        This section contains confidential department information. Access to this data is restricted to authorized department heads only.
                    </p>
                    
                    <p className="mt-2 text-red-700">
                        Please ensure you maintain the confidentiality of all information displayed on this page according to company policy.
                    </p>
                </div>
                
                {/* Placeholder for confidential content */}
                <div className="mt-6 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center mb-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Sensitive Department Data</h3>
                        </div>
                        <p className="text-gray-600">This is placeholder content for sensitive department information.</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center mb-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Classified Documents</h3>
                        </div>
                        <p className="text-gray-600">Access to classified documents and restricted materials.</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center mb-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">Internal Reports</h3>
                        </div>
                        <p className="text-gray-600">Confidential internal reports and analysis.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Confidential;