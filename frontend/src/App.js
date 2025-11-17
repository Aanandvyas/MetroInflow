import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
import { FilterProvider } from './components/context/FilterContext';
import { NotificationProvider } from './components/context/NotificationContext';

function App() {
  return (
    <FilterProvider>
      <NotificationProvider>
        <div className="h-screen flex flex-col">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 bg-gray-50 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </NotificationProvider>
    </FilterProvider>
  );
}

export default App;