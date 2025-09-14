import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import AssignmentCard from "./AssignmentsCard";
import { useAuth } from "../context/AuthContext";

const AssignmentsContainer = () => {
  const { user } = useAuth();
  const [departmentFiles, setDepartmentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState('');
  const [debugMessage, setDebugMessage] = useState(''); // State for on-screen debug messages

  useEffect(() => {
    const fetchDepartmentFiles = async () => {
      setLoading(true);

      // DEBUG 1: Check if the user object is available
      if (!user) {
        console.log("Debug Step 1: No user found. Waiting for user session.");
        setDebugMessage("Waiting for user session...");
        setLoading(false);
        return;
      }
      console.log("Debug Step 1: User found with ID:", user.id);
      setDebugMessage("User found. Fetching profile...");

      try {
        // DEBUG 2: Get the current user's department ID
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('d_uuid, department ( d_name )')
          .eq('u_id', user.id)
          .single();

        if (userError || !userData) {
          console.error("Debug Step 2: Error fetching user profile:", userError);
          setDebugMessage("Error: Could not fetch your user profile. Check RLS policies on the 'user' table.");
          throw new Error(userError?.message || "User department not found.");
        }
        
        const userDeptId = userData.d_uuid;
        console.log("Debug Step 2: User profile fetched. Department ID:", userDeptId);
        
        if (!userDeptId) {
            console.log("Debug Step 2: User does not have a department assigned.");
            setDebugMessage("You are not assigned to a department.");
            setDepartmentFiles([]);
            setLoading(false);
            return;
        }
        
        setDepartmentName(userData.department.d_name);
        setDebugMessage(`Fetching files for ${userData.department.d_name}...`);

        // DEBUG 3: Fetch all files from that department
        const { data, error } = await supabase
          .from("file")
          .select(`u_id, name, user:f_uuid ( name )`)
          .eq('d_uuid', userDeptId);

        if (error) {
            console.error("Debug Step 3: Error fetching department files:", error);
            setDebugMessage("Error: Could not fetch department files. Check RLS policies on the 'file' table.");
            throw error;
        }

        console.log(`Debug Step 3: Successfully fetched ${data.length} files for the department.`);
        setDepartmentFiles(data);
        setDebugMessage(''); // Clear message on success

      } catch (error) {
        console.error("Final Error:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentFiles();
  }, [user]);

  // UI Rendering Logic
  if (loading) {
    return <p className="p-4 text-center text-sm text-gray-500">Loading notifications...</p>;
  }

  // Show the debug message if one exists
  if (debugMessage && departmentFiles.length === 0) {
      return <p className="p-4 text-center text-sm text-orange-600 bg-orange-100 rounded-lg">{debugMessage}</p>;
  }
  
  if (departmentFiles.length === 0) {
    return <p className="p-4 text-center text-sm text-gray-500">No new documents in your department.</p>;
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Notifications from {departmentName}
        </h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {departmentFiles.map((file) => (
                <AssignmentCard key={file.u_id} assignment={file} />
            ))}
        </div>
    </div>
  );
};

export default AssignmentsContainer;