import React from 'react';
import { Link } from 'react-router-dom';
import kmrllogo from '../../assets/kmrllogo.jpg';
import azadilogo from '../../assets/azadilogo.jpg';
import { 
    MagnifyingGlassIcon, 
    AdjustmentsHorizontalIcon, 
    Squares2X2Icon, 
    QuestionMarkCircleIcon, 
    UserCircleIcon 
} from '@heroicons/react/24/outline';

const Header = () => {
  return (
    <header className="w-full bg-white p-4 flex items-center justify-between border-b border-gray-200">
      {/* Left Section: Logos */}
      <div className="flex items-center space-x-3 pl-9">
        <img src={kmrllogo} alt="KMRL logo" className="h-11 w-25 object-cover" />
        <img src={azadilogo} alt="Azadi logo" className="h-11 w-25 object-cover" />
      </div>

      {/* Center Section: Search Bar */}
      <div className="relative flex-1 max-w-xl mx-8">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search files and messages..."
          className="w-full bg-gray-50 border rounded-lg py-2 pl-10 pr-10 focus:ring-2 focus:ring-blue-500"
        />
        <AdjustmentsHorizontalIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      {/* Right Section: Icons */}
      <div className="flex items-center space-x-6">
        <Squares2X2Icon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />
        <QuestionMarkCircleIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />
        <Link to="/profile">
          <UserCircleIcon className="h-8 w-8 text-gray-600 cursor-pointer hover:text-gray-800" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
