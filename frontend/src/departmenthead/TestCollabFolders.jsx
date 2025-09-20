import React from 'react';
import CollabFolders from './CollabFolders';

// Simple wrapper to test if CollabFolders can render
export default function TestCollabFolders() {
  console.log("TestCollabFolders mounting");
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Testing CollabFolders Component</h1>
      <div className="border p-4 rounded">
        <CollabFolders />
      </div>
    </div>
  );
}