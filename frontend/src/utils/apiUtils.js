/**
 * API utility functions for MetroInflow application
 */

import config from '../config/app.config';

// Get API configuration from central config
const API_BASE_URL = config.api.baseUrl;

/**
 * Upload documents to the backend API
 * @param {File[]} files - Array of file objects to upload
 * @param {Array} departments - Array of department objects with d_uuid and d_name
 * @param {Object} metadata - Additional metadata for the upload
 * @returns {Promise} - Response from the API
 */
export const uploadDocuments = async (files, departments, metadata = {}) => {
  try {
    console.log("Starting document upload:", {
      fileCount: files.length,
      departmentCount: departments.length,
      metadata
    });
    
    const formData = new FormData();
    
    // Add all files to the form data
    files.forEach(file => {
      console.log(`Adding file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      formData.append('files', file);
    });
    
    // Since backend only accepts one department UUID at a time,
    // we'll only use the first department for now
    if (departments.length === 0) {
      console.warn("No departments provided for upload");
      throw new Error("Please select at least one department");
    }
    
    console.log(`Using department: ${departments[0].d_name}, UUID: ${departments[0].d_uuid}`);
    // Using 'd_uuid' to match exactly what the backend expects in UploadDocumentsHandler
    // This field maps to the 'd_uuid' column in the 'file' table
    formData.append('d_uuid', departments[0].d_uuid);
    
    // Add any additional metadata
    // DB Field mapping reference:
    // - 'language' maps to 'language' in 'file' table
    // - 'f_name' maps to 'f_name' in 'file' table (if provided)
    // - 'status' maps to 'status' in 'file' table (if provided)
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        console.log(`Adding metadata: ${key}=${value}`);
        formData.append(key, value);
      }
    });

    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.documents}`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with the boundary
    });

    if (!response.ok) {
      // Try to get detailed error from response body
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      
      try {
        // Attempt to parse error response
        const errorBody = await response.text();
        
        // Try to parse as JSON if possible
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.error || errorJson.message) {
            errorMessage = errorJson.error || errorJson.message;
          }
        } catch (jsonError) {
          // If not JSON, use text if it's meaningful
          if (errorBody && errorBody.length < 100) {
            errorMessage = errorBody;
          }
        }
        
        // Add specific guidance for common errors
        if (response.status === 400) {
          console.error("Bad Request Details:", errorBody);
          
          // Look for specific error patterns
          if (errorBody.includes("No files uploaded")) {
            errorMessage = "No files were received by the server. Please try again.";
          } else if (errorBody.includes("Missing department")) {
            errorMessage = "Department information is missing or invalid.";
          } else if (errorBody.includes("Invalid department")) {
            errorMessage = "The selected department doesn't exist or is invalid.";
          } else {
            errorMessage = "The server couldn't process your request. Please check the file format and try again.";
          }
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      
      throw new Error(errorMessage);
    }

    // Parse the response JSON
    const responseData = await response.json();
    
    // The backend returns an array of documents, but we typically only need the first one
    // or we might need all of them if multiple files were uploaded
    if (Array.isArray(responseData) && responseData.length > 0) {
      console.log(`Upload successful: ${responseData.length} file(s) uploaded`);
      
      // If only one file was uploaded, return that document directly
      // Otherwise, return the array of documents
      return responseData.length === 1 ? responseData[0] : responseData;
    }
    
    // If response is empty or not in expected format
    return responseData;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

/**
 * Get document by ID
 * @param {string} documentId - The document ID to retrieve
 * @returns {Promise} - Response from the API
 */
export const getDocument = async (documentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.documents}/${documentId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `Server error: ${response.status} ${response.statusText}` 
      }));
      throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

/**
 * Get all documents
 * @param {Object} params - Query parameters
 * @returns {Promise} - Response from the API
 */
export const listDocuments = async (params = {}) => {
  try {
    // Convert params object to URL search params
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    const url = `${API_BASE_URL}${config.api.endpoints.documents}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `Server error: ${response.status} ${response.statusText}` 
      }));
      throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
