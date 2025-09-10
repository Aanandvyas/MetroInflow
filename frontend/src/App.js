import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';

function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <Header />

      {/* Main Body: Sidebar + Page Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (fixed width) */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default App;
