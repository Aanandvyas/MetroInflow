import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';

const FileCard = ({ file }) => {
    const publicUrl = file.file_path
        ? supabase.storage.from("file_storage").getPublicUrl(file.file_path).data.publicUrl
        : null;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition group">
            <div className="flex items-start gap-4">
                <DocumentTextIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-gray-800 truncate" title={file.f_name}>
                        {file.f_name}
                    </p>
                    <p className="text-xs text-gray-500">
                        Uploaded by: {file.users?.name || 'Unknown'}
                    </p>
                    {publicUrl && (
                         <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium mt-1 inline-block">
                           View File
                         </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileCard;