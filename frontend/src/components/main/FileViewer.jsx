import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../context/AuthContext';

const BUCKET_NAME = 'file_storage';

const FileViewer = () => {
  const { uuid } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  
  // Check if this view was initiated from a notification
  const fromNotification = new URLSearchParams(location.search).get('from') === 'notification';

  useEffect(() => {
    const fetchAndDownload = async () => {
      try {
        setLoading(true);
        
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

        // If viewing from notification, mark it as seen
        if (fromNotification && user) {
          try {
            const { error: markError } = await supabase
              .from('notifications')
              .update({ is_seen: true })
              .match({ f_uuid: uuid, uuid: user.id });
              
            if (markError) {
            }
          } catch (err) {
          }
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
        setError('An error occurred while processing your request.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndDownload();
  }, [uuid, fromNotification, user]);

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

