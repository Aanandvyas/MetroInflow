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

    return (
        <header className="w-full bg-white p-4 flex items-center justify-between border-b">
            {/* ✅ Left Section: Logos */}
            <div className="flex items-center space-x-4">
                <img src={kmrllogo} alt="KMRL Logo" className="h-11 object-contain" />
                <img src={azadilogo} alt="Azadi Ka Amrit Mahotsav Logo" className="h-11 object-contain" />
            </div>

            {/* Center Section: Search Bar */}

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