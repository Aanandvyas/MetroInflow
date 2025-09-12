import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
import { FilterProvider } from './components/context/FilterContext'; // ✅ 1. Import the provider

function App() {
  return (
    // ✅ 2. Wrap the layout with the FilterProvider
    <FilterProvider>
        <div className="h-screen flex flex-col">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 bg-gray-50 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
    </FilterProvider>
  );
}

export default App;