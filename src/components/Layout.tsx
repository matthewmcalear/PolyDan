import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm" role="navigation" aria-label="Primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                PolyDan
              </Link>
              {/* Desktop links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
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

            {/* Mobile hamburger */}
            <div className="flex sm:hidden">
              <button
                type="button"
                aria-label="Toggle navigation menu"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="sm:hidden px-2 pt-2 pb-3 space-y-1" aria-label="Mobile">
            {[
              { to: '/', label: 'Home' },
              { to: '/leaderboard', label: 'Leaderboard' },
              { to: '/side-bets', label: 'Side Bets' },
              { to: '/rules', label: 'Rules' },
              { to: '/faq', label: 'FAQ' },
              ...(user ? [{ to: '/bets', label: 'Bets' }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Admin</Link>
                <Link to="/admin/users" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Users</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* User bar (desktop) */}
      <div className="sm:flex hidden justify-end bg-white shadow-sm pr-6 py-2">
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">{user.name} ({user.points} points)</span>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}; 