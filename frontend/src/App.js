import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/header/Header';
import Sidebar from './components/sidebar/Sidebar';
import { FilterProvider } from './components/context/FilterContext';
import { NotificationProvider } from './components/context/NotificationContext';
import { useAuth } from './components/context/AuthContext';

function EmailVerificationBanner() {
  const { isEmailVerified, user } = useAuth();

  if (!user || isEmailVerified) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
      <span>
        <strong>Email not verified.</strong> Please check your inbox for a verification link. Some features may be limited until you verify your email.
      </span>
    </div>
  );
}

function App() {
  return (
    <FilterProvider>
      <NotificationProvider>
        <div className="h-screen flex flex-col">
          <Header />
          <EmailVerificationBanner />
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