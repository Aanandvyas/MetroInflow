import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { markNotificationAsSeen } from '../../utils/notificationUtils';

const BUCKET_NAME = 'file_storage';

const FileViewer = () => {
  const { uuid } = useParams();
  const [error, setError] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  
  // We'll keep this for backward compatibility but won't rely on it
  const fromNotification = new URLSearchParams(location.search).get('from') === 'notification';

  useEffect(() => {
    const fetchAndDownload = async () => {
      try {
        // Fetch file info from DB
        const { data, error } = await supabase
          .from('file')
          .select('f_name, file_path')
          .eq('f_uuid', uuid)
          .single();

        if (error || !data) {
          setError('File not found in database.');
          return;
        }

        const { f_name, file_path } = data;

        // Always mark notification as seen if user is logged in
        // regardless of where the view came from
        if (user) {
          await markNotificationAsSeen(uuid, user.id);
        }

        // Generate signed URL (private bucket)
        const { data: signedData, error: signedError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .createSignedUrl(file_path, 60 * 60); // 1 hour

        if (signedError || !signedData?.signedUrl) {
          setError('Could not generate signed URL.');
          return;
        }

        // Force browser download
        const link = document.createElement('a');
        link.href = signedData.signedUrl;
        link.setAttribute('download', f_name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error in file viewer:', err);
        setError('An error occurred while processing your request.');
      }
    };

    fetchAndDownload();
  }, [uuid, user]);

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
      {error ? (
        <div className="text-red-500 font-medium">{error}</div>
      ) : (
        <div>
          <div className="animate-pulse text-lg text-gray-700">Preparing your download...</div>
          <p className="mt-2 text-sm text-gray-500">The file should download automatically.</p>
        </div>
      )}
    </div>
  );
};

export default FileViewer;

