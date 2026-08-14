import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setShowMoreSheet(false);
  };

  // Determine active tab
  const getActiveTab = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/bets') return 'bets';
    if (location.pathname === '/leaderboard') return 'leaderboard';
    return 'more';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Compact mobile top bar */}
      <nav className="md:hidden bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            PolyDan
          </Link>
          {user && (
            <div className="text-sm font-semibold text-gray-700">
              ${user.points}
            </div>
          )}
        </div>
      </nav>

      {/* Desktop top navigation (original design) */}
      <nav className="hidden md:block bg-white shadow-sm" role="navigation" aria-label="Primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                PolyDan
              </Link>
              {/* Desktop links */}
              <div className="ml-6 flex space-x-8">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/leaderboard', label: 'Leaderboard' },
                  { to: '/side-bets', label: 'Side Bets' },
                  { to: '/rules', label: 'Rules' },
                  { to: '/faq', label: 'FAQ' },
                ].map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`${
                      location.pathname === to
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    {label}
                  </Link>
                ))}
                {user && (
                  <Link
                    to="/bets"
                    className={`${
                      location.pathname === '/bets'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Bets
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin"
                      className={`${
                        location.pathname === '/admin'
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Admin
                    </Link>
                    <Link
                      to="/admin/users"
                      className={`${
                        location.pathname === '/admin/users'
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Users
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop user bar */}
        <div className="flex justify-end bg-white shadow-sm pr-6 py-2">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.name} (${user.points})</span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Sign In</Link>
              <Link to="/register" className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Sign Up</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main content with bottom padding for mobile tab bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-4 px-4 sm:px-6 lg:px-8 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 ${
              activeTab === 'home' ? 'text-indigo-600' : 'text-gray-500'
            }`}
            aria-label="Home"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium">Home</span>
          </Link>

          {user ? (
            <Link
              to="/bets"
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 ${
                activeTab === 'bets' ? 'text-indigo-600' : 'text-gray-500'
              }`}
              aria-label="Place Bets"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Bets</span>
            </Link>
          ) : (
            <Link
              to="/register"
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 ${
                activeTab === 'bets' ? 'text-indigo-600' : 'text-gray-500'
              }`}
              aria-label="Join"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Join</span>
            </Link>
          )}

          <Link
            to="/leaderboard"
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 ${
              activeTab === 'leaderboard' ? 'text-indigo-600' : 'text-gray-500'
            }`}
            aria-label="Leaderboard"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Leaders</span>
          </Link>

          <button
            onClick={() => setShowMoreSheet(!showMoreSheet)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-2 ${
              activeTab === 'more' || showMoreSheet ? 'text-indigo-600' : 'text-gray-500'
            }`}
            aria-label="More options"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {showMoreSheet && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setShowMoreSheet(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-40 animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="p-4">
              {/* User info if logged in */}
              {user && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                        <span className="text-lg font-medium text-indigo-600">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">${user.points} fake dollars</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu items */}
              <div className="space-y-1">
                {[
                  { to: '/side-bets', label: 'Side Bets', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                  { to: '/rules', label: 'Rules', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { to: '/faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { to: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                ].map(({ to, label, icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setShowMoreSheet(false)}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg hover:bg-gray-50 transition"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                    <span className="font-medium text-gray-900">{label}</span>
                  </Link>
                ))}
                
                {user?.role === 'admin' && (
                  <>
                    <div className="border-t border-gray-200 my-2" />
                    <Link
                      to="/admin"
                      onClick={() => setShowMoreSheet(false)}
                      className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg hover:bg-gray-50 transition"
                    >
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium text-gray-900">Admin</span>
                    </Link>
                    <Link
                      to="/admin/users"
                      onClick={() => setShowMoreSheet(false)}
                      className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg hover:bg-gray-50 transition"
                    >
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="font-medium text-gray-900">User Admin</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Auth buttons */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="w-full flex justify-center items-center px-4 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
                  >
                    Sign Out
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setShowMoreSheet(false)}
                      className="block w-full text-center px-4 py-3 min-h-[44px] rounded-lg border border-indigo-600 text-indigo-600 font-medium hover:bg-indigo-50 transition"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setShowMoreSheet(false)}
                      className="block w-full text-center px-4 py-3 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
