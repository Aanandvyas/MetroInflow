import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient.';

const BUCKET_NAME = 'file_storage';

const FileViewer = () => {
  const { uuid } = useParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndDownload = async () => {
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
    };

    fetchAndDownload();
  }, [uuid]);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  return <div className="p-8">Preparing your download...</div>;
};

export default FileViewer;
