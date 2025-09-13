import React from 'react';
import { Link } from 'react-router-dom';
import { useFilter } from '../context/FilterContext';
import { 
    MagnifyingGlassIcon, 
    AdjustmentsHorizontalIcon, 
    UserCircleIcon,
    Squares2X2Icon,
    QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

// ✅ Import your logos
import kmrllogo from '../../assets/kmrllogo.jpg';
import azadilogo from '../../assets/azadilogo.jpg';

const Header = () => {
    const { searchTerm, setSearchTerm, setShowFilters } = useFilter();

    return (
        <header className="w-full bg-white p-4 flex items-center justify-between border-b">
            {/* ✅ Left Section: Logos */}
            <div className="flex items-center space-x-4">
                <img src={kmrllogo} alt="KMRL Logo" className="h-11 object-contain" />
                <img src={azadilogo} alt="Azadi Ka Amrit Mahotsav Logo" className="h-11 object-contain" />
            </div>

            {/* Center Section: Search Bar */}
            <div className="relative flex-1 max-w-xl mx-8">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search files and messages..."
                    className="w-full bg-gray-50 border rounded-lg py-2 pl-10 pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={() => setShowFilters(true)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200">
                    <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500" />
                </button>
            </div>

            {/* Right Section: Icons */}
            <div className="flex items-center space-x-6">
                 <Squares2X2Icon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                 <QuestionMarkCircleIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-gray-800" />
                <Link to="/profile">
                    <UserCircleIcon className="h-8 w-8 text-gray-600" />
                </Link>
            </div>
        </header>
    );
};

export default Header;