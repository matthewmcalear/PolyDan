import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Welcome to PolyDan
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Place your bets on the Iron Man tournament and compete with family
              and friends!
            </p>
          </div>
          <div className="mt-5">
            {user ? (
              <Link
                to="/bets"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                View Active Bets
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Join Now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Current Standings
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Tournament standings will be displayed here.</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Active Side Bets
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Current side bets will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 