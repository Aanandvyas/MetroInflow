/**
 * Application configuration
 * This file centralizes all configuration values from environment variables
 * with appropriate fallbacks
 */

const config = {
  // API Configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080/v1',
    endpoints: {
      documents: '/documents',
      users: '/users',
      departments: '/departments',
    },
    timeout: 30000, // 30 seconds
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.REACT_APP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
    redirectUrl: process.env.REACT_APP_REDIRECT_URL || 'http://localhost:3000/login',
  },
  
  // Upload Configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      // Text
      'text/plain',
      'text/csv',
    ],
  },
  
  // UI Configuration
  ui: {
    notificationDuration: 5000, // 5 seconds
    paginationLimit: 10,
  },
};

export default config;
